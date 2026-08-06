import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePushNavigationTarget } from '../src/utils/pushNavigation.js';
import {
  canonicalPushFromNotification,
  matchesRequestedPush,
} from '../supabase/functions/_shared/pushAuthorization.js';

test('resolves a notification target from app metadata', () => {
  const target = resolvePushNavigationTarget({
    type: 'new_message',
    metadata: { conversation_id: 'abc123', link: '/messages/abc123' },
  }, 'https://trabage.org');

  assert.equal(target, '/messages/abc123');
});

test('prefers the canonical post route over legacy company links', () => {
  const target = resolvePushNavigationTarget({
    type: 'new_post',
    metadata: {
      post_id: 'post-7',
      link: '/companies/legacy-company',
    },
  }, 'https://trabage.org');

  assert.equal(target, '/post/post-7');
});

test('blocks external absolute urls', () => {
  const target = resolvePushNavigationTarget({
    type: 'system_update',
    metadata: { link: 'https://example.com/hello' },
  }, 'https://trabage.org');

  assert.equal(target, null);
});

test('accepts same-origin absolute urls as internal targets', () => {
  const target = resolvePushNavigationTarget({
    type: 'system_update',
    metadata: { link: 'https://trabage.org/personal/notifications' },
  }, 'https://trabage.org');

  assert.equal(target, '/personal/notifications');
});

test('rejects attacker-selected content for another user push', () => {
  const notification = {
    title: 'Ana comentó tu publicación',
    body: 'Buen trabajo',
    metadata: { post_id: 'post-7', link: '/post/post-7' },
  };

  assert.equal(
    matchesRequestedPush(
      notification,
      'post_comment',
      'Tu cuenta será bloqueada',
      'Abre este enlace para verificarla',
    ),
    false,
  );
});

test('uses persisted notification content and metadata as the canonical push', () => {
  const notification = {
    title: 'Luis le dio Me gusta a tu publicación',
    body: null,
    metadata: { post_id: 'post-9', link: '/post/post-9' },
  };

  assert.equal(
    matchesRequestedPush(
      notification,
      'post_like',
      notification.title,
      notification.title,
    ),
    true,
  );
  assert.deepEqual(canonicalPushFromNotification(notification, 'post_like'), {
    title: notification.title,
    body: notification.title,
    data: {
      post_id: 'post-9',
      link: '/post/post-9',
      type: 'post_like',
    },
  });
});
