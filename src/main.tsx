import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { initializeLiveUpdates } from './lib/live-updates';

const queryClient = new QueryClient();

// Inicializa o Live Updates
initializeLiveUpdates();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Erro ao renderizar a aplicação:', error);
  rootElement.innerHTML = '<div style="color: red; padding: 20px;">Erro ao carregar a aplicação. Por favor, verifique o console.</div>';
}
