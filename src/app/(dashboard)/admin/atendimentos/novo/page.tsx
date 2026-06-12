import { redirect } from "next/navigation";

// O formulário antigo era um mock (submit simulado). A criação agora acontece
// no modal da página de atendimentos — esta rota só redireciona com o modal aberto.
export default function NovoAtendimentoPage() {
  redirect("/admin/atendimentos?novo=1");
}
