import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom no implementa Web Audio API — se stubea acá a mano. Cada test importa el módulo de nuevo
// (vi.resetModules) porque sound.ts guarda estado interno (¿ya se desbloqueó el audio?, ¿cuándo
// sonó el último beep?) en variables de módulo, a propósito: es un singleton por pestaña, no algo
// que reciba una instancia nueva por cada llamada.
class FakeGain {
  gain = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
}
class FakeOscillator {
  frequency = { value: 0 };
  type = "";
  connect = vi.fn((dest: unknown) => dest);
  start = vi.fn();
  stop = vi.fn();
}
// Clase real (no vi.fn(arrow)) a propósito: vi.fn() no soporta bien envolver una implementación
// que no sea función clásica/clase cuando el código bajo test la instancia con "new" — construirla
// directo evita ese problema y de paso da un lugar simple (el array estático) para inspeccionar la
// instancia creada.
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
  createOscillator = vi.fn(() => new FakeOscillator());
  createGain = vi.fn(() => new FakeGain());
  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

function stubAudioContext() {
  FakeAudioContext.instances = [];
  Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
  return FakeAudioContext;
}

async function freshSoundModule() {
  vi.resetModules();
  return import("./sound");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "AudioContext");
});

describe("playNewOrderBeep", () => {
  it("no hace nada si todavía no se llamó a unlockAudio()", async () => {
    stubAudioContext();
    const { playNewOrderBeep } = await freshSoundModule();

    playNewOrderBeep();

    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it("no hace nada si el navegador no soporta AudioContext", async () => {
    const { unlockAudio, playNewOrderBeep } = await freshSoundModule();

    expect(() => { unlockAudio(); playNewOrderBeep(); }).not.toThrow();
  });

  it("suena (crea y arranca dos osciladores) después de desbloquear", async () => {
    stubAudioContext();
    const { unlockAudio, playNewOrderBeep } = await freshSoundModule();

    unlockAudio();
    playNewOrderBeep();

    // Un oscilador por cada uno de los dos tonos del "ding" (ver sound.ts).
    const [instance] = FakeAudioContext.instances;
    expect(instance.createOscillator).toHaveBeenCalledTimes(2);
    expect(instance.createOscillator).toHaveReturnedWith(expect.objectContaining({ start: expect.any(Function) }));
  });

  it("no vuelve a sonar si se llama de nuevo dentro de la ventana de debounce", async () => {
    stubAudioContext();
    const { unlockAudio, playNewOrderBeep } = await freshSoundModule();
    unlockAudio();

    playNewOrderBeep();
    const [instance] = FakeAudioContext.instances;
    playNewOrderBeep();

    expect(instance.createOscillator).toHaveBeenCalledTimes(2); // sigue en 2, no en 4
  });

  it("vuelve a sonar pasada la ventana de debounce", async () => {
    stubAudioContext();
    const { unlockAudio, playNewOrderBeep } = await freshSoundModule();
    unlockAudio();

    playNewOrderBeep();
    const [instance] = FakeAudioContext.instances;
    vi.advanceTimersByTime(4001);
    playNewOrderBeep();

    expect(instance.createOscillator).toHaveBeenCalledTimes(4);
  });
});
