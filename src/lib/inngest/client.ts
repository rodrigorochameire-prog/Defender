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
  id: "tetecare",
  name: "TeteCare Hub",
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
      petId?: number;
      tutorId?: number;
    };
  };
  
  // Email
  "email/send": {
    data: {
      to: string;
      subject: string;
      body: string;
      template?: string;
      templateData?: Record<string, unknown>;
    };
  };
  
  // Check-in/Check-out notifications
  "checkin/completed": {
    data: {
      petId: number;
      petName: string;
      tutorId: number;
      tutorPhone?: string;
      timestamp: string;
    };
  };
  
  "checkout/completed": {
    data: {
      petId: number;
      petName: string;
      tutorId: number;
      tutorPhone?: string;
      creditsRemaining: number;
      timestamp: string;
    };
  };
  
  // Alertas
  "alert/low.credits": {
    data: {
      petId: number;
      petName: string;
      tutorId: number;
      tutorPhone?: string;
      creditsRemaining: number;
    };
  };
  
  "alert/vaccine.due": {
    data: {
      petId: number;
      petName: string;
      tutorId: number;
      tutorPhone?: string;
      vaccineName: string;
      dueDate: string;
    };
  };
  
  "alert/low.stock": {
    data: {
      petId: number;
      petName: string;
      tutorId: number;
      tutorPhone?: string;
      daysRemaining: number;
    };
  };
  
  // IA Jobs
  "ai/generate.weekly.report": {
    data: {
      petId: number;
      tutorId: number;
      startDate: string;
      endDate: string;
    };
  };
  
  "ai/analyze.behavior": {
    data: {
      petId: number;
      daysToAnalyze: number;
    };
  };
  
  "ai/optimize.rooms": {
    data: {
      date: string;
      roomIds?: number[];
    };
  };
};
