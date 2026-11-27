import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/minecraft.css';

// Conditionally load Popover API polyfill only on browsers lacking native support
if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
  void import('@oddbird/popover-polyfill');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
