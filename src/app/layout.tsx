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
      { url: "/logo-light.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/logo-light.png", sizes: "180x180", type: "image/png" },
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
        url: "/logo-light.png",
        width: 1200,
        height: 630,
        alt: "OMBUDS - Gestão para Defesa Criminal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMBUDS | Gestão para Defesa Criminal",
    description: "Sistema de gestão jurídica criminal de alta performance",
    images: ["/logo-light.png"],
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
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      if (fontSize === 'large') {
        document.documentElement.classList.add('font-large');
      }
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
      </head>
      <body className={`${inter.className} ${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} bg-stone-50 dark:bg-zinc-950`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
