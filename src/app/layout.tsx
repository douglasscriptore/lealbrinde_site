import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppMotionProvider } from "@/components/motion";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Leal Brinde | Brindes e DTF por metro",
    template: "%s | Leal Brinde",
  },
  description:
    "Brindes personalizados e DTF têxtil por metro com produção própria, revisão de arquivo e acompanhamento do pedido.",
  applicationName: "Leal Brinde",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Leal Brinde",
    images: ["/images/dtf-hero-campaign.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/dtf-hero-campaign.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" data-theme="light">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a
          href="#conteudo"
          className="sr-only fixed left-4 top-4 z-50 rounded-full bg-accent px-5 py-3 font-semibold text-accent-foreground shadow-premium focus:not-sr-only"
        >
          Ir para o conteúdo
        </a>
        <AppMotionProvider>{children}</AppMotionProvider>
      </body>
    </html>
  );
}
