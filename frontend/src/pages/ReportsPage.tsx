import React from 'react';
import { ContentSection } from '../components/layout';

const ReportsPage: React.FC = () => {
  return (
    <ContentSection title="📊 Reportes y Análisis">
      <div style={styles.container}>
        <div style={styles.header}>
          <h3>📈 Centro de Reportes UTalca</h3>
          <p>Análisis detallado de datos ambientales del campus</p>
        </div>

        <div style={styles.reportsGrid}>
          <div style={styles.reportCard}>
            <h4>📊 Tendencias de Temperatura</h4>
            <p>Análisis histórico de temperatura por ubicación y tiempo</p>
            <ul>
              <li>Promedios diarios, semanales y mensuales</li>
              <li>Comparativas entre diferentes campus</li>
              <li>Identificación de patrones estacionales</li>
            </ul>
          </div>

          <div style={styles.reportCard}>
            <h4>💧 Análisis de Humedad</h4>
            <p>Monitoreo de niveles de humedad relativa</p>
            <ul>
              <li>Correlación temperatura-humedad</li>
              <li>Alertas por niveles críticos</li>
              <li>Impacto en el confort ambiental</li>
            </ul>
          </div>

          <div style={styles.reportCard}>
            <h4>🔋 Estado de Dispositivos</h4>
            <p>Seguimiento del rendimiento de sensores</p>
            <ul>
              <li>Historial de actividad y desconexiones</li>
              <li>Niveles de batería y mantenimiento</li>
              <li>Frecuencia de transmisión de datos</li>
            </ul>
          </div>

          <div style={styles.reportCard}>
            <h4>📍 Cobertura Geográfica</h4>
            <p>Análisis de distribución espacial</p>
            <ul>
              <li>Mapas de calor por zonas</li>
              <li>Identificación de áreas sin cobertura</li>
              <li>Sugerencias para nuevos sensores</li>
            </ul>
          </div>
        </div>

        <div style={styles.comingSoon}>
          <h4>🚀 Próximamente</h4>
          <p>Estamos desarrollando:</p>
          <ul>
            <li>Dashboard interactivo con gráficos en tiempo real</li>
            <li>Exportación de datos en Excel/PDF</li>
            <li>Sistema de alertas personalizables</li>
            <li>Predicciones basadas en IA</li>
            <li>Integración con sistemas meteorológicos</li>
          </ul>
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
    background: 'linear-gradient(135deg, #00BCD4, #00ACC1)',
    color: 'white',
    borderRadius: '12px',
  },

  reportsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },

  reportCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e9ecef',
    borderLeft: '4px solid #00BCD4',
  },

  comingSoon: {
    background: '#f8f9fa',
    padding: '30px',
    borderRadius: '12px',
    border: '2px dashed #00BCD4',
    textAlign: 'center' as const,
  },
};

export default ReportsPage;