// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VincularAudioPopover } from "@/components/agenda/sheet/vincular-audio-popover";

afterEach(() => cleanup());

const midiasResp = {
  processos: [
    { processoId: 1, numeroAutos: "0001", files: [
      { driveFileId: "a1", name: "Oitiva João.mp3", mimeType: "audio/mp3" },
    ]},
  ],
  ungrouped: [
    { driveFileId: "a2", name: "Depoimento Maria.mp3", mimeType: "audio/mp3" },
    { driveFileId: "v1", name: "Vídeo ocorrência.mp4", mimeType: "video/mp4" },
  ],
  stats: { total: 3, transcribed: 0, analyzed: 0 },
};

const mutateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      midiasByAssistido: { useQuery: vi.fn(() => ({ data: midiasResp, isLoading: false })) },
    },
    audiencias: {
      vincularAudioDepoente: { useMutation: vi.fn(() => ({ mutate: mutateMock, isPending: false })) },
    },
    useUtils: () => ({ audiencias: { getAudienciaContext: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("VincularAudioPopover", () => {
  beforeEach(() => { mutateMock.mockClear(); });

  it("lista apenas áudios (vídeo fica de fora)", () => {
    render(<VincularAudioPopover depoenteId={1} currentAudioId={null} assistidoId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /vincular áudio/i }));
    expect(screen.getByText(/oitiva joão/i)).toBeInTheDocument();
    expect(screen.getByText(/depoimento maria/i)).toBeInTheDocument();
    expect(screen.queryByText(/vídeo ocorrência/i)).toBeNull();
  });

  it("click num áudio dispara mutation com driveFileId", () => {
    render(<VincularAudioPopover depoenteId={7} currentAudioId={null} assistidoId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /vincular áudio/i }));
    fireEvent.click(screen.getByText(/oitiva joão/i));
    expect(mutateMock).toHaveBeenCalledWith(
      { depoenteId: 7, audioDriveFileId: "a1" }
    );
  });

  it("mostra opção Nenhum (desvincular) quando currentAudioId existe", () => {
    render(<VincularAudioPopover depoenteId={1} currentAudioId="a1" assistidoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/nenhum|desvincular/i)).toBeInTheDocument();
  });

  it("click em Nenhum dispara mutation com null", () => {
    render(<VincularAudioPopover depoenteId={7} currentAudioId="a1" assistidoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText(/nenhum|desvincular/i));
    expect(mutateMock).toHaveBeenCalledWith(
      { depoenteId: 7, audioDriveFileId: null }
    );
  });
});
