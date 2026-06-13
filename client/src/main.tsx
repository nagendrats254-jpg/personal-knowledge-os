import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1f2937',
          color: '#f1f5f9',
          border: '1px solid rgba(139,92,246,0.3)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: { primary: '#8b5cf6', secondary: '#fff' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
        },
      }}
    />
  </React.StrictMode>
);
