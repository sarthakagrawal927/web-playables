export interface Loop {
  start(): void;
  /** Halts ticking entirely (wire to Platform.onPauseChange). */
  pause(): void;
  resume(): void;
  readonly running: boolean;
}

export interface LoopOptions {
  /** Fixed simulation step in ms. */
  stepMs?: number;
  /** Largest gap the loop will simulate at once; longer gaps are dropped
   * (offline progress handles long absences at load time). */
  maxCatchUpMs?: number;
}

/**
 * Fixed-timestep loop: requestAnimationFrame drives rendering-rate ticking,
 * and a coarse setInterval watchdog keeps simulation advancing when rAF is
 * throttled (background iframes). Both feed one accumulator, so time is
 * never double-counted.
 */
export function createLoop(tick: (dtSeconds: number) => void, opts: LoopOptions = {}): Loop {
  const stepMs = opts.stepMs ?? 100;
  const maxCatchUpMs = opts.maxCatchUpMs ?? 2000;
  let running = false;
  let last = 0;
  let acc = 0;
  let rafId = 0;
  let watchdogId: ReturnType<typeof setInterval> | undefined;

  const advance = (now: number) => {
    acc += now - last;
    last = now;
    if (acc > maxCatchUpMs) acc = maxCatchUpMs;
    while (acc >= stepMs) {
      tick(stepMs / 1000);
      acc -= stepMs;
    }
  };

  const frame = (now: number) => {
    if (!running) return;
    advance(now);
    rafId = requestAnimationFrame(frame);
  };

  const begin = () => {
    if (running) return;
    running = true;
    last = performance.now();
    acc = 0;
    rafId = requestAnimationFrame(frame);
    watchdogId = setInterval(() => advance(performance.now()), 250);
  };

  const halt = () => {
    running = false;
    cancelAnimationFrame(rafId);
    if (watchdogId !== undefined) clearInterval(watchdogId);
    watchdogId = undefined;
  };

  return {
    start: begin,
    pause: halt,
    resume: begin,
    get running() {
      return running;
    },
  };
}
