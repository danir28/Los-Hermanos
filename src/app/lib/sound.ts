// Beep sonoro de "pedido nuevo" para cocina. Los navegadores (Chrome/Firefox/Safari) sacaron el
// campo "sound" de la Notification API hace años — ninguno reproduce un archivo de audio propio
// dentro de la notificación del sistema operativo (por eso showNotification() en sw-push.js no
// tiene ninguna opción de sonido: no existe tal opción soportada, en ningún navegador). Este
// módulo sintetiza un beep con Web Audio API y lo reproduce desde la pestaña en primer plano —
// funciona igual en Windows/Chrome, Mac/Safari y Android/Chrome porque no depende de ninguna API
// específica del sistema operativo, solo de AudioContext, disponible en los tres.

let ctx: AudioContext | null = null;
let unlocked = false;

// Debounce simple: evita un doble beep cuando el mismo pedido nuevo llega casi al mismo tiempo
// por dos canales distintos (el push instantáneo vía sw-push.js Y el polling de 30s de
// AppStaff.tsx que lo detecta igual como red de contención si el push no está activado).
const BEEP_MIN_INTERVAL_MS = 4000;
let lastBeepAt = 0;

// Los navegadores no dejan arrancar audio sin un gesto previo del usuario (política de autoplay,
// más estricta en Safari). Se llama una sola vez, desde el primer click/touch en toda la app (ver
// AppStaff.tsx) — no hace falta que sea un gesto relacionado con sonido específicamente, cualquier
// interacción real alcanza para desbloquear el AudioContext.
export function unlockAudio(): void {
  if (unlocked) return;
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    ctx = new AudioContextCtor();
    if (ctx.state === "suspended") void ctx.resume();
    unlocked = true;
  } catch {
    // Navegador sin Web Audio API: el beep simplemente no sonará, sin romper nada más.
  }
}

// Dos tonos cortos ascendentes (se acerca más a un "ding" de notificación que un pitido plano de
// un solo tono). No hace nada si el audio todavía no se desbloqueó (nadie tocó la pantalla
// todavía) — no hay forma de reproducir sonido sin gesto previo, y no vale la pena tirar un error
// por eso; el próximo pedido ya lo va a encontrar desbloqueado.
export function playNewOrderBeep(): void {
  if (!ctx || !unlocked) return;
  const nowMs = Date.now();
  if (nowMs - lastBeepAt < BEEP_MIN_INTERVAL_MS) return;
  lastBeepAt = nowMs;

  const now = ctx.currentTime;
  [880, 1175].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    const start = now + i * 0.14;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.13);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.14);
  });
}
