import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "DefensorHub - Sistema de Gestão Jurídica",
  description: "Sistema de gestão de processos, prazos e demandas para Defensoria Pública",
};

// Script to prevent flash of wrong theme - default to light
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      
      // Only apply dark mode if explicitly set
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
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
      <body className={`${interTight.className} ${interTight.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
