import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Serviço",
};

export default function TermosPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Termos de Serviço</h1>
      <p className="text-sm text-neutral-500">Última atualização: 10 de março de 2026</p>

      <h2>1. Aceitação dos termos</h2>
      <p>
        Ao acessar e utilizar o OMBUDS, você concorda com estes Termos de Serviço. O uso do
        sistema é restrito a usuários convidados pelo administrador.
      </p>

      <h2>2. Descrição do serviço</h2>
      <p>
        O OMBUDS é uma ferramenta pessoal de gestão para defesa criminal, desenvolvida por um
        defensor público para uso próprio e de colegas. Oferece funcionalidades de gerenciamento
        de processos, atendimentos, demandas, prazos, audiências e documentos jurídicos. Não é um
        produto institucional da Defensoria Pública.
      </p>

      <h2>3. Elegibilidade</h2>
      <p>
        O acesso é exclusivo para defensores públicos, estagiários e colaboradores convidados
        pelo administrador do sistema, mediante autenticação com conta Google.
      </p>

      <h2>4. Responsabilidades do usuário</h2>
      <ul>
        <li>Manter a confidencialidade de suas credenciais de acesso.</li>
        <li>Utilizar o sistema para fins relacionados ao trabalho de defesa criminal.</li>
        <li>Garantir a veracidade dos dados inseridos.</li>
        <li>Não compartilhar informações de assistidos ou processos fora do âmbito profissional.</li>
      </ul>

      <h2>5. Disponibilidade</h2>
      <p>
        O sistema é fornecido gratuitamente e &ldquo;como está&rdquo;, sem garantias de disponibilidade
        ininterrupta. Por se tratar de um projeto pessoal, manutenções e atualizações podem
        ocorrer sem aviso prévio.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        O desenvolvedor do OMBUDS não se responsabiliza por perdas decorrentes de
        indisponibilidade do sistema, erros de dados inseridos por usuários ou uso indevido
        da plataforma.
      </p>

      <h2>7. Alterações nos termos</h2>
      <p>
        Estes termos podem ser atualizados a qualquer momento. Alterações significativas serão
        comunicadas aos usuários pelo sistema.
      </p>

      <h2>8. Contato</h2>
      <p>
        Para dúvidas sobre estes termos, entre em contato com o administrador do sistema.
      </p>
    </article>
  );
}
