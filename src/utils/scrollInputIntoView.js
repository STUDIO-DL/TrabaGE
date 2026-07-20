import { KEYBOARD_GAP } from '../hooks/useKeyboardInsets';

const FOCUSABLE =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

const DEFAULT_MARGIN = KEYBOARD_GAP + 8;

/** Height of fixed/sticky bottom chrome (e.g. KeyboardAwareFooter) overlapping the viewport. */
export function measureBottomChromeHeight() {
  if (typeof document === 'undefined') return 0;

  let inset = 0;
  document.querySelectorAll('[data-keyboard-footer]').forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.height <= 0) return;
    const overlap = Math.max(0, window.innerHeight - rect.top);
    inset = Math.max(inset, overlap);
  });

  return inset;
}

function findScrollParent(element) {
  let parent = element.parentElement;

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return parent;
    }
    parent = parent.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function getVisibleBottom(margin) {
  const vv = window.visualViewport;
  if (vv) return vv.offsetTop + vv.height - margin;
  return window.innerHeight - margin;
}

function scrollByAmount(scrollable, amount) {
  if (!amount) return;

  if (scrollable === document.documentElement || scrollable === document.body) {
    window.scrollBy({ top: amount, behavior: 'smooth' });
    return;
  }

  scrollable.scrollBy({ top: amount, behavior: 'smooth' });
}

function alignElement(element, { margin = DEFAULT_MARGIN } = {}) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return;

  const rect = element.getBoundingClientRect();
  const visibleBottom = getVisibleBottom(margin);
  const visibleTop = (window.visualViewport?.offsetTop ?? 0) + margin;

  if (rect.bottom <= visibleBottom && rect.top >= visibleTop) return;

  const scrollable = findScrollParent(element);

  if (rect.bottom > visibleBottom) {
    scrollByAmount(scrollable, rect.bottom - visibleBottom);
    return;
  }

  if (rect.top < visibleTop) {
    scrollByAmount(scrollable, rect.top - visibleTop);
  }
}

/**
 * Scroll a focused field into view above the virtual keyboard with comfortable margin.
 */
export function scrollInputIntoView(element, options = {}) {
  if (!element) return;

  const { margin = DEFAULT_MARGIN, delay = 120 } = options;

  const run = () => {
    requestAnimationFrame(() => {
      alignElement(element, { margin });
      // Second pass after keyboard animation settles (iOS).
      window.setTimeout(() => alignElement(element, { margin }), 280);
    });
  };

  if (delay > 0) {
    window.setTimeout(run, delay);
  } else {
    run();
  }
}

export function isFocusableInput(element) {
  return Boolean(element?.matches?.(FOCUSABLE));
}

function shouldSkipKeyboardScroll(element) {
  return Boolean(element?.closest?.('[data-chat-compose]'));
}

export function attachGlobalInputScroll(options = {}) {
  const handleFocusIn = (event) => {
    const target = event.target;
    if (!isFocusableInput(target)) return;
    if (shouldSkipKeyboardScroll(target)) return;
    scrollInputIntoView(target, options);
  };

  document.addEventListener('focusin', handleFocusIn, true);
  return () => document.removeEventListener('focusin', handleFocusIn, true);
}
