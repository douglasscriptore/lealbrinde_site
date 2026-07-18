export type MarketplaceStore = {
  name: "Shopee";
  url: string;
  rating: "4,9";
  salesLabel: "+4 mil vendas";
  verifiedAt: "2026-07";
};

export const shopeeStore: MarketplaceStore = {
  name: "Shopee",
  url:
    process.env.NEXT_PUBLIC_SHOPEE_STORE_URL ??
    process.env.NEXT_PUBLIC_GIFTS_DESTINATION_URL ??
    "https://shopee.com.br/lealbrinde#product_list",
  rating: "4,9",
  salesLabel: "+4 mil vendas",
  verifiedAt: "2026-07",
};
