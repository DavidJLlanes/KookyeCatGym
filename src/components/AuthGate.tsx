import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, User as UserIcon, Check, Fingerprint } from 'lucide-react';
import * as api from '../api/client';
import { AuthUser } from '../auth';
import { useLegal } from '../context/LegalContext';
import LegalFooterLinks from './legal/LegalFooterLinks';
import { PasskeyOffer } from './PasskeySection';
import {
  biometricLabel,
  isPasskeyAvailable,
  loginWithPasskey,
  markPasskeyOfferDone,
  passkeyOfferDone,
  preparePasskeyLogin,
  PasskeyLoginOptions,
} from '../utils/passkey';

interface AuthGateProps {
  onAuthenticated: (user: AuthUser) => void;
}

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const { openLegal } = useLegal();
  // Si el registro está abierto se decide en el panel de administración
  // (Usuarios → Ajustes). Esto solo muestra u oculta la interfaz; el bloqueo
  // real está en el servidor (auth.php). Mientras no responde, cerrado.
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  useEffect(() => {
    api.getRegistrationStatus().then(setRegistrationEnabled).catch(() => {});
  }, []);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Face ID / huella (passkeys). El reto se pide por adelantado: Safari solo
  // deja pedir la cara/huella justo al tocar el botón (ver utils/passkey.ts).
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [passkeyOptions, setPasskeyOptions] = useState<PasskeyLoginOptions | null>(null);
  const [offerUser, setOfferUser] = useState<AuthUser | null>(null);
  const refreshPasskeyOptions = () => {
    preparePasskeyLogin().then(setPasskeyOptions).catch(() => setPasskeyOptions(null));
  };
  useEffect(() => {
    let timer = 0;
    isPasskeyAvailable().then((ok) => {
      setPasskeyAvailable(ok);
      if (!ok) return;
      refreshPasskeyOptions();
      timer = window.setInterval(refreshPasskeyOptions, 240_000);
    });
    return () => window.clearInterval(timer);
  }, []);

  // Tras entrar con contraseña se ofrece (una vez por dispositivo) activar la cara/huella
  const finishLogin = (user: AuthUser) => {
    if (passkeyAvailable && !passkeyOfferDone(user.id)) setOfferUser(user);
    else onAuthenticated(user);
  };

  const handlePasskeyLogin = async () => {
    if (!passkeyOptions) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await loginWithPasskey(passkeyOptions);
      markPasskeyOfferDone(user.id);
      onAuthenticated(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión');
      refreshPasskeyOptions();
    } finally {
      setSubmitting(false);
    }
  };

  // Login
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registro
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    if (next === 'register' && !registrationEnabled) return;
    setMode(next);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await api.login(identifier.trim(), loginPassword);
      finishLogin(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (regPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!acceptedLegal) {
      setError('Debes aceptar la Política de Privacidad y los Términos y Condiciones');
      return;
    }

    setSubmitting(true);
    try {
      const user = await api.register(username.trim(), email.trim(), regPassword);
      finishLogin(user);
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-dvh bg-slate-950 flex items-center justify-center p-4"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src="/icon-192.png" alt="KookyeCatGym" className="h-14 w-14 rounded-2xl shadow-lg shadow-blue-500/20 mb-4" />
          <div className="flex items-center gap-2">
            <span className="font-black text-white tracking-tight text-2xl">KookyeCatGym</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30">
              Beta
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Selector Iniciar sesión / Registrarse. Con el registro
              deshabilitado solo hay una opción, así que no se muestra el selector. */}
          {registrationEnabled && !offerUser && (
            <div className="flex p-1.5 gap-1.5 bg-slate-950 border-b border-slate-850">
              <button
                id="tab-switch-login"
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                id="tab-switch-register"
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === 'register' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Crear cuenta
              </button>
            </div>
          )}

          <div className="p-6">
            <AnimatePresence mode="wait">
              {offerUser ? (
                <motion.div key="passkey-offer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PasskeyOffer userId={offerUser.id} onDone={() => onAuthenticated(offerUser)} />
                </motion.div>
              ) : mode === 'login' || !registrationEnabled ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <UserIcon className="h-3.5 w-3.5" />
                      Usuario o correo electrónico
                    </label>
                    <input
                      id="input-login-identifier"
                      type="text"
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="tu_usuario"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Lock className="h-3.5 w-3.5" />
                      Contraseña
                    </label>
                    <input
                      id="input-login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={submitting || !identifier || !loginPassword}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer"
                  >
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </button>

                  {passkeyAvailable && (
                    <>
                      <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <span className="flex-1 h-px bg-slate-800" />o<span className="flex-1 h-px bg-slate-800" />
                      </div>
                      <button
                        id="btn-login-passkey"
                        type="button"
                        onClick={handlePasskeyLogin}
                        disabled={submitting || !passkeyOptions}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 font-semibold py-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Fingerprint className="h-4.5 w-4.5 text-blue-400" />
                        Entrar con {biometricLabel()}
                      </button>
                    </>
                  )}
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <UserIcon className="h-3.5 w-3.5" />
                      Nombre de usuario
                    </label>
                    <input
                      id="input-register-username"
                      type="text"
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="tu_usuario"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Mail className="h-3.5 w-3.5" />
                      Correo electrónico
                    </label>
                    <input
                      id="input-register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Lock className="h-3.5 w-3.5" />
                      Contraseña
                    </label>
                    <input
                      id="input-register-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Lock className="h-3.5 w-3.5" />
                      Repite la contraseña
                    </label>
                    <input
                      id="input-register-password-confirm"
                      type="password"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-lg px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-start gap-2.5">
                    <button
                      id="btn-accept-legal-checkbox"
                      type="button"
                      onClick={() => setAcceptedLegal((v) => !v)}
                      aria-pressed={acceptedLegal}
                      className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        acceptedLegal ? 'bg-blue-600 border-blue-500' : 'bg-slate-950 border-slate-700'
                      }`}
                    >
                      {acceptedLegal && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                    {/* Clic en cualquier parte del texto marca la casilla; los
                        enlaces internos detienen la propagación para abrir
                        el documento legal sin alternar la aceptación. */}
                    <span
                      onClick={() => setAcceptedLegal((v) => !v)}
                      className="text-xs text-slate-400 leading-relaxed cursor-pointer select-none"
                    >
                      He leído y acepto la{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLegal('privacidad');
                        }}
                        className="underline text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Política de Privacidad
                      </button>{' '}
                      y los{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLegal('terminos');
                        }}
                        className="underline text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Términos y Condiciones
                      </button>
                      .
                    </span>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={submitting || !username || !email || !regPassword || !regPasswordConfirm}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors cursor-pointer"
                  >
                    {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        <LegalFooterLinks className="mt-6" />
      </motion.div>
    </div>
  );
}
