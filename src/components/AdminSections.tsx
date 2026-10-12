import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Dumbbell, Image as ImageIcon, Bell, Sparkles, Activity } from 'lucide-react';
import * as api from '../api/client';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Las fechas de SQLite llegan en UTC sin zona ("2026-10-07 16:20:40"); las de los entrenamientos, en ISO
function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string | null, withTime = false): string {
  const d = toDate(value);
  if (!d) return '—';
  return withTime
    ? d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
}

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = () =>
    loader()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err?.message || 'No se pudo cargar'));
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { data, error, reload };
}

const ErrorBox = ({ text }: { text: string }) => (
  <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">{text}</div>
);
const Loading = () => <div className="p-8 text-center text-slate-500 text-sm">Cargando…</div>;

// --- Estadísticas ---

export function AdminStatsSection() {
  const { data, error } = useLoad(api.getAdminStats);
  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const tiles = [
    { icon: Users, label: 'Usuarios', value: data.users, sub: `${data.admins} administradores` },
    { icon: Activity, label: 'Activos', value: data.activeLast7, sub: `última semana · ${data.activeLast30} en 30 días` },
    { icon: Dumbbell, label: 'Entrenamientos', value: data.workouts, sub: `${data.workoutsLast30} en 30 días` },
    { icon: ImageIcon, label: 'Fotos y vídeos', value: data.mediaCount, sub: `${formatBytes(data.mediaDiskBytes)} en disco` },
    { icon: Bell, label: 'Avisos de descanso', value: data.pushDevices, sub: 'dispositivos activados' },
    { icon: Sparkles, label: 'Análisis del Coach IA', value: data.coachRunsLast30, sub: 'en 30 días' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <t.icon className="h-3.5 w-3.5 text-blue-400" />
              {t.label}
            </div>
            <div className="text-2xl font-black text-white mt-1">{t.value}</div>
            <div className="text-[11px] text-slate-500">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-800">
              <th className="p-3 font-bold">Usuario</th>
              <th className="p-3 font-bold">Último acceso</th>
              <th className="p-3 font-bold">Último entreno</th>
              <th className="p-3 font-bold text-right">Entrenos (30 d)</th>
              <th className="p-3 font-bold text-right">Fotos/vídeos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.perUser.map((u) => (
              <tr key={u.id} className="text-slate-300">
                <td className="p-3 font-bold text-slate-100 whitespace-nowrap">
                  {u.username}
                  {u.role === 'admin' && <span className="ml-1.5 text-[10px] text-amber-400">admin</span>}
                </td>
                <td className="p-3 whitespace-nowrap">{formatDate(u.lastLogin)}</td>
                <td className="p-3 whitespace-nowrap">{formatDate(u.lastWorkout)}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  {u.workouts} <span className="text-slate-500">({u.workoutsLast30})</span>
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  {u.mediaCount} {u.mediaBytes > 0 && <span className="text-slate-500">· {formatBytes(u.mediaBytes)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Registro de auditoría ---

const AUDIT_LABEL: Record<string, { label: string; color: string }> = {
  login: { label: 'Inicio de sesión', color: 'text-emerald-400' },
  login_failed: { label: 'Fallo al iniciar sesión', color: 'text-rose-400' },
  register: { label: 'Registro nuevo', color: 'text-blue-400' },
  passkey_added: { label: 'Face ID / huella activado', color: 'text-emerald-400' },
  passkey_removed: { label: 'Face ID / huella quitado', color: 'text-amber-400' },
  user_created: { label: 'Usuario creado', color: 'text-blue-400' },
  user_deleted: { label: 'Usuario eliminado', color: 'text-rose-400' },
  role_changed: { label: 'Cambio de rol', color: 'text-amber-400' },
  registration_toggled: { label: 'Registro abierto/cerrado', color: 'text-amber-400' },
  media_uploaded: { label: 'Foto/vídeo subido', color: 'text-slate-300' },
  media_deleted_by_admin: { label: 'Foto/vídeo retirado', color: 'text-rose-400' },
  coach_config: { label: 'Configuración del Coach IA', color: 'text-purple-400' },
};

export function AdminAuditSection() {
  const { data, error } = useLoad(api.getAuditLog);
  const [filter, setFilter] = useState('');
  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const entries = filter ? data.filter((e) => e.action === filter) : data;

  return (
    <div className="space-y-4">
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200"
      >
        <option value="">Todos los eventos</option>
        {Object.entries(AUDIT_LABEL).map(([action, meta]) => (
          <option key={action} value={action}>
            {meta.label}
          </option>
        ))}
      </select>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 divide-y divide-slate-800">
        {entries.length === 0 && <div className="p-6 text-center text-slate-500 text-sm">Sin eventos.</div>}
        {entries.map((e) => {
          const meta = AUDIT_LABEL[e.action] ?? { label: e.action, color: 'text-slate-300' };
          return (
            <div key={e.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs">
              <span className="text-slate-500 whitespace-nowrap sm:w-32 shrink-0">{formatDate(e.created_at, true)}</span>
              <span className={`font-bold sm:w-48 shrink-0 ${meta.color}`}>{meta.label}</span>
              <span className="text-slate-200 font-semibold">{e.username ?? '—'}</span>
              {e.detail && <span className="text-slate-400 truncate">{e.detail}</span>}
              <span className="sm:ml-auto text-[10px] text-slate-600 whitespace-nowrap">IP {e.ip}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">Se guardan los últimos 180 días.</p>
    </div>
  );
}

// --- Ajustes ---

export function AdminSettingsSection() {
  const { data, error, reload } = useLoad(api.getAdminSettings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  if (error) return <ErrorBox text={error} />;
  if (!data) return <Loading />;

  const toggle = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.saveAdminSettings({ registrationEnabled: !data.registrationEnabled });
      await reload();
    } catch (err: any) {
      setSaveError(err?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-4">
        <UserPlus className="h-5 w-5 text-blue-400 shrink-0" />
        <div className="flex-1">
          <div className="font-bold text-slate-100 text-sm">Registro de nuevos usuarios</div>
          <div className="text-xs text-slate-400">
            {data.registrationEnabled
              ? 'Abierto: cualquiera puede crearse una cuenta desde la pantalla de acceso.'
              : 'Cerrado: solo un administrador puede crear cuentas desde la lista de usuarios.'}
          </div>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer disabled:opacity-50 ${
            data.registrationEnabled
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-950 border-slate-700 text-slate-300'
          }`}
        >
          {data.registrationEnabled ? 'Abierto' : 'Cerrado'}
        </button>
      </div>
      {saveError && <ErrorBox text={saveError} />}
    </div>
  );
}
