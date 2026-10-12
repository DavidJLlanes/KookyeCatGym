import React, { useState, useEffect, Suspense, lazy } from 'react';
import * as api from './api/client';
import AuthGate from './components/AuthGate';
import { isAuthenticated, getStoredUser, clearSession, AuthUser } from './auth';
import { LightboxProvider } from './context/LightboxContext';
import { LegalProvider } from './context/LegalContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { I18nProvider } from './i18n';

// El grueso de la app (paneles, catálogo de 873 ejercicios, gráficos...) se
// carga en un chunk aparte, solo después de iniciar sesión — así la pantalla
// de login no espera a descargar nada de eso.
const AppContent = lazy(() => import('./AppContent'));

export default function App() {
  const [unlocked, setUnlocked] = useState(isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser());

  // Comprueba en segundo plano que la sesión guardada sigue siendo válida
  // en el servidor (por si el token fue revocado o la cuenta eliminada).
  useEffect(() => {
    if (!unlocked) return;
    api
      .fetchCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        clearSession();
        setUnlocked(false);
        setCurrentUser(null);
      });
  }, [unlocked]);

  const handleLogout = async () => {
    setUnlocked(false);
    setCurrentUser(null);
    try {
      await api.logout();
    } catch {
      // Si falla la llamada al servidor, la sesión local ya se limpió igualmente
    }
  };

  return (
    <I18nProvider>
      <LegalProvider>
        <CookieConsentProvider>
          {!unlocked || !currentUser ? (
            <AuthGate
              onAuthenticated={(user) => {
                setCurrentUser(user);
                setUnlocked(true);
              }}
            />
          ) : (
            <LightboxProvider>
              <Suspense fallback={<div className="min-h-dvh bg-slate-950" />}>
                <AppContent currentUser={currentUser} onLogout={handleLogout} />
              </Suspense>
            </LightboxProvider>
          )}
        </CookieConsentProvider>
      </LegalProvider>
    </I18nProvider>
  );
}
