// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MidiaBlock } from "@/components/agenda/sheet/midia-block";

afterEach(() => cleanup());

const midiasResp = {
  processos: [
    {
      processoId: 1,
      numeroAutos: "0001",
      files: [{
        driveFileId: "m1", name: "Oitiva João.mp3", mimeType: "audio/mp3",
        lastModifiedTime: new Date("2026-04-01"),
      }],
    },
  ],
  ungrouped: [{
    driveFileId: "m2", name: "Video ocorrencia.mp4", mimeType: "video/mp4",
    lastModifiedTime: new Date("2026-03-28"),
  }],
  stats: { total: 2, transcribed: 1, analyzed: 0 },
};

// Use a mock factory that can be overridden per-test
const mockUseQuery = vi.fn(() => ({ data: midiasResp, isLoading: false }));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      midiasByAssistido: { useQuery: (...args: any[]) => mockUseQuery(...args) },
    },
  },
}));

describe("MidiaBlock", () => {
  it("lista áudio com player", () => {
    mockUseQuery.mockReturnValueOnce({ data: midiasResp, isLoading: false } as any);
    const { container } = render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/oitiva joão/i)).toBeInTheDocument();
    expect(container.querySelector("audio")).toBeTruthy();
  });

  it("mostra vídeo com botão play", () => {
    mockUseQuery.mockReturnValueOnce({ data: midiasResp, isLoading: false } as any);
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/video ocorrencia/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assistir/i })).toBeInTheDocument();
  });

  it("inclui áudios de atendimentos", () => {
    mockUseQuery.mockReturnValueOnce({ data: midiasResp, isLoading: false } as any);
    const atd = [{
      id: 99, data: new Date("2026-03-25"),
      audioDriveFileId: "atd99", transcricaoResumo: "Resumo teste",
    }];
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={atd} />);
    expect(screen.getByText(/atendimento/i)).toBeInTheDocument();
  });

  it("empty state quando sem mídia", () => {
    mockUseQuery.mockReturnValueOnce({
      data: { processos: [], ungrouped: [], stats: { total: 0, transcribed: 0, analyzed: 0 } },
      isLoading: false,
    } as any);
    render(<MidiaBlock assistidoId={1} atendimentosComAudio={[]} />);
    expect(screen.getByText(/nenhuma mídia/i)).toBeInTheDocument();
  });
});
