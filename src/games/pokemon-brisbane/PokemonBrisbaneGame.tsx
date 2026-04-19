import mGBA, { type mGBAEmulator } from "@thenick775/mgba-wasm";
import { useEffect, useRef, useState } from "react";
const LOCAL_ROM_PATH = "/local-roms/pokemon-fire-red-brisbane.gba";
const LOCAL_ROM_FILE_NAME = "pokemon-fire-red-brisbane.gba";
const EMULATOR_BOOT_TIMEOUT_MS = 12000;

const keyboardShortcuts = [
  { action: "Move", shortcut: "Arrow keys" },
  { action: "A", shortcut: "Z" },
  { action: "B", shortcut: "X" },
  { action: "Start", shortcut: "Enter" },
  { action: "Select", shortcut: "Shift" },
];

type LoadState = "booting" | "loading" | "ready" | "error";

type RuntimeDiagnostic = {
  label: string;
  value: string;
};

type RuntimeSupport = {
  diagnostics: RuntimeDiagnostic[];
  isSupported: boolean;
  message?: string;
};

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

function checkModuleWorkerSupport() {
  if (
    typeof Worker === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    return false;
  }

  let worker: Worker | null = null;
  let workerUrl: string | null = null;

  try {
    workerUrl = URL.createObjectURL(
      new Blob(["postMessage('ready');"], { type: "text/javascript" }),
    );
    worker = new Worker(workerUrl, { type: "module" });
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
    return true;
  } catch {
    if (worker) {
      worker.terminate();
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
    }
    return false;
  }
}

function inspectRuntimeSupport(): RuntimeSupport {
  const hasWindow = typeof window !== "undefined";
  const crossOriginIsolated = hasWindow && window.crossOriginIsolated;
  const secureContext = hasWindow && window.isSecureContext;
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const hasWorker = typeof Worker !== "undefined";
  const hasModuleWorkers = checkModuleWorkerSupport();

  const diagnostics = [
    {
      label: "Cross-origin isolated",
      value: crossOriginIsolated ? "Yes" : "No",
    },
    {
      label: "SharedArrayBuffer",
      value: hasSharedArrayBuffer ? "Available" : "Missing",
    },
    {
      label: "Web workers",
      value: hasWorker ? "Available" : "Missing",
    },
    {
      label: "Module workers",
      value: hasModuleWorkers ? "Available" : "Missing",
    },
    {
      label: "Secure context",
      value: secureContext ? "Yes" : "No",
    },
  ];

  if (
    crossOriginIsolated &&
    hasSharedArrayBuffer &&
    hasWorker &&
    hasModuleWorkers
  ) {
    return {
      diagnostics,
      isSupported: true,
    };
  }

  return {
    diagnostics,
    isSupported: false,
    message:
      "This browser cannot start the threaded GBA emulator. In-app browsers often block SharedArrayBuffer, module workers, or cross-origin isolation even when the page headers are correct.",
  };
}

function bootEmulator(canvas: HTMLCanvasElement) {
  return new Promise<mGBAEmulator>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "The emulator worker never finished booting. This usually means the current browser or in-app browser does not fully support the threaded wasm runtime.",
        ),
      );
    }, EMULATOR_BOOT_TIMEOUT_MS);

    void mGBA({ canvas })
      .then((module) => {
        window.clearTimeout(timeoutId);
        resolve(module);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
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
  const [emulator, setEmulator] = useState<mGBAEmulator | null>(null);
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostic[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("booting");
  const [statusCopy, setStatusCopy] = useState("Booting the Brisbane cabinet...");
  const [isPaused, setIsPaused] = useState(false);
  const [isTurbo, setIsTurbo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        const support = inspectRuntimeSupport();
        setDiagnostics(support.diagnostics);
        if (!support.isSupported) {
          setLoadState("error");
          setStatusCopy(support.message ?? "The emulator runtime is unavailable.");
          return;
        }

        const module = await bootEmulator(canvas);
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

    // Delay startup one tick so React StrictMode's dev-only double mount
    // cleans up the first pass before we spin up threaded wasm workers.
    const bootTimerId = window.setTimeout(() => {
      void initialize();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimerId);
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
                <strong>Pokemon FireRed - Brisbane Mod 1.0</strong>
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

          <div className="pokemon-controls-grid minimal">
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
        </div>
      </div>

      {loadState === "error" ? (
        <div className="status-banner lost">
          <p>{statusCopy}</p>
        </div>
      ) : null}
    </div>
  );
}
