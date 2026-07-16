import { useCallback, useEffect, useMemo, useState } from 'react';

/** Gap between keyboard top edge and bottom UI (12–16px target). */
export const KEYBOARD_GAP = 14;

/** Minimum inset treated as virtual keyboard (ignores browser chrome jitter). */
const KEYBOARD_THRESHOLD = 50;

function readSafeAreaBottomPx() {
  if (typeof document === 'undefined') return 0;

  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;';
  document.documentElement.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return px;
}

export function measureKeyboardHeight() {
  if (typeof window === 'undefined') return 0;

  const vv = window.visualViewport;
  if (vv) {
    const height = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    return height > KEYBOARD_THRESHOLD ? height : 0;
  }

  return 0;
}

function applyKeyboardCssVars(keyboardHeight) {
  const root = document.documentElement;
  const offset = keyboardHeight > 0 ? keyboardHeight + KEYBOARD_GAP : 0;

  root.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
  root.style.setProperty('--keyboard-offset', `${offset}px`);
  root.dataset.keyboardOpen = keyboardHeight > 0 ? 'true' : 'false';
}

export function useKeyboardInsets() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  const update = useCallback(() => {
    const height = measureKeyboardHeight();
    setKeyboardHeight(height);
    applyKeyboardCssVars(height);
    setSafeAreaBottom(readSafeAreaBottomPx());
  }, []);

  useEffect(() => {
    update();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);

      const root = document.documentElement;
      root.style.removeProperty('--keyboard-height');
      root.style.removeProperty('--keyboard-offset');
      delete root.dataset.keyboardOpen;
    };
  }, [update]);

  const isKeyboardVisible = keyboardHeight > 0;
  const keyboardOffset = isKeyboardVisible ? keyboardHeight + KEYBOARD_GAP : 0;

  const footerPaddingBottom = isKeyboardVisible
    ? `calc(${keyboardHeight}px + ${KEYBOARD_GAP}px + env(safe-area-inset-bottom, 0px))`
    : 'max(1rem, env(safe-area-inset-bottom, 0px))';

  const bottomBarInset = isKeyboardVisible ? `${keyboardOffset}px` : '0px';

  return useMemo(
    () => ({
      keyboardHeight,
      keyboardGap: KEYBOARD_GAP,
      keyboardOffset,
      safeAreaBottom,
      isKeyboardVisible,
      footerPaddingBottom,
      bottomBarInset,
    }),
    [
      keyboardHeight,
      keyboardOffset,
      safeAreaBottom,
      isKeyboardVisible,
      footerPaddingBottom,
      bottomBarInset,
    ],
  );
}
