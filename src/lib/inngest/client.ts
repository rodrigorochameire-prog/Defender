/**
 * Inngest Client - Arquitetura de Mensageria
 * 
 * Gerencia filas de tarefas assíncronas como:
 * - Envio de WhatsApp
 * - Envio de Emails
 * - Processamento de relatórios
 * - Jobs de IA
 * 
 * Suporta retentativas automáticas se a API falhar.
 */

import { Inngest } from "inngest";

// Criar cliente Inngest
export const inngest = new Inngest({
  id: "defesahub",
  name: "DefesaHub",
});

// Tipos de eventos disponíveis
export type InngestEvents = {
  // WhatsApp
  "whatsapp/send.message": {
    data: {
      to: string;
      message: string;
      templateName?: string;
      templateParams?: Record<string, string>;
    };
  };

  // Notificações jurídicas
  "prazo/vencimento": {
    data: {
      assistidoNome: string;
      assistidoTelefone?: string;
      processoNumero: string;
      prazoData: string;
      ato: string;
    };
  };

  "audiencia/agendada": {
    data: {
      assistidoNome: string;
      assistidoTelefone?: string;
      processoNumero: string;
      dataAudiencia: string;
      local?: string;
      tipo: string;
    };
  };

  "juri/agendado": {
    data: {
      assistidoNome: string;
      assistidoTelefone?: string;
      processoNumero: string;
      dataSessao: string;
      sala?: string;
    };
  };

  "movimentacao/nova": {
    data: {
      assistidoNome: string;
      assistidoTelefone?: string;
      processoNumero: string;
      descricao: string;
      dataMovimentacao: string;
    };
  };

  "reminder/send": {
    data: {
      phone: string;
      title: string;
      message: string;
    };
  };

  // Google Drive
  "drive/sync.folder": {
    data: {
      folderId: string;
      userId?: number;
    };
  };

  "drive/sync.all": {
    data: {
      userId?: number;
    };
  };

  // Prazos
  "prazos/check": {
    data: {
      userId?: number;
    };
  };
};
