import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const sans = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

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
  keywords: ["Ayurveda", "dosha", "wellness", "दिनचर्या", "आयुर्वेद"],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sthamly",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Sthamly",
    url: "https://sthamly.com",
    title: "Sthamly",
    description: "आपकी प्रकृति के हिसाब से दिनचर्या, खान-पान और संतुलन।",
    locale: "hi_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f5d50",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi" className={sans.variable}>
      {/* font-sans is intentionally not set here: globals.css uses var(--font-sans) for body. */}
      <body className="min-h-screen bg-sand text-neutral-900 antialiased">
        <a href="#main" className="skip-link">
          मुख्य सामग्री पर जाएँ
        </a>
        <div id="main">{children}</div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}