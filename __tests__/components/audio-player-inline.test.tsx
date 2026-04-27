// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AudioPlayerInline } from "@/components/agenda/sheet/audio-player-inline";

afterEach(() => cleanup());

describe("AudioPlayerInline", () => {
  it("renderiza elemento audio com src correto", () => {
    const { container } = render(
      <AudioPlayerInline driveFileId="audio123" title="Oitiva João" />
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).toBeTruthy();
    expect(audio.src).toContain("audio123");
  });

  it("mostra título", () => {
    render(<AudioPlayerInline driveFileId="x" title="Oitiva Maria" />);
    expect(screen.getByText("Oitiva Maria")).toBeInTheDocument();
  });

  it("atributo controls presente", () => {
    const { container } = render(<AudioPlayerInline driveFileId="x" title="t" />);
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio.controls).toBe(true);
  });
});
