import type { ImageProps } from "next/image";

export type MarketingImage = {
  src: ImageProps["src"];
  alt: string;
  sizes?: string;
  priority?: boolean;
};

export type MarketingAction = {
  label: string;
  href: string;
  external?: boolean;
};

export type NavigationItem = {
  label: string;
  href: string;
};

export type Sector = {
  name: string;
  description: string;
  href: string;
  actionLabel: string;
  image?: MarketingImage;
  status?: string;
};

export type ProcessStep = {
  title: string;
  description: string;
  icon: "calculate" | "upload" | "pix" | "review" | "production" | "delivery";
};

export type EquipmentCapacity = {
  quantity: number;
  name: string;
  metersPerHour: number;
};

export type FrequentlyAskedQuestion = {
  question: string;
  answer: string;
};

export type PriceTier = {
  id: string;
  minimumMeters: number;
  maximumMeters: number | null;
  unitPriceCents: number;
  label?: string;
};

export type ProductSpecification = {
  group: string;
  title: string;
  description: string;
  position: number;
  visible: boolean;
};

export type FooterColumn = {
  title: string;
  links: NavigationItem[];
};
