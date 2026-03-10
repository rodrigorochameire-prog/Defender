import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            OMBUDS
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/privacidade" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Termos
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        OMBUDS — Gestão para Defesa Criminal
      </footer>
    </div>
  );
}
