import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePushNavigationTarget } from '../src/utils/pushNavigation.js';

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
