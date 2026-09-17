import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHiddenPushPromptRoute,
  shouldShowPushPermissionPrompt,
} from '../src/utils/pushPromptVisibility.js';
import {
  applicationServerKeysEqual,
  base64UrlToUint8Array,
} from '../src/utils/webPushKeys.js';

const readyUser = {
  loading: false,
  isAuthenticated: true,
  isPreviewMode: false,
  userId: 'user-1',
  role: 'personal',
  setupComplete: true,
  prefsLoading: false,
  isConfigured: true,
  isSupported: true,
  dismissedRecently: false,
  hiddenRoute: false,
};

test('shows the push prompt on a new device even if the account already enabled push', () => {
  assert.equal(shouldShowPushPermissionPrompt({
    ...readyUser,
    pushEnabled: true,
    osPermission: 'default',
  }), true);
});

test('hides the push prompt when this device already granted and push is enabled', () => {
  assert.equal(shouldShowPushPermissionPrompt({
    ...readyUser,
    pushEnabled: true,
    osPermission: 'granted',
  }), false);
});

test('shows the push prompt when OS permission is granted but the master toggle is still off', () => {
  assert.equal(shouldShowPushPermissionPrompt({
    ...readyUser,
    pushEnabled: false,
    osPermission: 'granted',
  }), true);
});

test('hides the push prompt when the OS blocked notifications', () => {
  assert.equal(shouldShowPushPermissionPrompt({
    ...readyUser,
    pushEnabled: false,
    osPermission: 'denied',
  }), false);
});

test('hides the push prompt on auth and setup routes', () => {
  assert.equal(isHiddenPushPromptRoute('/login'), true);
  assert.equal(isHiddenPushPromptRoute('/personal/feed'), false);
  assert.equal(shouldShowPushPermissionPrompt({
    ...readyUser,
    hiddenRoute: true,
    osPermission: 'default',
  }), false);
});

test('compares VAPID application server keys', () => {
  const bytes = base64UrlToUint8Array('AQID');
  assert.deepEqual(Array.from(bytes), [1, 2, 3]);
  assert.equal(applicationServerKeysEqual(bytes, new Uint8Array([1, 2, 3])), true);
  assert.equal(applicationServerKeysEqual(bytes, new Uint8Array([1, 2, 4])), false);
});
