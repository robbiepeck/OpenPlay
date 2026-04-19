import mGBA, { type mGBAEmulator } from "@thenick775/mgba-wasm";
import { useEffect, useRef, useState } from "react";
import { brisbaneTownMappings } from "./brisbaneMappings";

const LOCAL_ROM_PATH = "/local-roms/pokemon-fire-red-brisbane.gba";
const LOCAL_ROM_FILE_NAME = "pokemon-fire-red-brisbane.gba";

const keyboardShortcuts = [
  { action: "Move", shortcut: "Arrow keys" },
  { action: "A", shortcut: "Z" },
  { action: "B", shortcut: "X" },
  { action: "Start", shortcut: "Enter" },
  { action: "Select", shortcut: "Shift" },
];

type LoadState = "booting" | "loading" | "ready" | "error";

type TouchControlProps = {
  label: string;
  inputName: string;
  emulator: mGBAEmulator | null;
  variant?: "primary" | "secondary" | "utility";
  className?: string;
};

function uploadRom(emulator: mGBAEmulator, file: File) {
  return new Promise<void>((resolve) => {
    emulator.uploadRom(file, resolve);
  });
}

async function loadBundledRom(emulator: mGBAEmulator) {
  const response = await fetch(`${LOCAL_ROM_PATH}?v=20260419`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      "The local Brisbane ROM is missing. Run `npm run build:brisbane-rom -- --input <path-to-fire-red.zip>` to generate it.",
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const romFile = new File([bytes], LOCAL_ROM_FILE_NAME, {
    type: "application/octet-stream",
  });

  await uploadRom(emulator, romFile);

  if (!emulator.loadGame(`/data/games/${LOCAL_ROM_FILE_NAME}`)) {
    throw new Error("mGBA could not boot the Brisbane ROM build.");
  }
}

async function armAudio(emulator: mGBAEmulator | null) {
  if (!emulator) {
    return;
  }

  try {
    emulator.resumeAudio();
  } catch {
    // Browser autoplay policies can still ignore this until the next gesture.
  }
}

function TouchControl({
  label,
  inputName,
  emulator,
  variant = "secondary",
  className,
}: TouchControlProps) {
  const release = () => {
    emulator?.buttonUnpress(inputName);
  };

  const press = async (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    await armAudio(emulator);
    emulator?.buttonPress(inputName);
  };

  return (
    <button
      className={`touch-button ${variant} ${className ?? ""}`.trim()}
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={release}
      onPointerDown={press}
      onPointerLeave={release}
      onPointerUp={release}
      type="button"
    >
      {label}
    </button>
  );
}

export function PokemonBrisbaneGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const emulatorRef = useRef<mGBAEmulator | null>(null);
  const didInitRef = useRef(false);
  const [emulator, setEmulator] = useState<mGBAEmulator | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("booting");
  const [statusCopy, setStatusCopy] = useState("Booting the Brisbane cabinet...");
  const [isPaused, setIsPaused] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || didInitRef.current) {
      return;
    }

    didInitRef.current = true;
    let cancelled = false;

    const initialize = async () => {
      try {
        const module = await mGBA({ canvas });
        if (cancelled) {
          return;
        }

        emulatorRef.current = module;
        setEmulator(module);

        await module.FSInit();
        module.addCoreCallbacks({
          saveDataUpdatedCallback: () => {
            void module.FSSync().catch(() => {});
          },
        });
        module.setCoreSettings({
          audioSync: true,
          autoSaveStateEnable: true,
          restoreAutoSaveStateOnLoad: true,
          rewindEnable: false,
          videoSync: true,
        });

        setLoadState("loading");
        setStatusCopy("Loading the locally generated Brisbane ROM...");
        await loadBundledRom(module);
        await armAudio(module);

        if (cancelled) {
          return;
        }

        setLoadState("ready");
        setStatusCopy("Brisbane Edition is live. Saves persist in this browser.");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadState("error");
        setStatusCopy(
          error instanceof Error
            ? error.message
            : "The Brisbane cabinet could not be started.",
        );
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      const instance = emulatorRef.current;
      if (!instance) {
        return;
      }

      try {
        instance.pauseGame();
      } catch {
        // Best effort cleanup for hot reload / navigation.
      }
      void instance.FSSync().catch(() => {});
      emulatorRef.current = null;
    };
  }, []);

  const togglePause = async () => {
    if (!emulator) {
      return;
    }

    if (isPaused) {
      emulator.resumeGame();
      await armAudio(emulator);
      setStatusCopy("Back on the road through Brisbane.");
    } else {
      emulator.pauseGame();
      setStatusCopy("Adventure paused.");
    }

    setIsPaused((current) => !current);
  };

  const toggleTurbo = () => {
    if (!emulator) {
      return;
    }

    const nextTurbo = !isTurbo;
    emulator.setFastForwardMultiplier(nextTurbo ? 3 : 1);
    setIsTurbo(nextTurbo);
    setStatusCopy(
      nextTurbo ? "Turbo mode engaged at 3x speed." : "Returned to normal speed.",
    );
  };

  const restartRun = async () => {
    if (!emulator) {
      return;
    }

    emulator.quickReload();
    emulator.setFastForwardMultiplier(1);
    setIsTurbo(false);
    setIsPaused(false);
    await armAudio(emulator);
    setStatusCopy("Reloaded the Brisbane cartridge.");
  };

  return (
    <div className="pokemon-brisbane-layout">
      <div className="pokemon-brisbane-stage">
        <div className="pokemon-stage-status">
          <div className={`pokemon-status-pill ${loadState}`}>
            {loadState === "booting" && "Booting"}
            {loadState === "loading" && "Loading"}
            {loadState === "ready" && "Ready"}
            {loadState === "error" && "Error"}
          </div>
          <p>{statusCopy}</p>
        </div>

        <div className="pokemon-canvas-shell">
          <div className="pokemon-canvas-bezel">
            <canvas
              className="pokemon-screen"
              height={160}
              onPointerDown={() => {
                void armAudio(emulator);
              }}
              ref={canvasRef}
              width={240}
            />
            {loadState !== "ready" ? (
              <div className="pokemon-screen-overlay">
                <strong>OpenPlay Brisbane Cabinet</strong>
                <span>{statusCopy}</span>
              </div>
            ) : null}
          </div>

          <div className="pokemon-toolbar">
            <button
              className="button-secondary"
              disabled={!emulator || loadState !== "ready"}
              onClick={() => {
                void togglePause();
              }}
              type="button"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              className="button-secondary"
              disabled={!emulator || loadState !== "ready"}
              onClick={toggleTurbo}
              type="button"
            >
              {isTurbo ? "Turbo off" : "Turbo x3"}
            </button>
            <button
              className="button-primary"
              disabled={!emulator || loadState !== "ready"}
              onClick={() => {
                void restartRun();
              }}
              type="button"
            >
              Restart run
            </button>
          </div>

          <p className="pokemon-stage-note">
            This page auto-loads the local ROM generated into
            <code> public/local-roms/</code> and keeps save data in your browser.
          </p>
        </div>
      </div>

      <div className="pokemon-support-grid">
        <section className="pokemon-panel">
          <p className="instruction-label">Brisbane map</p>
          <div className="suburb-grid">
            {brisbaneTownMappings.map((mapping) => (
              <article className="suburb-card" key={mapping.original}>
                <span>{mapping.original}</span>
                <strong>{mapping.brisbane}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="pokemon-panel">
          <p className="instruction-label">Controls</p>
          <div className="pokemon-controls-grid">
            <div className="dpad-cluster">
              <TouchControl
                className="up"
                emulator={emulator}
                inputName="Up"
                label="Up"
              />
              <TouchControl
                className="left"
                emulator={emulator}
                inputName="Left"
                label="Left"
              />
              <TouchControl
                className="right"
                emulator={emulator}
                inputName="Right"
                label="Right"
              />
              <TouchControl
                className="down"
                emulator={emulator}
                inputName="Down"
                label="Down"
              />
            </div>

            <div className="action-cluster">
              <TouchControl
                emulator={emulator}
                inputName="A"
                label="A"
                variant="primary"
              />
              <TouchControl
                emulator={emulator}
                inputName="B"
                label="B"
                variant="secondary"
              />
              <TouchControl
                emulator={emulator}
                inputName="Select"
                label="Select"
                variant="utility"
              />
              <TouchControl
                emulator={emulator}
                inputName="Start"
                label="Start"
                variant="utility"
              />
            </div>
          </div>

          <div className="keyboard-grid">
            {keyboardShortcuts.map((shortcut) => (
              <div className="keyboard-chip" key={shortcut.action}>
                <span>{shortcut.action}</span>
                <strong>{shortcut.shortcut}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      {loadState === "error" ? (
        <div className="status-banner lost">
          <p>{statusCopy}</p>
        </div>
      ) : null}
    </div>
  );
}
