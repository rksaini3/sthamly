import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Sthamly: आयुर्वेद दिनचर्या",
    short_name: "Sthamly",
    description:
      "आपकी प्रकृति के हिसाब से दिनचर्या, खान-पान और संतुलन। General wellness जानकारी, medical सलाह नहीं।",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fceedf",
    theme_color: "#2f5d50",
    lang: "hi",
    dir: "ltr",
    categories: ["health", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}