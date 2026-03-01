import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { decompressFromEncodedURIComponent } from 'lz-string'
import { useProjectionStore } from './store/useProjectionStore'

// Hydrate from shared URL if ?s= parameter is present
const params = new URLSearchParams(window.location.search);
const shared = params.get('s');
if (shared) {
  try {
    const json = decompressFromEncodedURIComponent(shared);
    if (json) {
      const inputs = JSON.parse(json);
      // Merge shared inputs into the store, overriding localStorage
      useProjectionStore.setState(inputs);
    }
    // Clean up the URL after loading
    const url = new URL(window.location.href);
    url.searchParams.delete('s');
    window.history.replaceState({}, '', url.toString());
  } catch (e) {
    console.warn('[Share] Failed to load shared state from URL:', e);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
