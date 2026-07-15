/**
 * Renderer.js
 * ---------------------------------------------------------------------------
 * RESPONSIBILITY
 *   Low-level, framework-free DOM update helpers shared by every UI
 *   component/screen. Since this project has "no frameworks," this file is
 *   the deliberate substitute for what React/Vue would give you — a small,
 *   consistent toolkit for creating elements and patching text/attributes
 *   without manually repeating `document.createElement` boilerplate and
 *   without triggering unnecessary reflows.
 *
 * CONTRACT
 *   h(tag, props, children) -> HTMLElement   — hyperscript-style element
 *     builder, e.g. h('div', { class: 'card' }, [h('span', {}, 'Gold')])
 *   setText(el, text)   — only touches textContent if value actually changed
 *   toggleClass(el, className, condition)
 *   show(el) / hide(el)
 *
 * DESIGN NOTES
 *   - `setText`/attribute setters check-before-write specifically to avoid
 *     layout thrash when called every render tick from HUD updates (e.g.
 *     currency counters that tick rapidly during idle production).
 *   - This is intentionally NOT a virtual-DOM diffing engine — that's
 *     overkill for this UI's complexity and would violate "no frameworks"
 *     in spirit. Components are expected to hold direct references to the
 *     DOM nodes they need to update repeatedly (see HUD.js pattern).
 * ---------------------------------------------------------------------------
 */

export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      el.setAttribute(key, value);
    }
  }

  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child === null || child === undefined) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return el;
}

export function setText(el, text) {
  const str = String(text);
  if (el.textContent !== str) el.textContent = str;
}

export function toggleClass(el, className, condition) {
  el.classList.toggle(className, condition);
}

export function show(el) {
  el.hidden = false;
}

export function hide(el) {
  el.hidden = true;
               }
