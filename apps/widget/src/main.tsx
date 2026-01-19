import React from 'react';
import ReactDOM from 'react-dom/client';
import { Widget } from './Widget';
import './index.css';

declare global {
  interface Window {
    WebGPT: {
      init: (config: { siteKey: string; apiUrl?: string }) => void;
    };
  }
}

// Global initialization function
window.WebGPT = {
  init: (config) => {
    const containerId = 'webgpt-widget-container';
    
    // Remove existing container if present
    const existing = document.getElementById(containerId);
    if (existing) {
      existing.remove();
    }

    // Create container
    const container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);

    // Mount widget
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <Widget 
          siteKey={config.siteKey} 
          apiUrl={config.apiUrl || 'http://localhost:4000/api/v1'}
        />
      </React.StrictMode>
    );
  },
};

// Auto-initialize if data attributes present
document.addEventListener('DOMContentLoaded', () => {
  const script = document.querySelector('script[data-webgpt-key]');
  if (script) {
    const siteKey = script.getAttribute('data-webgpt-key');
    const apiUrl = script.getAttribute('data-webgpt-api');
    
    if (siteKey) {
      window.WebGPT.init({
        siteKey,
        apiUrl: apiUrl || undefined,
      });
    }
  }
});



