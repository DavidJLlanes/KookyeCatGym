import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, ShieldCheck, Shield, X, Mail, User as UserIcon, Lock, BarChart3, ScrollText, Settings } from 'lucide-react';
import * as api from '../api/client';
import { AdminUserRow } from '../api/client';
import { AuthUser } from '../auth';
import { Exercise } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { AdminStatsSection, AdminAuditSection, AdminSettingsSection } from './AdminSections';

interface UserManagementPanelProps {
  currentUser: AuthUser;
  exercises?: Exercise[];
}

type AdminTab = 'users' | 'stats' | 'audit' | 'settings';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'audit', label: 'Auditoría', icon: ScrollText },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function UserManagementPanel({ currentUser, exercises = [] }: UserManagementPanelProps) {
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await api.adminCreateUser(newUsername.trim(), newEmail.trim(), newPassword, newRole);
      setShowCreateModal(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'No se pudo crear el usuario');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRole = (user: AdminUserRow) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const isSelf = user.id === currentUser.id;
    setConfirmConfig({
      isOpen: true,
      title: nextRole === 'admin' ? 'Hacer administrador' : 'Quitar permisos de administrador',
      message:
        nextRole === 'admin'
          ? `${user.username} podrá gestionar usuarios igual que tú.`
          : isSelf
          ? 'No puedes quitarte a ti mismo el rol de administrador.'
          : `${user.username} dejará de poder gestionar usuarios.`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        if (isSelf && nextRole !== 'admin') return;
        try {
          await api.adminSetUserRole(user.id, nextRole);
          await loadUsers();
        } catch (err: any) {
          setError(err.message || 'No se pudo cambiar el rol');
        }
      },
    });
  };

  const handleDelete = (user: AdminUserRow) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Eliminar usuario',
      message: `Se eliminará la cuenta "${user.username}" y todos sus datos (rutinas, entrenamientos e historial). Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminDeleteUser(user.id);
          await loadUsers();
        } catch (err: any) {
          setError(err.message || 'No se pudo eliminar el usuario');
        }
      },
    });
  };

  return (
    <div id="user-management-panel" className="space-y-6 text-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-400">Administra quién tiene acceso a KookyeCatGym y con qué rol.</p>
        </div>
        {tab === 'users' && (
          <button
            id="btn-create-user"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            Crear Usuario
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors cursor-pointer ${
              tab === t.id
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <AdminStatsSection />}
      {tab === 'audit' && <AdminAuditSection />}
      {tab === 'settings' && <AdminSettingsSection />}

      {tab === 'users' && error && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">{error}</div>
      )}

      {tab === 'users' && (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Cargando usuarios...</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {users.map((user) => {
              const isSelf = user.id === currentUser.id;
              const isAdmin = user.role === 'admin';
              return (
                <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-100 truncate">{user.username}</h3>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 border border-slate-700">
                          Tú
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          isAdmin
                            ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                            : 'text-slate-400 bg-slate-800 border border-slate-700'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {isAdmin ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Registrado el{' '}
                      {new Date(user.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleRole(user)}
                      disabled={isSelf && isAdmin}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-800 whitespace-nowrap"
                    >
                      {isAdmin ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={isSelf}
                      className="p-2 bg-slate-950 hover:bg-rose-950/30 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer border border-slate-800"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No hay usuarios todavía.</div>
            )}
          </div>
        )}
      </div>
      )}

      {/* MODAL: Crear usuario */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-800"
            >
              <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-400 shrink-0" />
                  Crear Usuario
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3" />
                    Nombre de usuario
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-650"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rol</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRole('user')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        newRole === 'user'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Usuario
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRole('admin')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        newRole === 'admin'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Administrador
                    </button>
                  </div>
                </div>

                {createError && <p className="text-rose-400 text-xs">{createError}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newUsername || !newEmail || !newPassword}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-900 disabled:text-slate-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                  >
                    {creating ? 'Creando...' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type="danger"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
