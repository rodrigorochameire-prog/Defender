import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-zinc-500">Última atualização: 10 de março de 2026</p>

      <h2>1. Introdução</h2>
      <p>
        O OMBUDS é um sistema pessoal de gestão para defesa criminal, criado e mantido por um
        defensor público para auxiliar no seu trabalho e de sua equipe. O sistema é utilizado de
        forma voluntária por defensores públicos e colaboradores da mesma comarca. Não se trata de
        um sistema institucional da Defensoria Pública.
      </p>

      <h2>2. Dados coletados</h2>
      <p>O sistema coleta e processa os seguintes dados:</p>
      <ul>
        <li><strong>Dados de autenticação:</strong> nome, e-mail e foto de perfil, obtidos via login com conta Google.</li>
        <li><strong>Dados processuais:</strong> informações de processos judiciais, atendimentos e demandas cadastrados pelos usuários no exercício de suas funções.</li>
        <li><strong>Dados de assistidos:</strong> nome, CPF e informações relevantes à defesa criminal, inseridos pelos defensores.</li>
        <li><strong>Dados de uso:</strong> registros de acesso (logs) para fins de segurança.</li>
      </ul>

      <h2>3. Finalidade do tratamento</h2>
      <p>
        Os dados são tratados exclusivamente para auxiliar na prestação de assistência jurídica
        criminal, gestão de processos e organização do trabalho da equipe de defesa, em
        conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
      </p>

      <h2>4. Compartilhamento de dados</h2>
      <p>
        Os dados não são vendidos nem compartilhados com terceiros para fins comerciais.
        São utilizados apenas os seguintes serviços de infraestrutura:
      </p>
      <ul>
        <li>Vercel (hospedagem da aplicação).</li>
        <li>Supabase (banco de dados).</li>
        <li>Google (autenticação e integração com Drive, quando autorizada pelo usuário).</li>
      </ul>

      <h2>5. Armazenamento e segurança</h2>
      <p>
        Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS). O
        acesso ao sistema é restrito a usuários autenticados e convidados pelo administrador.
      </p>

      <h2>6. Direitos do titular</h2>
      <p>
        Os usuários podem solicitar acesso, correção ou exclusão de suas informações pessoais
        entrando em contato com o administrador do sistema.
      </p>

      <h2>7. Contato</h2>
      <p>
        Para dúvidas sobre privacidade ou proteção de dados, entre em contato com o
        administrador do sistema.
      </p>
    </article>
  );
}
