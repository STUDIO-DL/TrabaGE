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
    // #region agent log
    const topic = sharedChannel.topic;
    const existingBefore = (supabase.getChannels?.() || []).map((c) => ({ topic: c.topic, state: c.state }));
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'A',location:'useUnreadNotificationsCount.js:teardownChannel',message:'teardown start',data:{topic,sharedUserId,listenerCount:listeners.size,existingBefore},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'C',location:'useUnreadNotificationsCount.js:ensureChannel',message:'reuse sharedChannel early return',data:{userId,listenerCount:listeners.size,channelState:sharedChannel?.state,topic:sharedChannel?.topic},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'A',location:'useUnreadNotificationsCount.js:ensureChannel',message:'before channel().on()',data:{userId,channelName,sharedChannelIsNull:sharedChannel===null,existingCount:existing.length,existingStates:existing.map((c)=>({topic:c.topic,state:c.state})),listenerCount:listeners.size,allChannels:(supabase.getChannels?.()||[]).map((c)=>({topic:c.topic,state:c.state}))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  try {
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
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'B',location:'useUnreadNotificationsCount.js:ensureChannel',message:'subscribe() ok',data:{userId,channelName,state:sharedChannel?.state,topic:sharedChannel?.topic},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'A',location:'useUnreadNotificationsCount.js:ensureChannel',message:'channel().on() threw',data:{userId,channelName,error:String(err?.message||err),existingAfter:(supabase.getChannels?.()||[]).map((c)=>({topic:c.topic,state:c.state}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

function subscribeShared(userId, onChange) {
  listeners.add(onChange);
  // #region agent log
  fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'C',location:'useUnreadNotificationsCount.js:subscribeShared',message:'listener added',data:{userId,listenerCount:listeners.size,hasSharedChannel:Boolean(sharedChannel),sharedUserId},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7421/ingest/6e8f1d4e-4a35-4c67-91d4-e4cf9bf02656',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'87c3e9'},body:JSON.stringify({sessionId:'87c3e9',hypothesisId:'A',location:'useUnreadNotificationsCount.js:unsubscribe',message:'listener removed',data:{userId,listenerCount:listeners.size,willTeardown:listeners.size===0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
