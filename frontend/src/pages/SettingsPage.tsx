import React from 'react';
import { ContentSection } from '../components/layout';

const SettingsPage: React.FC = () => {
  return (
    <ContentSection title="⚙️ Configuración del Sistema">
      <div style={styles.container}>
        <div style={styles.header}>
          <h3>🔧 Panel de Administración</h3>
          <p>Configuración y gestión del sistema de monitoreo IoT</p>
        </div>

        <div style={styles.settingsGrid}>
          <div style={styles.settingSection}>
            <h4>👥 Gestión de Usuarios</h4>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <span>🏫 Administradores del campus</span>
                <button style={styles.button}>Gestionar</button>
              </div>
              <div style={styles.settingItem}>
                <span>👨‍🔬 Técnicos de mantenimiento</span>
                <button style={styles.button}>Gestionar</button>
              </div>
              <div style={styles.settingItem}>
                <span>📊 Usuarios de solo lectura</span>
                <button style={styles.button}>Gestionar</button>
              </div>
            </div>
          </div>

          <div style={styles.settingSection}>
            <h4>🔔 Alertas y Notificaciones</h4>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <span>🌡️ Límites de temperatura</span>
                <input style={styles.input} type="number" placeholder="25°C" />
              </div>
              <div style={styles.settingItem}>
                <span>💧 Límites de humedad</span>
                <input style={styles.input} type="number" placeholder="80%" />
              </div>
              <div style={styles.settingItem}>
                <span>🔋 Batería crítica</span>
                <input style={styles.input} type="number" placeholder="20%" />
              </div>
              <div style={styles.settingItem}>
                <span>📧 Notificaciones por email</span>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>

          <div style={styles.settingSection}>
            <h4>📡 Configuración de Sensores</h4>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <span>⏱️ Intervalo de lectura</span>
                <select style={styles.select}>
                  <option>1 minuto</option>
                  <option>5 minutos</option>
                  <option>15 minutos</option>
                  <option>30 minutos</option>
                </select>
              </div>
              <div style={styles.settingItem}>
                <span>📶 Frecuencia de transmisión</span>
                <select style={styles.select}>
                  <option>Tiempo real</option>
                  <option>Cada 5 minutos</option>
                  <option>Cada 15 minutos</option>
                </select>
              </div>
              <div style={styles.settingItem}>
                <span>🔄 Auto-calibración</span>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>

          <div style={styles.settingSection}>
            <h4>💾 Backup y Datos</h4>
            <div style={styles.settingsList}>
              <div style={styles.settingItem}>
                <span>🗄️ Backup automático</span>
                <button style={styles.buttonSecondary}>Configurar</button>
              </div>
              <div style={styles.settingItem}>
                <span>📤 Exportar datos</span>
                <button style={styles.buttonSecondary}>Exportar</button>
              </div>
              <div style={styles.settingItem}>
                <span>🗑️ Limpieza de datos antiguos</span>
                <select style={styles.select}>
                  <option>Nunca</option>
                  <option>6 meses</option>
                  <option>1 año</option>
                  <option>2 años</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.dangerZone}>
          <h4>⚠️ Zona de Peligro</h4>
          <div style={styles.settingsList}>
            <div style={styles.settingItem}>
              <span>🔄 Reiniciar sistema</span>
              <button style={styles.buttonDanger}>Reiniciar</button>
            </div>
            <div style={styles.settingItem}>
              <span>🗑️ Borrar todos los datos</span>
              <button style={styles.buttonDanger}>Borrar</button>
            </div>
          </div>
        </div>
      </div>
    </ContentSection>
  );
};

const styles = {
  container: {
    padding: '20px',
  },

  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    padding: '20px',
    background: 'linear-gradient(135deg, #6c757d, #495057)',
    color: 'white',
    borderRadius: '12px',
  },

  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '25px',
    marginBottom: '40px',
  },

  settingSection: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e9ecef',
  },

  settingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginTop: '15px',
  },

  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f1f3f4',
  },

  button: {
    background: '#00BCD4',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },

  buttonSecondary: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },

  buttonDanger: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },

  input: {
    border: '1px solid #ddd',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    width: '100px',
  },

  select: {
    border: '1px solid #ddd',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    background: 'white',
  },

  switch: {
    position: 'relative' as const,
    display: 'inline-block',
    width: '50px',
    height: '24px',
  },

  slider: {
    position: 'absolute' as const,
    cursor: 'pointer',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: '#ccc',
    borderRadius: '24px',
    transition: '0.4s',
  },

  dangerZone: {
    background: '#fff5f5',
    padding: '25px',
    borderRadius: '12px',
    border: '2px solid #dc3545',
  },
};

export default SettingsPage;