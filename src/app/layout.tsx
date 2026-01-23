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
    default: "INTELEX | Defesa Inteligente",
    template: "%s | INTELEX"
  },
  description: "Sistema de gestão jurídica criminal de alta performance com inteligência artificial. Gerencie processos, prazos, casos e demandas com eficiência profissional.",
  keywords: ["gestão jurídica", "advocacia criminal", "defesa inteligente", "processos criminais", "prazos processuais", "gestão de casos"],
  authors: [{ name: "INTELEX" }],
  creator: "INTELEX",
  publisher: "INTELEX",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-shield.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/logo-shield.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "INTELEX | Defesa Inteligente",
    description: "Sistema de gestão jurídica criminal de alta performance",
    siteName: "INTELEX",
    images: [
      {
        url: "/logo-full.png",
        width: 1200,
        height: 630,
        alt: "INTELEX - Defesa Inteligente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "INTELEX | Defesa Inteligente",
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
      var fontSize = localStorage.getItem('defesahub-font-size');
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
