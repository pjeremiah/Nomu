import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';

// Prevent "Timeout (u)" and similar timeout errors from showing the full-screen error overlay.
// These often come from dev tooling or async internals, not app code.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message ?? String(event.reason ?? '');
    if (typeof msg === 'string' && msg.includes('Timeout')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  window.addEventListener('error', (event) => {
    const msg = event.message ?? String(event.error ?? '');
    if (typeof msg === 'string' && msg.includes('Timeout')) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }, true);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
