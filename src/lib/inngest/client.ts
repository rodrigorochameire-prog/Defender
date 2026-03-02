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
      triggerSource?: "webhook" | "manual" | "lifecycle";
    };
  };

  "drive/sync.all": {
    data: {
      userId?: number;
    };
  };

  "drive/create.folder": {
    data: {
      assistidoId: number;
      nome: string;
      atribuicao: string;
    };
  };

  "drive/move.folder": {
    data: {
      assistidoId: number;
      folderId: string;
      oldAtribuicao: string;
      newAtribuicao: string;
    };
  };

  "drive/auto-link-and-enrich": {
    data: {
      folderId: string;
      newFileIds: number[];
    };
  };

  "drive/incremental-sync": {
    data: {
      folderId: string;
      channelId?: string;
      triggerSource?: string; // "webhook" | "cron" | "manual"
    };
  };
  "drive/renew-channels": {
    data: {
      triggerSource?: string;
    };
  };
  "drive/health-check": {
    data: {
      triggerSource?: string;
    };
  };

  // PDF Enrichment Pipeline
  "pdf/extract-and-classify": {
    data: {
      driveFileId: number; // ID in drive_files table
      driveGoogleId: string; // Google Drive file ID
    };
  };

  // Prazos
  "prazos/check": {
    data: {
      userId?: number;
    };
  };

  // Intelligence — Sistema Nervoso Defensivo
  "intelligence/enrich.document": {
    data: {
      documentoId: number;
      assistidoId?: number;
      processoId?: number;
    };
  };

  "intelligence/consolidate": {
    data: {
      assistidoId?: number;
      processoId?: number;
      userId: string;
    };
  };

  // PDF bookmark insertion (triggered after classification)
  "pdf/insert-bookmarks": {
    data: {
      driveFileId: number;
      driveGoogleId: string;
    };
  };

  // Section ficha generation (triggered after approval)
  "section/generate-ficha": {
    data: {
      sectionId: number;
      tipo: string;
    };
  };

  // Transcription (async via Inngest to avoid Vercel timeout)
  "drive/transcribe.file": {
    data: {
      driveFileId: string;
      processoId?: number;
      assistidoId?: number;
      diarize: boolean;
      expectedSpeakers?: number;
      language: string;
      userId: number;
    };
  };
};
