import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Tipografia: Sistema Híbrido Suíço/Jurídico
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OMBUDS | Gestão para Defesa Criminal",
    template: "%s | OMBUDS"
  },
  description: "Sistema de gestão jurídica criminal de alta performance. Gerencie processos, prazos, casos e demandas com eficiência profissional para a defensoria pública.",
  keywords: ["gestão jurídica", "defesa criminal", "defensoria pública", "processos criminais", "prazos processuais", "gestão de casos", "tribunal do júri"],
  authors: [{ name: "OMBUDS" }],
  creator: "OMBUDS",
  publisher: "OMBUDS",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "OMBUDS | Gestão para Defesa Criminal",
    description: "Sistema de gestão jurídica criminal de alta performance",
    siteName: "OMBUDS",
    images: [
      {
        url: "/logo-full.png",
        width: 512,
        height: 512,
        alt: "OMBUDS - Gestão para Defesa Criminal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMBUDS | Gestão para Defesa Criminal",
    description: "Sistema de gestão jurídica criminal de alta performance",
    images: ["/logo-full.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var fontSize = localStorage.getItem('ombuds-font-size');
      document.documentElement.classList.remove('light', 'medium', 'dark');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.add('medium');
      }
      if (fontSize === 'large') {
        document.documentElement.classList.add('font-large');
      }
    } catch (e) {}
  })();
`;

// Forces the Service Worker to check for updates on every page load and
// triggers a one-time reload the moment a new SW takes control. Without
// this, some Chromium-based browsers (notably Comet) hold on to the
// previous SW script indefinitely and keep serving stale cached API
// responses, making list pages look permanently empty. The guard variable
// prevents an infinite reload loop.
// Em dev (Serwist desabilitado no next.config.js), qualquer SW remanescente
// de build antigo só serve bundles cached e impede hot reload. Cleanup
// agressivo: desregistra TODOS os SWs e limpa todos os caches; recarrega 1x
// se algo foi removido. Em prod o setup volta ao normal pelo build do Serwist.
const swUpdateScript = `
  (function() {
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        if (!regs || regs.length === 0) return;
        Promise.all(regs.map(function(reg) {
          return reg.unregister().catch(function() { return false; });
        })).then(function(results) {
          var hadAny = results.some(function(r) { return r === true; });
          var clearCaches = (typeof caches !== 'undefined' && caches.keys)
            ? caches.keys().then(function(keys) {
                return Promise.all(keys.map(function(k) { return caches.delete(k); }));
              }).catch(function() {})
            : Promise.resolve();
          clearCaches.then(function() {
            if (hadAny && !sessionStorage.getItem('__sw_cleanup_done')) {
              sessionStorage.setItem('__sw_cleanup_done', '1');
              window.location.reload();
            }
          });
        });
      }).catch(function() {});
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swUpdateScript }} />
      </head>
      <body className={`${inter.className} ${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} bg-white dark:bg-neutral-950`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
