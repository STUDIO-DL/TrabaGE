import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { initSentry } from './config/sentry';
import { initWebPush } from './config/webPush';
import { AppErrorBoundary } from './components/ui/ErrorBoundary';
import { initConnectivityListeners } from './utils/connectivity';
import { reportError } from './utils/logger';
import App from './App';
import './styles/index.css';

initSentry();
initWebPush();
initConnectivityListeners();

if (typeof window !== 'undefined') {
  const isEditableTarget = (target) =>
    target instanceof Element &&
    (target.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]') ||
      Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')));

  document.addEventListener('contextmenu', (event) => {
    if (!isEditableTarget(event.target)) event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ['+', '-', '=', '0'].includes(event.key)) {
      event.preventDefault();
    }
  });

  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'unhandledrejection')), {
      area: 'unhandled_rejection',
    });
  });

  window.addEventListener('error', (event) => {
    if (event.error) {
      reportError(event.error, { area: 'window_error' });
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
