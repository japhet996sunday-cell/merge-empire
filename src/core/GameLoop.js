/**
 * GameLoop.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Drives the simulation on a FIXED timestep, independent of rendering
 *   framerate. This is the single most important architectural decision in
 *   an idle game:
 *
 *     - Render framerate varies (tab throttling, device, background tabs).
 *     - Simulation math (production, offline gains, upgrade timers) must be
 *       framerate-independent or the economy becomes exploitable
 *       (e.g. a 144hz monitor produces resources faster than a 30hz one).
 *
 *   Pattern: accumulator-based fixed update, decoupled render via rAF.
 *
 * FLOW
 *   requestAnimationFrame -> compute deltaTime -> feed accumulator
 *     -> while accumulator >= TICK_MS: simulate one tick, drain accumulator
 *     -> render once using latest state (with interpolation alpha available
 *        for systems that want smooth visual interpolation)
 *
 * NON-RESPONSIBILITIES
 *   - Does not know what a "tick" does gameplay-wise. It calls a callback.
 *   - Does not touch the DOM. Rendering is delegated to Renderer.js.
 *   - Does not handle offline progress (OfflineProgress.js owns the
 *     "catch-up" simulation that runs once at load, not every frame).
 * ---------------------------------------------------------------------------
 */

const TICK_RATE_HZ = 20;              // simulation steps per second
const TICK_MS = 1000 / TICK_RATE_HZ;  // 50ms per tick
const MAX_FRAME_MS = 250;             // clamp to avoid "spiral of death" after tab-away

export class GameLoop {
  #onTick;        // (tickDeltaSeconds: number) => void   — fixed-step simulation
  #onRender;       // (interpolationAlpha: number) => void — variable-step render
  #accumulatorMs = 0;
  #lastFrameTime = 0;
  #rafHandle = null;
  #running = false;

  /**
   * @param {object} handlers
   * @param {(dtSeconds: number) => void} handlers.onTick
   * @param {(alpha: number) => void} handlers.onRender
   */
  constructor({ onTick, onRender }) {
    this.#onTick = onTick;
    this.#onRender = onRender;
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#lastFrameTime = performance.now();
    this.#rafHandle = requestAnimationFrame(this.#frame);
  }

  stop() {
    this.#running = false;
    if (this.#rafHandle !== null) {
      cancelAnimationFrame(this.#rafHandle);
      this.#rafHandle = null;
    }
  }

  get isRunning() {
    return this.#running;
  }

  #frame = (now) => {
    if (!this.#running) return;

    let frameMs = now - this.#lastFrameTime;
    this.#lastFrameTime = now;
    if (frameMs > MAX_FRAME_MS) frameMs = MAX_FRAME_MS; // clamp huge gaps

    this.#accumulatorMs += frameMs;

    while (this.#accumulatorMs >= TICK_MS) {
      this.#onTick(TICK_MS / 1000);
      this.#accumulatorMs -= TICK_MS;
    }

    const alpha = this.#accumulatorMs / TICK_MS; // 0..1, for render interpolation
    this.#onRender(alpha);

    this.#rafHandle = requestAnimationFrame(this.#frame);
  };
}

export const GAME_LOOP_CONSTANTS = { TICK_RATE_HZ, TICK_MS, MAX_FRAME_MS };
