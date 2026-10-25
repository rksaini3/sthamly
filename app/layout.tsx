import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import BackButton from "@/components/BackButton";
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

// Dark mode की पसंद पेज खुलते ही लागू हो, ताकि हल्का रंग एक पल के लिए भी न दिखे।
const themeScript = `
try {
  if (localStorage.getItem('sthamly:theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-[100dvh] bg-canvas text-ink antialiased">
        <a href="#main" className="skip-link">
          मुख्य सामग्री पर जाएँ
        </a>
        <div id="main">{children}</div>
        <BackButton />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}