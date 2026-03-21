// Rotas públicas sem redirecionamento por sessão
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
