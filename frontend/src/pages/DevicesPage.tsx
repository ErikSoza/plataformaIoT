import React from 'react';
import { ContentSection, DeviceList, InteractiveMap, DeviceData } from '../components/layout';

interface DevicesPageProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceSelect: (device: DeviceData) => void;
}

const DevicesPage: React.FC<DevicesPageProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect
}) => {
  return (
    <div style={styles.devicesView}>
      {/* Lista de dispositivos */}
      <div style={styles.deviceListContainer}>
        <ContentSection title="📋 Sensores Ambientales Distribuidos">
          <DeviceList
            devices={devices}
            selectedDeviceId={selectedDevice?.id}
            onDeviceSelect={onDeviceSelect}
          />
        </ContentSection>
      </div>

      {/* Mapa interactivo */}
      <div style={styles.deviceMapContainer}>
        <ContentSection title={selectedDevice ? `Ubicación: ${selectedDevice.name}` : "Selecciona un Dispositivo"}>
          <InteractiveMap 
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceMarkerClick={onDeviceSelect}
            height="500px"
          />
        </ContentSection>
      </div>
    </div>
  );
};

const styles = {
  devicesView: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },

  deviceListContainer: {
    minHeight: '600px',
  },

  deviceMapContainer: {
    minHeight: '600px',
  },
};

export default DevicesPage;