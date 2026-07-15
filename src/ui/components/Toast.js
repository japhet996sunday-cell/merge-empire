/**
 * Toast.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Transient, non-blocking notifications (e.g. "Mission completed!",
 *   "Save failed — check storage"). Distinct from Modal: toasts never
 *   block interaction or steal focus, auto-dismiss, and can stack.
 *
 * CONTRACT
 *   show(message, { duration, variant }) -> void
 *     variant: 'info' | 'success' | 'warning' | 'error'
 * ---------------------------------------------------------------------------
 */

import { h } from '../Renderer.js';
import { TOAST_DEFAULT_DURATION_MS } from '../../config/Constants.js';

export const Toast = {
  _containerEl: null,

  _ensureContainer() {
    if (this._containerEl) return this._containerEl;
    this._containerEl = h('div', { class: 'toast-container', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(this._containerEl);
    return this._containerEl;
  },

  show(message, { duration = TOAST_DEFAULT_DURATION_MS, variant = 'info' } = {}) {
    const container = this._ensureContainer();
    const toastEl = h('div', { class: `toast toast--${variant}` }, message);
    container.appendChild(toastEl);

    const animation = toastEl.animate(
      [
        { transform: 'translateY(12px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: 180, easing: 'ease-out' }
    );

    setTimeout(() => {
      const fadeOut = toastEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
      fadeOut.finished.then(() => toastEl.remove()).catch(() => toastEl.remove());
    }, duration);
  },
};
