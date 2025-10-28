import React from 'react';
import { ContentSection, StatsGrid, UnifiedMap, DeviceData, StatCardData } from '../components/layout';

interface MonitoringPageProps {
  devices: DeviceData[];
  stats: StatCardData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick: (device: DeviceData) => void;
  onStatCardClick: (stat: StatCardData, index: number) => void;
}

const MonitoringPage: React.FC<MonitoringPageProps> = ({
  devices,
  stats,
  selectedDevice,
  onDeviceMarkerClick,
  onStatCardClick
}) => {
  return (
    <>
      {/* Sección del mapa general */}
      <ContentSection title="🌡️ Red de Sensores Ambientales - Campus UTalca">
        <UnifiedMap 
          devices={devices}
          selectedDevice={selectedDevice}
          onDeviceMarkerClick={onDeviceMarkerClick}
          height="500px"
          showHeatmapControls={true}
          defaultHeatmapVisible={false}
          defaultHeatmapMetric="temperature"
        />
      </ContentSection>

      {/* Sección de estadísticas */}
      <ContentSection title="Panel de Control - Estadísticas en Tiempo Real">
        <StatsGrid stats={stats} onCardClick={onStatCardClick} />
      </ContentSection>
    </>
  );
};

export default MonitoringPage;