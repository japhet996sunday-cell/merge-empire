/**
 * ObjectPool.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Generic reusable-object pool to avoid garbage-collection churn for
 *   frequently created/destroyed objects — most importantly, animation
 *   particles/DOM elements for merge effects and floating currency numbers,
 *   which can spawn dozens of times per second during active play.
 *   Reused by AnimationController rather than allocating and discarding
 *   DOM nodes constantly, which is a common perf cliff in merge games.
 * ---------------------------------------------------------------------------
 */

export class ObjectPool {
  #createFn;
  #resetFn;
  #pool = [];

  /**
   * @param {() => object} createFn - builds a brand-new instance
   * @param {(instance: object) => void} resetFn - restores instance to a
   *   clean, reusable state before it's handed out again
   */
  constructor(createFn, resetFn) {
    this.#createFn = createFn;
    this.#resetFn = resetFn;
  }

  acquire() {
    return this.#pool.pop() ?? this.#createFn();
  }

  release(instance) {
    this.#resetFn(instance);
    this.#pool.push(instance);
  }

  get size() {
    return this.#pool.length;
  }

  preallocate(count) {
    for (let i = 0; i < count; i++) this.#pool.push(this.#createFn());
  }
  }
