import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/server/auth/auth";
import {
  ArtworkVersionRepository,
  openDatabase,
  OrderRepository,
  ProductRepository,
} from "@/server/db";
import {
  getStoredArtwork,
  markStoredArtworkClaimed,
} from "@/server/integrations/object-storage";
import { isProductOrderable } from "@/server/product-availability";
import { ensurePixPayment } from "@/server/services/order-payment";

export const runtime = "nodejs";

const addressSchema = z.object({
  postalCode: z.string().trim().regex(/^\D*\d(?:\D*\d){7}\D*$/, "Informe um CEP válido."),
  street: z.string().trim().min(2),
  number: z.string().trim().min(1),
  complement: z.string().trim(),
  neighborhood: z.string().trim().min(1),
  city: z.string().trim().min(2),
  state: z.string().trim().length(2),
});

const orderSchema = z
  .object({
    productId: z.string().trim().min(1),
    priceTableId: z.string().trim().min(1),
    quantityMeters: z.number().int().positive(),
    artworkAssetId: z.uuid(),
    fulfillment: z.object({
      method: z.enum(["PICKUP", "SHIPPING"]),
      address: addressSchema.nullable(),
    }),
    contact: z.object({
      name: z.string().trim().min(3).max(160),
      email: z.email().trim().toLowerCase(),
      phone: z.string().trim().min(8).max(40),
    }),
    fiscal: z.object({
      issueInvoice: z.boolean(),
      personType: z.enum(["PF", "PJ"]).nullable(),
      copyContactData: z.boolean(),
      legalName: z.string().trim().max(200).nullable(),
      document: z.string().trim().max(24).nullable(),
      stateRegistration: z.string().trim().max(40).nullable(),
      email: z.email().trim().toLowerCase().nullable(),
      phone: z.string().trim().max(40).nullable(),
    }),
    acceptedTerms: z.boolean().refine((accepted) => accepted, {
      message: "Aceite os termos para criar o pedido.",
    }),
  })
  .superRefine((value, context) => {
    if (value.fulfillment.method === "SHIPPING" && !value.fulfillment.address) {
      context.addIssue({
        code: "custom",
        path: ["fulfillment", "address"],
        message: "Informe o endereço para entrega.",
      });
    }
    if (
      value.fiscal.issueInvoice &&
      (!value.fiscal.personType || !value.fiscal.legalName || !value.fiscal.document)
    ) {
      context.addIssue({
        code: "custom",
        path: ["fiscal"],
        message: "Preencha os dados obrigatórios da nota fiscal.",
      });
    }
  });

function createOrderCode(orders: OrderRepository) {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    const code = `DTF-${year}-${suffix}`;
    if (!orders.findByCode(code)) return code;
  }
  throw new Error("Não foi possível gerar um código único para o pedido.");
}

function normalizeType(type: string) {
  return type === "TIFF" ? ["TIFF", "TIF"] : [type];
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "O pedido enviado não é um JSON válido." }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revise os dados do pedido." },
      { status: 422 },
    );
  }

  const input = parsed.data;
  if (input.fulfillment.method === "SHIPPING") {
    return NextResponse.json(
      {
        error:
          "A entrega será liberada depois da integração do cálculo final de frete. Selecione retirada no local para continuar nesta homologação.",
      },
      { status: 409 },
    );
  }

  if (
    process.env.NODE_ENV === "production" ||
    (process.env.FILE_SCANNER_MODE ?? "mock-signature") !== "mock-signature"
  ) {
    return NextResponse.json(
      { error: "O verificador de segurança dos arquivos ainda não está configurado." },
      { status: 503 },
    );
  }

  let stored;
  try {
    stored = await getStoredArtwork(input.artworkAssetId);
  } catch {
    return NextResponse.json(
      { error: "O arquivo enviado não foi encontrado. Envie-o novamente." },
      { status: 422 },
    );
  }

  const db = openDatabase();
  let order;

  try {
    const products = new ProductRepository(db);
    const orders = new OrderRepository(db);
    const artworks = new ArtworkVersionRepository(db);
    const aggregate = products.getDtfAggregate(input.productId);

    if (!aggregate || !isProductOrderable(aggregate.product.status)) {
      throw new Error("Este produto não está disponível para novos pedidos.");
    }
    if (!aggregate.product.paymentMethods.includes("PIX")) {
      throw new Error("O produto não está configurado para pagamento via Pix.");
    }

    const quote = products.calculatePrice(input.productId, input.quantityMeters);
    if (quote.priceTableId !== input.priceTableId) {
      throw new Error("A tabela de preços mudou. Atualize a página e confira o novo total.");
    }

    const policy = aggregate.filePolicy;
    if (policy?.confirmed) {
      const accepted = policy.acceptedExtensions.map((extension) =>
        extension.replace(/^\./, "").toUpperCase(),
      );
      if (!normalizeType(stored.detectedType).some((type) => accepted.includes(type))) {
        throw new Error("O formato do arquivo não é permitido para este produto.");
      }
      if (
        policy.maximumFileSizeMb !== null &&
        stored.sizeBytes > policy.maximumFileSizeMb * 1024 * 1024
      ) {
        throw new Error("O arquivo excede o tamanho permitido para este produto.");
      }
    }

    const claimed = db
      .prepare("SELECT order_id FROM artwork_versions WHERE storage_key = ?")
      .get(stored.storageKey) as { order_id?: string } | undefined;

    if (claimed?.order_id) {
      const existing = orders.findById(claimed.order_id);
      if (
        !existing ||
        existing.productId !== input.productId ||
        existing.quantityMeters !== input.quantityMeters ||
        existing.customerEmail.toLowerCase() !== input.contact.email
      ) {
        throw new Error("Este arquivo já está vinculado a outro pedido.");
      }
      order = existing;
    } else {
      const createOrder = db.transaction(() => {
        const created = orders.create(
          {
            code: createOrderCode(orders),
            productId: input.productId,
            customerName: input.contact.name,
            customerEmail: input.contact.email,
            quantityMeters: input.quantityMeters,
            fulfillmentMethod: input.fulfillment.method,
          },
          "anonymous-checkout",
        );

        orders.saveCustomerData(
          created.id,
          {
            contact: input.contact,
            fulfillment: {
              method: input.fulfillment.method,
              shippingAddress: null,
              pickupLocationId: "leal-brinde-principal",
            },
            fiscal: input.fiscal.issueInvoice
              ? {
                  requested: true,
                  partyType: input.fiscal.personType,
                  document: input.fiscal.document,
                  legalName: input.fiscal.legalName,
                  tradeName: null,
                  stateRegistration: input.fiscal.stateRegistration,
                  municipalRegistration: null,
                  email: input.fiscal.email,
                  phone: input.fiscal.phone,
                  address: null,
                }
              : {
                  requested: false,
                  partyType: null,
                  document: null,
                  legalName: null,
                  tradeName: null,
                  stateRegistration: null,
                  municipalRegistration: null,
                  email: null,
                  phone: null,
                  address: null,
                },
          },
          "anonymous-checkout",
        );

        const version = artworks.createVersion(
          {
            orderId: created.id,
            storageKey: stored.storageKey,
            originalFilename: stored.originalName,
            mimeType: stored.mediaType,
            sizeBytes: stored.sizeBytes,
            checksumSha256: stored.checksumSha256,
            uploadedBy: "anonymous-checkout",
            metadata: {
              detectedType: stored.detectedType,
              validationMode: "homologation-signature-only",
            },
          },
          "anonymous-checkout",
        );
        artworks.recordPreflight(
          version.id,
          "PENDING",
          "WARNING",
          {
            validationMode: "homologation-signature-only",
            notice: "Antimalware ainda não integrado. O arquivo permanece sem aprovação de segurança.",
          },
          "mock-file-scanner",
        );
        return orders.findById(created.id) ?? created;
      });

      order = createOrder();
    }
  } catch (error) {
    db.close();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível criar o pedido." },
      { status: 422 },
    );
  }

  try {
    await markStoredArtworkClaimed(input.artworkAssetId);
  } finally {
    db.close();
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (
      session?.user.emailVerified === true &&
      session.user.email.toLowerCase() === input.contact.email
    ) {
      const payment = await ensurePixPayment(order, input.contact.email);
      return NextResponse.json({
        status: "payment_created",
        orderCode: order.code,
        payment,
      });
    }

    await auth.api.signInMagicLink({
      body: {
        email: input.contact.email,
        name: input.contact.name,
        callbackURL: `/dtf/pedido/confirmar?pedido=${encodeURIComponent(order.code)}`,
        errorCallbackURL: `/entrar?erro=link&pedido=${encodeURIComponent(order.code)}`,
      },
      headers: request.headers,
    });

    return NextResponse.json({
      status: "verification_required",
      orderCode: order.code,
      message:
        "Enviamos um link de acesso. Em desenvolvimento, ele aparece no terminal do servidor.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "O pedido foi preservado, mas não foi possível enviar o link de verificação. Tente acessar a área do cliente com o mesmo e-mail.",
      },
      { status: 503 },
    );
  }
}
