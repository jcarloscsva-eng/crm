import React from 'react';
import ReactDOM from 'react-dom/client';

// Placeholder: el frontend real (login, listado de clientes, segmentos...)
// todavía no está construido. Este stub solo confirma que el contenedor
// arranca y puede hablar con el backend, como base para la siguiente iteración.
function App() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>CRM Pymes — frontend en construcción</h1>
      <p>El backend debería estar disponible en: {apiUrl}</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
