import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from './config/sentry';
import { initOneSignal } from './config/onesignal';
import { AppErrorBoundary } from './components/ui/ErrorBoundary';
import App from './App';
import './styles/index.css';

initSentry();
initOneSignal();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
