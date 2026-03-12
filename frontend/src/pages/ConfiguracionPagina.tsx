import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
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

const ConfiguracionPagina: React.FC = () => {
  const { user, token, updateUser, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'danger'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        nombre: user.nombre,
        email: user.email
      }));
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
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
};

export default ConfiguracionPagina;