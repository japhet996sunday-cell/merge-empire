/**
 * Button.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Small factory for the game's standardized buttons, including the
 *   common "purchase button" pattern (label + cost + affordability state)
 *   used throughout UpgradesScreen and shop-like UI. Centralizing this
 *   ensures every purchase button in the game looks and behaves
 *   consistently (disabled styling, currency icon placement, etc.)
 *   without copy-pasting markup across screens.
 *
 * CONTRACT
 *   createButton({ label, onClick, disabled, variant }) -> HTMLElement
 *   createCostButton({ label, cost, currencyId, canAfford, onClick }) -> HTMLElement
 * ---------------------------------------------------------------------------
 */

import { h } from '../Renderer.js';
import { NumberFormatter } from '../../utils/NumberFormatter.js';

export function createButton({ label, onClick, disabled = false, variant = 'primary' }) {
  return h(
    'button',
    {
      class: `btn btn--${variant}`,
      type: 'button',
      disabled: disabled ? '' : undefined,
      onClick,
    },
    label
  );
}

export function createCostButton({ label, cost, currencyId, canAfford, onClick }) {
  return h(
    'button',
    {
      class: `btn btn--cost ${canAfford ? '' : 'is-disabled'}`,
      type: 'button',
      disabled: canAfford ? undefined : '',
      onClick,
    },
    [
      h('span', { class: 'btn-cost-label' }, label),
      h('span', { class: 'btn-cost-value', dataset: { currencyId } }, NumberFormatter.abbreviate(cost)),
    ]
  );
      }
