import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Fonte principal - Inter: limpa, moderna, excelente legibilidade
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Fonte serifada - Source Serif 4: elegante, profissional, ideal para títulos jurídicos
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

// Fonte monospace - JetBrains Mono: legível, moderna, para códigos de processo
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Intelex - Sistema de Inteligência Jurídica",
  description: "Sistema institucional de gestão estratégica para Defensoria Pública - Inteligência aplicada à Lei",
  applicationName: "Intelex",
  keywords: ["defensoria pública", "gestão jurídica", "inteligência jurídica", "processos", "prazos"],
  manifest: "/manifest.json",
  themeColor: "#1e5945",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Intelex",
  },
};

// Script to prevent flash of wrong theme and font size - default to light
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var fontSize = localStorage.getItem('defesahub-font-size');
      
      // Only apply dark mode if explicitly set
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Apply font size mode
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
      <body className={`${inter.className} ${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
