import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useForegroundResumeRefresh } from './useForegroundResumeRefresh';
import { supabase } from '../config/supabase';
import { notificationsService } from '../services/notifications.service';

/**
 * Single shared Realtime subscription for unread notifications.
 * Multiple consumers (BottomNav + NotificationBell) must not open the same
 * channel name — Supabase rejects `.on()` after `.subscribe()`.
 */
const listeners = new Set();
let sharedCount = 0;
let sharedUserId = null;
let sharedChannel = null;
let fetchGen = 0;

function emit(count) {
  sharedCount = count;
  listeners.forEach((listener) => listener(count));
}

async function fetchSharedCount(userId) {
  if (!userId) {
    emit(0);
    return;
  }

  const gen = ++fetchGen;
  const { count: unreadCount, error } = await notificationsService.getUnreadCount(userId);
  if (gen !== fetchGen || sharedUserId !== userId) return;
  if (error) return;
  emit(unreadCount ?? 0);
}

function teardownChannel() {
  if (sharedChannel) {
    void supabase.removeChannel(sharedChannel);
    sharedChannel = null;
  }
}

function ensureChannel(userId) {
  if (!userId) {
    teardownChannel();
    sharedUserId = null;
    return;
  }

  if (sharedChannel && sharedUserId === userId) {
    return;
  }

  teardownChannel();
  sharedUserId = userId;

  const filter = `recipient_id=eq.${userId}`;
  const refetch = () => {
    void fetchSharedCount(userId);
  };

  const channelName = `notifications-unread-${userId}`;
  const existing = (supabase.getChannels?.() || []).filter((c) => c.topic === `realtime:${channelName}`);

  sharedChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter },
      refetch,
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'notifications', filter },
      refetch,
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'notifications', filter },
      refetch,
    )
    .subscribe();
}

function subscribeShared(userId, onChange) {
  listeners.add(onChange);
  onChange(sharedCount);

  if (userId) {
    ensureChannel(userId);
    void fetchSharedCount(userId);
  } else {
    teardownChannel();
    sharedUserId = null;
    emit(0);
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      teardownChannel();
      sharedUserId = null;
      fetchGen += 1;
    }
  };
}

export function useUnreadNotificationsCount() {
  const { user, isPreviewMode } = useAuth();
  const [count, setCount] = useState(sharedCount);
  const [loading, setLoading] = useState(true);

  const userId = !isPreviewMode ? user?.id ?? null : null;

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeShared(userId, (next) => {
      setCount(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

  const refetch = useCallback(() => {
    if (!userId) {
      emit(0);
      setLoading(false);
      return Promise.resolve();
    }
    setLoading(true);
    return fetchSharedCount(userId).finally(() => setLoading(false));
  }, [userId]);

  useForegroundResumeRefresh(() => {
    if (userId) void fetchSharedCount(userId);
  }, [userId]);

  return { count, loading, refetch };
}
