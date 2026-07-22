import type { Metadata } from "next";
import { FirebaseTotpEnrollment } from "@/components/auth/firebase-totp-enrollment";

export const metadata: Metadata = { title: "Configurar segundo fator", robots: { index: false, follow: false } };

export default function ConfigureSecondFactorPage() {
  return <main className="grid min-h-screen place-items-center bg-surface-strong px-4 py-12"><div className="w-full max-w-lg"><FirebaseTotpEnrollment /></div></main>;
}
