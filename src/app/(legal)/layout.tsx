import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-foreground"
          >
            OMBUDS
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        OMBUDS — Gestão para Defesa Criminal
      </footer>
    </div>
  );
}
