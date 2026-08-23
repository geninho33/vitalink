import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PacienteAtivoProvider } from './context/PacienteAtivoContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PacienteAtivoProvider>
          <App />
        </PacienteAtivoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
