import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sthamly.com"),
  title: {
    default: "Sthamly",
    template: "%s · Sthamly",
  },
  description:
    "Sthamly: आपकी प्रकृति के हिसाब से दिनचर्या, खान-पान और संतुलन। General wellness जानकारी, medical सलाह नहीं।",
  applicationName: "Sthamly",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    title: "Sthamly",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5D50",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <body className="min-h-screen bg-sand font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}