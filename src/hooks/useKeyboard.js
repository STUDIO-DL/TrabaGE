import { useContext } from 'react';

import { KeyboardContext } from '../context/keyboardContextValue';

export function useKeyboard() {
  const context = useContext(KeyboardContext);

  if (!context) {
    return {
      keyboardHeight: 0,
      keyboardGap: 14,
      keyboardOffset: 0,
      safeAreaBottom: 0,
      isKeyboardVisible: false,
      footerPaddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
      bottomBarInset: '0px',
    };
  }

  return context;
}
