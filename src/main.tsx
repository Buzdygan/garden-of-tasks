// Suppress PixiJS deprecation warnings 
// This needs to be before any imports that might use PixiJS
const originalConsoleWarn = console.warn;
console.warn = function(message: any, ...args: any[]) {
  // Skip PixiJS deprecation warnings
  if (typeof message === 'string' && message.includes('PixiJS Deprecation Warning')) {
    return;
  }
  originalConsoleWarn.call(console, message, ...args);
};

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
