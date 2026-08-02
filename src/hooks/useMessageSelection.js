import { useCallback, useEffect, useMemo, useState } from 'react';
import { triggerSelectionHaptic } from '../utils/hapticFeedback';

/** Default: single selection (WhatsApp long-press). Architecture supports multi. */
export const MESSAGE_SELECTION_MAX = 1;

/**
 * Reusable message selection state for chat threads.
 * Keeps selection logic out of MessageBubble.
 */
export function useMessageSelection({
  conversationId,
  maxSelection = MESSAGE_SELECTION_MAX,
} = {}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    clear();
  }, [conversationId, clear]);

  const isActive = selectedIds.size > 0;

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

  const enter = useCallback(
    (messageId) => {
      if (!messageId) return;
      setSelectedIds((prev) => {
        if (prev.has(messageId)) return prev;
        const next = new Set();
        next.add(messageId);
        return next;
      });
      triggerSelectionHaptic();
    },
    [],
  );

  const toggle = useCallback(
    (messageId) => {
      if (!messageId) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(messageId)) {
          next.delete(messageId);
          return next;
        }
        if (maxSelection === 1) {
          next.clear();
          next.add(messageId);
          return next;
        }
        if (next.size >= maxSelection) return prev;
        next.add(messageId);
        return next;
      });
    },
    [maxSelection],
  );

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

  return {
    isActive,
    selectedIds,
    selectedIdList,
    selectedCount: selectedIds.size,
    maxSelection,
    isSelected,
    enter,
    toggle,
    clear,
  };
}
