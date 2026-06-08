import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress noisy browser extension errors (e.g. MetaMask, Zerion) in preview
const originalError = console.error;
console.error = (...args) => {
  try {
    const msg = args[0];
    if (typeof msg === 'string' && (msg.includes('isZerion') || msg.includes('MetaMask'))) return;
    if (msg instanceof Error && (msg.message.includes('isZerion') || msg.message.includes('MetaMask'))) return;
  } catch (e) {}
  originalError.apply(console, args);
};

const isExtensionError = (msg: any) => {
  if (typeof msg !== 'string') return false;
  return msg.includes('isZerion') || msg.includes('MetaMask') || msg.includes('Provider');
};

window.addEventListener('error', (e) => {
  if (isExtensionError(e.message) || (e.error && isExtensionError(e.error.message))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  if (isExtensionError(e.reason) || (e.reason && isExtensionError(e.reason.message))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
