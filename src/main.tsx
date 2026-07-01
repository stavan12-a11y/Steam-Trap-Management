import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { SteamTrapProvider } from './store/SteamTrapContext.tsx';
import { AuthProvider } from './auth/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SteamTrapProvider>
          <App />
        </SteamTrapProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
