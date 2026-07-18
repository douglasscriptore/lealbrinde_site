import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leal Brinde",
    short_name: "Leal Brinde",
    description: "Brindes personalizados e DTF têxtil por metro.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007da8",
    icons: [{ src: "/images/leal-brinde-logo.png", sizes: "300x158", type: "image/png" }],
  };
}
