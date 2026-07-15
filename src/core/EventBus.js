/**
 * EventBus.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   The single communication channel between all systems. No system ever
 *   imports another system directly to trigger behavior. Instead:
 *
 *     MergeSystem.emit('item:merged', payload)
 *     AchievementSystem listens for 'item:merged' and checks progress
 *     EconomySystem listens for 'item:merged' and grants currency
 *
 *   This is what makes the game "expandable for years" — new systems can
 *   subscribe to existing events without anyone touching old code.
 *
 * RULES
 *   - Event names are namespaced strings: '<domain>:<action>' e.g.
 *     'grid:itemPlaced', 'currency:changed', 'achievement:unlocked'.
 *   - Payloads are plain objects, never class instances (keeps saves/replays/
 *     debugging simple — you can JSON.stringify any payload for logging).
 *   - EventBus itself has ZERO game knowledge. It doesn't know what a
 *     "merge" is. That keeps it reusable and testable in isolation.
 *
 * NON-RESPONSIBILITIES
 *   - Does not persist anything (SaveManager's job).
 *   - Does not validate payload shape (each system validates what it reads).
 * ---------------------------------------------------------------------------
 */

export class EventBus {
  #listeners = new Map(); // eventName -> Set<handler>

  /**
   * @param {string} eventName
   * @param {(payload: object) => void} handler
   * @returns {() => void} unsubscribe function
   */
  on(eventName, handler) {
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }
    this.#listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe once; auto-unsubscribes after first firing.
   */
  once(eventName, handler) {
    const unsubscribe = this.on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off(eventName, handler) {
    this.#listeners.get(eventName)?.delete(handler);
  }

  /**
   * Synchronous fan-out. Idle/merge games are simulation-heavy; async event
   * dispatch would make tick order non-deterministic, which breaks offline
   * progress calculations. Keep this synchronous, always.
   */
  emit(eventName, payload = {}) {
    const handlers = this.#listeners.get(eventName);
    if (!handlers || handlers.size === 0) return;

    // Copy to array: a handler may unsubscribe itself or others mid-emit.
    for (const handler of [...handlers]) {
      try {
        handler(payload);
      } catch (err) {
        // One bad listener must never break the simulation for everyone else.
        console.error(`[EventBus] handler for "${eventName}" threw:`, err);
      }
    }
  }

  /** Debug/testing helper. Remove all listeners for one event, or all events. */
  clear(eventName) {
    if (eventName) this.#listeners.delete(eventName);
    else this.#listeners.clear();
  }
}

// Singleton instance shared across the whole app. Systems import this,
// they do not construct their own EventBus.
export const eventBus = new EventBus();
