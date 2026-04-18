import React from 'react';
import { ContentSection } from '../components/layout';
import ZonasClimaAdmin from '../components/ZonasClimaAdmin';

const ZonasClimaPage: React.FC = () => (
  <ContentSection title="Zonas de Clima">
    <ZonasClimaAdmin />
  </ContentSection>
);

export default ZonasClimaPage;
