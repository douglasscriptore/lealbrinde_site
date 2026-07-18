import type { Metadata } from "next";
import { WristbandsPrelaunch } from "@/components/marketing/wristbands-prelaunch";

export const metadata: Metadata = {
  title: "Pulseiras e cordões",
  robots: { index: false, follow: false },
};

export default function WristbandsPage() {
  return <WristbandsPrelaunch />;
}
