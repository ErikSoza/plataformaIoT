import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { authService, alertaService, stationService, ReglaAlerta, VariableAlerta, CondicionAlerta, NivelAlerta } from '../services/api';
import { ContentSection } from '../components/layout';

interface ProfileFormData {
  nombre: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface DeleteFormData {
  password: string;
}

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  fecha_registro: string;
}

interface UserFormData {
  nombre: string;
  email: string;
  rol: 'admin' | 'usuario';
  password?: string;
  confirmPassword?: string;
}

// ── Constantes para sección Alertas ──────────────────────────────────────────
const VARIABLES_ALERTA: { value: VariableAlerta; label: string; unit: string }[] = [
  { value: 'temperatura',      label: 'Temperatura',      unit: '°C'  },
  { value: 'humedad',          label: 'Humedad',          unit: '%'   },
  { value: 'presion_at',       label: 'Presión Atm.',     unit: 'hPa' },
  { value: 'velocidad_viento', label: 'Vel. Viento',      unit: 'm/s' },
  { value: 'gas_co2',          label: 'CO₂',              unit: 'ppm' },
  { value: 'gas_nh3',          label: 'NH₃',              unit: 'ppm' },
  { value: 'gas_alcohol',      label: 'Alcohol',          unit: 'ppm' },
  { value: 'gas_humo',         label: 'Humo',             unit: 'ppm' },
  { value: 'gas_benceno',      label: 'Benceno',          unit: 'ppm' },
  { value: 'gas_acetona',      label: 'Acetona',          unit: 'ppm' },
];
const CONDICIONES_ALERTA: { value: CondicionAlerta; label: string }[] = [
  { value: '>',  label: 'Mayor que (>)'          },
  { value: '<',  label: 'Menor que (<)'          },
  { value: '>=', label: 'Mayor o igual (>=)' },
  { value: '<=', label: 'Menor o igual (<=)' },
];
const NIVELES_ALERTA: { value: NivelAlerta; label: string; color: string }[] = [
  { value: 'info',        label: 'Informativo', color: '#1976d2' },
  { value: 'advertencia', label: 'Advertencia', color: '#f9a825' },
  { value: 'critico',     label: 'Crítico',     color: '#c62828' },
];
const NIVEL_ICONS: Record<NivelAlerta, string> = {
  info: 'ℹ️', advertencia: '⚠️', critico: '🚨',
};
const ALERTA_FORM_INICIAL = {
  id_estacion: 0,
  variable: 'temperatura' as VariableAlerta,
  condicion: '>' as CondicionAlerta,
  umbral: '',
  nivel: 'advertencia' as NivelAlerta,
  nombre: '',
};

const ConfiguracionPagina: React.FC = () => {
  const { user, token, updateUser, logout } = useAuth();
  const { pendingSection, clearPending } = useNavigation();
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'danger' | 'users' | 'alertas'>('profile');

  // Reaccionar a navegación desde AlertBell
  useEffect(() => {
    if (pendingSection === 'alertas') {
      setActiveSection('alertas');
      clearPending();
    }
  }, [pendingSection, clearPending]);

  // Estados para sección de alertas
  const [reglas, setReglas] = useState<ReglaAlerta[]>([]);
  const [estaciones, setEstaciones] = useState<{ id: number; nombre: string }[]>([]);
  const [alertaForm, setAlertaForm] = useState(ALERTA_FORM_INICIAL);
  const [alertaSaving, setAlertaSaving] = useState(false);
  const [alertaError, setAlertaError] = useState('');
  const [alertaSuccess, setAlertaSuccess] = useState('');
  const [alertasLoading, setAlertasLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para gestión personal
  const [profileData, setProfileData] = useState<ProfileFormData>({
    nombre: user?.nombre || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [deleteData, setDeleteData] = useState<DeleteFormData>({
    password: ''
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estados para gestión de usuarios (solo admin)
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    nombre: '',
    email: '',
    rol: 'usuario',
    password: '',
    confirmPassword: ''
  });
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        nombre: user.nombre,
        email: user.email
      }));
    }
  }, [user]);

  // Cargar usuarios cuando es admin y se selecciona la pestaña
  useEffect(() => {
    if (user?.rol === 'admin' && activeSection === 'users' && token) {
      loadUsers();
    }
  }, [user, activeSection, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar datos para alertas
  useEffect(() => {
    if (activeSection === 'alertas') {
      loadAlertasData();
    }
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAlertasData = async () => {
    setAlertasLoading(true);
    try {
      const [reglasData, estData] = await Promise.all([
        alertaService.getReglas(),
        stationService.getAll(),
      ]);
      setReglas(reglasData);
      setEstaciones(estData);
      if (estData.length > 0 && alertaForm.id_estacion === 0) {
        setAlertaForm(f => ({ ...f, id_estacion: estData[0].id }));
      }
    } catch (err: any) {
      setAlertaError(err.message || 'Error al cargar datos de alertas');
    } finally {
      setAlertasLoading(false);
    }
  };

  const handleCrearRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertaError('');
    setAlertaSuccess('');
    if (!alertaForm.id_estacion) { setAlertaError('Selecciona una estación'); return; }
    if (!alertaForm.umbral || isNaN(Number(alertaForm.umbral))) { setAlertaError('Ingresa un umbral numérico válido'); return; }
    setAlertaSaving(true);
    try {
      await alertaService.createRegla({
        id_estacion: alertaForm.id_estacion,
        id_usuario: user!.id,
        variable: alertaForm.variable,
        condicion: alertaForm.condicion,
        umbral: Number(alertaForm.umbral),
        nivel: alertaForm.nivel,
        nombre: alertaForm.nombre || undefined,
      });
      setAlertaSuccess('Regla creada correctamente');
      setAlertaForm(f => ({ ...ALERTA_FORM_INICIAL, id_estacion: f.id_estacion }));
      const updated = await alertaService.getReglas();
      setReglas(updated);
      setTimeout(() => setAlertaSuccess(''), 4000);
    } catch (err: any) {
      setAlertaError(err.message || 'Error al guardar la regla');
    } finally {
      setAlertaSaving(false);
    }
  };

  const handleEliminarRegla = async (id: number) => {
    if (!window.confirm('¿Eliminar esta regla de alerta?')) return;
    try {
      await alertaService.deleteRegla(id);
      setReglas(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setAlertaError(err.message || 'Error al eliminar');
    }
  };

  const handleToggleRegla = async (id: number) => {
    try {
      await alertaService.toggleRegla(id);
      setReglas(prev => prev.map(r => r.id === id ? { ...r, activa: r.activa ? 0 : 1 } : r));
    } catch (err: any) {
      setAlertaError(err.message || 'Error al cambiar estado');
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await authService.getAllUsers(token);
      setUsers(response);
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ==================== GESTIÓN DE USUARIOS (Solo Admin) ====================

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (userFormData.password !== userFormData.confirmPassword) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await authService.createUser(token, {
        nombre: userFormData.nombre,
        email: userFormData.email,
        contrasena: userFormData.password!,
        rol: userFormData.rol
      });
      
      showMessage('success', 'Usuario creado exitosamente');
      setShowUserForm(false);
      setUserFormData({ nombre: '', email: '', rol: 'usuario', password: '', confirmPassword: '' });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;

    setIsLoading(true);
    try {
      const updateData: any = {
        nombre: userFormData.nombre,
        email: userFormData.email,
        rol: userFormData.rol
      };

      if (userFormData.password) {
        if (userFormData.password !== userFormData.confirmPassword) {
          showMessage('error', 'Las contraseñas no coinciden');
          return;
        }
        updateData.newPassword = userFormData.password;
      }

      await authService.updateUser(token, editingUser.id, updateData);
      
      showMessage('success', 'Usuario actualizado exitosamente');
      setEditingUser(null);
      setShowUserForm(false);
      setUserFormData({ nombre: '', email: '', rol: 'usuario', password: '', confirmPassword: '' });
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!token) return;

    setIsLoading(true);
    try {
      await authService.deleteUser(token, userId);
      showMessage('success', 'Usuario eliminado exitosamente');
      setShowDeleteUserConfirm(null);
      loadUsers();
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al eliminar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      password: '',
      confirmPassword: ''
    });
    setShowUserForm(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserFormData({ nombre: '', email: '', rol: 'usuario', password: '', confirmPassword: '' });
    setShowUserForm(true);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    try {
      const updateData: any = {
        nombre: profileData.nombre.trim(),
        email: user?.email || '' // Usar email original ya que no se puede cambiar
      };

      // Si se está cambiando la contraseña
      if (profileData.newPassword) {
        if (profileData.newPassword !== profileData.confirmNewPassword) {
          showMessage('error', 'Las contraseñas nuevas no coinciden');
          return;
        }
        
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
        updateData.confirmNewPassword = profileData.confirmNewPassword;
      }

      const response = await authService.updateProfile(token, updateData);
      
      if (response.success) {
        updateUser(response.user);
        showMessage('success', 'Perfil actualizado exitosamente');
        
        // Limpiar campos de contraseña
        setProfileData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        }));
        
        if (activeSection === 'password') {
          setActiveSection('profile');
        }
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token || !deleteData.password) return;

    setIsLoading(true);
    try {
      const response = await authService.deleteAccount(token, deleteData.password);
      
      if (response.success) {
        showMessage('success', 'Cuenta eliminada exitosamente. Redirigiendo...');
        setTimeout(() => {
          logout();
        }, 2000);
      }
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Error al eliminar la cuenta');
      setShowDeleteConfirm(false);
      setDeleteData({ password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <ContentSection title="⚙️ Configuración de Cuenta">
        <div style={styles.container}>
          <div style={styles.errorMessage}>
            Error: Usuario no autenticado
          </div>
        </div>
      </ContentSection>
    );
  }

  return (
    <ContentSection title="⚙️ Configuración de Cuenta">
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOut {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
      <div style={styles.container}>
        {message && (
          <div style={{
            ...styles.toast,
            ...(message.type === 'success' ? styles.toastSuccess : styles.toastError)
          }}>
            <div style={styles.toastContent}>
              <span style={styles.toastIcon}>
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              <span>{message.text}</span>
              <button 
                style={styles.toastClose}
                onClick={() => setMessage(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3>{user.nombre}</h3>
            <p style={styles.userEmail}>{user.email}</p>
            <span style={styles.userRole}>
              {user.rol === 'admin' ? '👑 Administrador' : '👤 Usuario'}
            </span>
          </div>
        </div>

        <div style={styles.tabContainer}>
          <button
            style={activeSection === 'profile' ? styles.tabActive : styles.tab}
            onClick={() => setActiveSection('profile')}
          >
            👤 Información Personal
          </button>
          <button
            style={activeSection === 'password' ? styles.tabActive : styles.tab}
            onClick={() => setActiveSection('password')}
          >
            🔒 Cambiar Contraseña
          </button>
          {user.rol === 'admin' && (
            <button
              style={activeSection === 'users' ? styles.tabActive : styles.tab}
              onClick={() => setActiveSection('users')}
            >
              👥 Gestión de Usuarios
            </button>
          )}
          <button
            style={activeSection === 'alertas' ? styles.tabActive : styles.tab}
            onClick={() => setActiveSection('alertas')}
          >
            🔔 Alertas
          </button>
          <button
            style={activeSection === 'danger' ? styles.tabActive : styles.tab}
            onClick={() => setActiveSection('danger')}
          >
            ⚠️ Zona de Peligro
          </button>
        </div>

        <form onSubmit={handleProfileUpdate} style={styles.form}>
          {activeSection === 'profile' && (
            <div style={styles.section}>
              <h4>📝 Información Personal</h4>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nombre completo</label>
                <input
                  type="text"
                  style={styles.input}
                  value={profileData.nombre}
                  onChange={(e) => setProfileData(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Correo electrónico</label>
                <input
                  type="email"
                  style={styles.inputReadonly}
                  value={user?.email || ''}
                  readOnly
                  title="El correo electrónico no se puede modificar"
                />
              </div>
              <button
                type="submit"
                style={isLoading ? styles.buttonDisabled : styles.button}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          )}

          {activeSection === 'password' && (
            <div style={styles.section}>
              <h4>🔐 Cambiar Contraseña</h4>
              <div style={styles.formGroup}>
                <label style={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  style={styles.input}
                  value={profileData.currentPassword}
                  onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  style={styles.input}
                  value={profileData.newPassword}
                  onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  style={styles.input}
                  value={profileData.confirmNewPassword}
                  onChange={(e) => setProfileData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                style={isLoading ? styles.buttonDisabled : styles.button}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Cambiando...' : '🔒 Cambiar Contraseña'}
              </button>
            </div>
          )}
        </form>

        {activeSection === 'danger' && (
          <div style={styles.dangerSection}>
            <h4>⚠️ Eliminar Cuenta</h4>
            <div style={styles.warningBox}>
              <p><strong>¡Advertencia!</strong></p>
              <p>Esta acción no se puede deshacer. Se eliminarán permanentemente:</p>
              <ul>
                <li>Tu cuenta de usuario</li>
                <li>Tu acceso a la plataforma</li>
                <li>Todos los datos asociados a tu cuenta</li>
              </ul>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                style={styles.dangerButton}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                🗑️ Eliminar mi cuenta
              </button>
            ) : (
              <div style={styles.confirmDelete}>
                <p><strong>Para confirmar, ingresa tu contraseña:</strong></p>
                <input
                  type="password"
                  style={styles.input}
                  placeholder="Tu contraseña actual"
                  value={deleteData.password}
                  onChange={(e) => setDeleteData({ password: e.target.value })}
                  disabled={isLoading}
                />
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteData({ password: '' });
                    }}
                    disabled={isLoading}
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    type="button"
                    style={isLoading ? styles.buttonDisabled : styles.dangerButton}
                    onClick={handleDeleteAccount}
                    disabled={isLoading || !deleteData.password}
                  >
                    {isLoading ? '⏳ Eliminando...' : '🗑️ Confirmar Eliminación'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sección de Alertas ─────────────────────────────────────────── */}
        {activeSection === 'alertas' && (
          <div style={styles.usersSection}>
            <h4 style={{ marginTop: 0, marginBottom: '4px' }}>🔔 Reglas de Alerta</h4>
            <p style={{ color: '#6c757d', fontSize: '14px', marginTop: 0, marginBottom: '24px' }}>
              Define umbrales para cualquier variable meteorológica. Cuando una lectura supere el umbral configurado,
              aparecerá una notificación en la campana de alertas.
            </p>

            {alertaError && (
              <div style={{ ...styles.errorMessage, marginBottom: '16px' }}>
                ❌ {alertaError}
              </div>
            )}
            {alertaSuccess && (
              <div style={{ ...styles.successMessage, marginBottom: '16px' }}>
                ✅ {alertaSuccess}
              </div>
            )}

            {/* Formulario nueva regla */}
            <div style={alertaStyles.formCard}>
              <h5 style={alertaStyles.subTitle}>➕ Nueva Regla</h5>
              <form onSubmit={handleCrearRegla}>
                <div style={alertaStyles.row}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Estación</label>
                    <select
                      style={styles.input}
                      value={alertaForm.id_estacion}
                      onChange={e => setAlertaForm(f => ({ ...f, id_estacion: Number(e.target.value) }))}
                      disabled={alertasLoading}
                    >
                      {estaciones.length === 0 && <option value={0}>Cargando…</option>}
                      {estaciones.map(est => (
                        <option key={est.id} value={est.id}>{est.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Variable</label>
                    <select
                      style={styles.input}
                      value={alertaForm.variable}
                      onChange={e => setAlertaForm(f => ({ ...f, variable: e.target.value as VariableAlerta }))}
                    >
                      {VARIABLES_ALERTA.map(v => (
                        <option key={v.value} value={v.value}>{v.label} ({v.unit})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={alertaStyles.row}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Condición</label>
                    <select
                      style={styles.input}
                      value={alertaForm.condicion}
                      onChange={e => setAlertaForm(f => ({ ...f, condicion: e.target.value as CondicionAlerta }))}
                    >
                      {CONDICIONES_ALERTA.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>
                      Umbral ({VARIABLES_ALERTA.find(v => v.value === alertaForm.variable)?.unit})
                    </label>
                    <input
                      type="number"
                      step="any"
                      style={styles.input}
                      placeholder="ej: 35"
                      value={alertaForm.umbral}
                      onChange={e => setAlertaForm(f => ({ ...f, umbral: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Severidad</label>
                  <div style={alertaStyles.nivelRow}>
                    {NIVELES_ALERTA.map(n => (
                      <button
                        key={n.value}
                        type="button"
                        style={{
                          ...alertaStyles.nivelBtn,
                          borderColor: alertaForm.nivel === n.value ? n.color : '#e0e0e0',
                          background: alertaForm.nivel === n.value ? n.color + '18' : '#fafafa',
                          color: alertaForm.nivel === n.value ? n.color : '#555',
                          fontWeight: alertaForm.nivel === n.value ? 700 : 400,
                        }}
                        onClick={() => setAlertaForm(f => ({ ...f, nivel: n.value }))}
                      >
                        {NIVEL_ICONS[n.value]} {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nombre descriptivo (opcional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="ej: Temperatura alta verano"
                    value={alertaForm.nombre}
                    onChange={e => setAlertaForm(f => ({ ...f, nombre: e.target.value }))}
                    maxLength={100}
                  />
                </div>

                <button
                  type="submit"
                  style={alertaSaving ? styles.buttonDisabled : styles.button}
                  disabled={alertaSaving || alertasLoading}
                >
                  {alertaSaving ? '⏳ Guardando...' : '💾 Guardar Regla'}
                </button>
              </form>
            </div>

            {/* Lista de reglas existentes */}
            <div style={{ marginTop: '28px' }}>
              <h5 style={alertaStyles.subTitle}>
                Reglas configuradas ({reglas.length})
              </h5>
              {alertasLoading ? (
                <div style={styles.loadingMessage}>⏳ Cargando reglas…</div>
              ) : reglas.length === 0 ? (
                <div style={styles.emptyMessage}>No hay reglas configuradas aún.</div>
              ) : (
                <div style={alertaStyles.reglasList}>
                  {reglas.map(regla => {
                    const varInfo = VARIABLES_ALERTA.find(v => v.value === regla.variable);
                    const nivelInfo = NIVELES_ALERTA.find(n => n.value === regla.nivel);
                    return (
                      <div
                        key={regla.id}
                        style={{ ...alertaStyles.reglaItem, opacity: regla.activa ? 1 : 0.55 }}
                      >
                        <span style={{ fontSize: '18px' }}>{NIVEL_ICONS[regla.nivel]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={alertaStyles.reglaTitle}>
                            {regla.nombre || `${regla.estacion_nombre} — ${varInfo?.label}`}
                          </div>
                          <div style={alertaStyles.reglaSub}>
                            <span style={alertaStyles.tag}>{regla.estacion_nombre}</span>
                            <span>
                              {varInfo?.label} <strong>{regla.condicion} {regla.umbral} {varInfo?.unit}</strong>
                            </span>
                            <span style={{ ...alertaStyles.tag, background: (nivelInfo?.color ?? '#eee') + '22', color: nivelInfo?.color }}>
                              {nivelInfo?.label}
                            </span>
                            <span style={{ ...alertaStyles.tag, background: regla.activa ? '#e8f5e9' : '#f5f5f5', color: regla.activa ? '#388e3c' : '#999' }}>
                              {regla.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            style={{ ...alertaStyles.iconBtn, background: regla.activa ? '#e8f5e9' : '#f5f5f5', color: regla.activa ? '#388e3c' : '#999' }}
                            onClick={() => handleToggleRegla(regla.id)}
                            title={regla.activa ? 'Desactivar' : 'Activar'}
                          >
                            {regla.activa ? '✓ Activa' : '○ Inactiva'}
                          </button>
                          <button
                            style={{ ...alertaStyles.iconBtn, background: '#ffebee', color: '#c62828' }}
                            onClick={() => handleEliminarRegla(regla.id)}
                            title="Eliminar regla"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sección de Gestión de Usuarios (Solo Admin) */}
        {user.rol === 'admin' && activeSection === 'users' && (
          <div style={styles.usersSection}>
            <div style={styles.sectionHeader}>
              <h4>👥 Gestión de Usuarios</h4>
              <button
                type="button"
                style={styles.button}
                onClick={openCreateUser}
                disabled={isLoading}
              >
                ➕ Nuevo Usuario
              </button>
            </div>

            {isLoading && !showUserForm && (
              <div style={styles.loadingMessage}>
                ⏳ Cargando usuarios...
              </div>
            )}

            {!isLoading && users.length === 0 && !showUserForm && (
              <div style={styles.emptyMessage}>
                👥 No hay usuarios registrados
              </div>
            )}

            {users.length > 0 && !showUserForm && (
              <div style={styles.usersGrid}>
                {users.map((userData) => (
                  <div key={userData.id} style={styles.userCard}>
                    <div style={styles.userCardHeader}>
                      <div style={styles.userAvatar}>
                        {userData.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div style={styles.userCardInfo}>
                        <h5>{userData.nombre}</h5>
                        <p>{userData.email}</p>
                        <span style={userData.rol === 'admin' ? styles.adminBadge : styles.userBadge}>
                          {userData.rol === 'admin' ? '👑 Admin' : '👤 Usuario'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.userCardActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => openEditUser(userData)}
                        disabled={isLoading}
                      >
                        ✏️ Editar
                      </button>
                      {userData.id !== user.id && (
                        <button
                          style={styles.deleteButton}
                          onClick={() => setShowDeleteUserConfirm(userData.id)}
                          disabled={isLoading}
                        >
                          🗑️ Eliminar
                        </button>
                      )}
                    </div>

                    {/* Confirmación de eliminación */}
                    {showDeleteUserConfirm === userData.id && (
                      <div style={styles.confirmDeleteUser}>
                        <p>¿Eliminar a <strong>{userData.nombre}</strong>?</p>
                        <div style={styles.buttonGroup}>
                          <button
                            style={styles.cancelButton}
                            onClick={() => setShowDeleteUserConfirm(null)}
                            disabled={isLoading}
                          >
                            ❌ Cancelar
                          </button>
                          <button
                            style={isLoading ? styles.buttonDisabled : styles.dangerButton}
                            onClick={() => handleDeleteUser(userData.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? '⏳ Eliminando...' : '🗑️ Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para crear/editar usuario */}
            {showUserForm && (
              <div style={styles.userForm}>
                <div style={styles.formHeader}>
                  <h5>{editingUser ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}</h5>
                  <button
                    type="button"
                    style={styles.closeButton}
                    onClick={() => {
                      setShowUserForm(false);
                      setEditingUser(null);
                      setUserFormData({ nombre: '', email: '', rol: 'usuario', password: '', confirmPassword: '' });
                    }}
                    disabled={isLoading}
                  >
                    ✖️
                  </button>
                </div>

                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Nombre completo</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={userFormData.nombre}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Correo electrónico</label>
                    <input
                      type="email"
                      style={styles.input}
                      value={userFormData.email}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rol</label>
                    <select
                      style={styles.input}
                      value={userFormData.rol}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, rol: e.target.value as 'admin' | 'usuario' }))}
                      disabled={isLoading}
                    >
                      <option value="usuario">👤 Usuario</option>
                      <option value="admin">👑 Administrador</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      {editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                    </label>
                    <input
                      type="password"
                      style={styles.input}
                      value={userFormData.password}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                      required={!editingUser}
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirmar contraseña</label>
                    <input
                      type="password"
                      style={styles.input}
                      value={userFormData.confirmPassword}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required={!editingUser || !!userFormData.password}
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>

                  <div style={styles.buttonGroup}>
                    <button
                      type="button"
                      style={styles.cancelButton}
                      onClick={() => {
                        setShowUserForm(false);
                        setEditingUser(null);
                        setUserFormData({ nombre: '', email: '', rol: 'usuario', password: '', confirmPassword: '' });
                      }}
                      disabled={isLoading}
                    >
                      ❌ Cancelar
                    </button>
                    <button
                      type="submit"
                      style={isLoading ? styles.buttonDisabled : styles.button}
                      disabled={isLoading}
                    >
                      {isLoading 
                        ? '⏳ Procesando...' 
                        : editingUser 
                        ? '💾 Actualizar Usuario' 
                        : '➕ Crear Usuario'
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </ContentSection>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
    marginBottom: '30px',
  },

  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'white',
  },

  userEmail: {
    margin: '5px 0',
    color: '#6c757d',
  },

  userRole: {
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '500',
  },

  tabContainer: {
    display: 'flex',
    marginBottom: '30px',
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '5px',
  },

  tab: {
    flex: 1,
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#6c757d',
    transition: 'all 0.3s ease',
  },

  tabActive: {
    flex: 1,
    padding: '12px 20px',
    background: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#00BCD4',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },

  form: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
  },

  section: {
    padding: '30px',
  },

  dangerSection: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #dc3545',
    padding: '30px',
  },

  formGroup: {
    marginBottom: '20px',
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#495057',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
  },

  button: {
    background: '#00BCD4',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },

  buttonDisabled: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'not-allowed',
  },

  dangerButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },

  cancelButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },

  warningBox: {
    background: '#fff3cd',
    border: '1px solid #ffecb5',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#856404',
  },

  confirmDelete: {
    marginTop: '20px',
  },

  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
  },

  inputReadonly: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '1rem',
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    cursor: 'not-allowed',
    boxSizing: 'border-box' as const,
  },

  helpText: {
    fontSize: '0.85rem',
    color: '#6c757d',
    marginTop: '5px',
    display: 'block',
  },

  toast: {
    position: 'fixed' as const,
    top: '80px',
    right: '20px',
    zIndex: 1000,
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    minWidth: '350px',
    maxWidth: '500px',
    animation: 'slideIn 0.3s ease-out',
  },

  toastSuccess: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: 'white',
  },

  toastError: {
    background: 'linear-gradient(135deg, #dc3545, #fd7e14)',
    color: 'white',
  },

  toastContent: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    gap: '12px',
  },

  toastIcon: {
    fontSize: '1.2rem',
    flexShrink: 0,
  },

  toastClose: {
    marginLeft: 'auto',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'inherit',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  successMessage: {
    background: '#d4edda',
    color: '#155724',
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #c3e6cb',
  },

  errorMessage: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
  },

  // ==================== ESTILOS GESTIÓN DE USUARIOS ====================

  usersSection: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
    padding: '30px',
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
  },

  loadingMessage: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6c757d',
    fontSize: '16px',
  },

  emptyMessage: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6c757d',
    fontSize: '16px',
  },

  usersGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  },

  userCard: {
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px',
    background: '#f8f9fa',
    position: 'relative' as const,
  },

  userCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
  },

  userAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    flexShrink: 0,
  },

  userCardInfo: {
    flex: 1,
  },

  adminBadge: {
    background: '#ffd700',
    color: '#856404',
    padding: '4px 10px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },

  userBadge: {
    background: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 10px',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },

  userCardActions: {
    display: 'flex',
    gap: '10px',
  },

  editButton: {
    background: '#007bff',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },

  deleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },

  confirmDeleteUser: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    textAlign: 'center' as const,
  },

  userForm: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '25px',
    border: '2px solid #e9ecef',
  },

  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
  },

  closeButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const alertaStyles: Record<string, React.CSSProperties> = {
  formCard: {
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '10px',
    padding: '20px 24px',
  },
  subTitle: {
    margin: '0 0 16px',
    fontSize: '15px',
    fontWeight: 700,
    color: '#333',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  nivelRow: {
    display: 'flex',
    gap: '10px',
  },
  nivelBtn: {
    flex: 1,
    padding: '9px 8px',
    borderRadius: '8px',
    border: '2px solid',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
  },
  reglasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  reglaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '10px',
    padding: '12px 16px',
    transition: 'opacity 0.2s',
  },
  reglaTitle: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#1a1a1a',
    marginBottom: '4px',
  },
  reglaSub: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: '#444',
  },
  tag: {
    background: '#f0f0f0',
    color: '#555',
    borderRadius: '4px',
    padding: '1px 7px',
    fontSize: '11px',
  },
  iconBtn: {
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    padding: '5px 10px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'filter 0.15s',
  },
};

export default ConfiguracionPagina;