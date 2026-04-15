import { redirect } from "next/navigation";

/**
 * Pareceres foi migrado para Cowork → Encaminhamentos (tipo = Parecer).
 * A tabela `pareceres` permanece em modo somente-leitura por 60 dias após o
 * deploy desta página, antes do drop. Em 15/04/2026 havia 0 registros nela.
 */
export default function PareceresRedirectPage() {
  redirect("/admin/cowork?tab=encaminhamentos&tipo=parecer");
}
