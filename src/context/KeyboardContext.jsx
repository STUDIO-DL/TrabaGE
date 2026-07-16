import { useEffect, useMemo } from 'react';

import { KeyboardContext } from './keyboardContextValue';
import { useKeyboardInsets } from '../hooks/useKeyboardInsets';
import { attachGlobalInputScroll } from '../utils/scrollInputIntoView';

export function KeyboardProvider({ children }) {
  const insets = useKeyboardInsets();

  useEffect(() => attachGlobalInputScroll(), []);

  const value = useMemo(() => insets, [insets]);

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
}
