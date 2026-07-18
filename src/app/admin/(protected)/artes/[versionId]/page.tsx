import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

import { ArtworkReviewPanel } from "@/components/operations";
import { requireStaff } from "@/server/auth/session";
import { getAdminArtworkReview } from "@/server/queries/admin-operations";

import { reviewArtworkAction } from "../../actions";

export const metadata: Metadata = { title: "Revisar arte" };

type ArtworkReviewPageProps = {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
};

export default async function ArtworkReviewPage({
  params,
  searchParams,
}: ArtworkReviewPageProps) {
  await requireStaff(["OPERATOR", "ADMIN"]);
  const [{ versionId }, feedback] = await Promise.all([params, searchParams]);
  const review = await getAdminArtworkReview(versionId);
  if (!review) notFound();

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
        href="/admin/artes"
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Voltar à fila de revisão
      </Link>
      <ArtworkReviewPanel
        errorMessage={feedback.erro?.slice(0, 500)}
        review={review.data}
        reviewAction={reviewArtworkAction}
        reviewLockedMessage={review.lockedMessage}
        successMessage={feedback.sucesso?.slice(0, 300)}
      />
    </div>
  );
}
