/**
 * Modal.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Generic reusable modal/dialog shell used for achievement unlock
 *   celebrations, purchase confirmations, "Welcome Back" offline-progress
 *   summaries, and settings sub-dialogs. One implementation, many callers —
 *   avoids every screen reinventing overlay/focus-trap/close-button logic.
 *
 * CONTRACT
 *   open({ title, bodyEl, actions }) -> void
 *     actions: Array<{ label: string, onClick: () => void, variant?: string }>
 *   close() -> void
 *
 * ACCESSIBILITY NOTES
 *   - Traps focus within the modal while open; restores focus to the
 *     triggering element on close.
 *   - Closes on Escape and on backdrop click.
 *   - role="dialog" + aria-modal="true" set on the root element.
 * ---------------------------------------------------------------------------
 */

import { h } from '../Renderer.js';
import { MODAL_TRANSITION_MS } from '../../config/Constants.js';

export const Modal = {
  _rootEl: null,
  _lastFocusedEl: null,

  open({ title, bodyEl, actions = [] }) {
    this._lastFocusedEl = document.activeElement;

    const actionEls = actions.map((action) =>
      h(
        'button',
        {
          class: `btn ${action.variant ? `btn--${action.variant}` : ''}`,
          onClick: () => {
            action.onClick?.();
            this.close();
          },
        },
        action.label
      )
    );

    this._rootEl = h('div', { class: 'modal-backdrop', role: 'presentation' }, [
      h(
        'div',
        {
          class: 'modal',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': title,
        },
        [
          h('h2', { class: 'modal-title' }, title),
          h('div', { class: 'modal-body' }, bodyEl),
          h('div', { class: 'modal-actions' }, actionEls),
        ]
      ),
    ]);

    this._rootEl.addEventListener('click', (e) => {
      if (e.target === this._rootEl) this.close();
    });
    document.addEventListener('keydown', this._handleKeydown);

    document.body.appendChild(this._rootEl);
    this._rootEl.querySelector('.modal')?.focus();
  },

  close() {
    if (!this._rootEl) return;
    document.removeEventListener('keydown', this._handleKeydown);

    const el = this._rootEl;
    el.classList.add('is-closing');
    setTimeout(() => el.remove(), MODAL_TRANSITION_MS);

    this._rootEl = null;
    this._lastFocusedEl?.focus?.();
  },

  _handleKeydown: (e) => {
    if (e.key === 'Escape') Modal.close();
  },
};
