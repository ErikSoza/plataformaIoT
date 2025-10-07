# Componentes Reutilizables - Layout UTalca

Este directorio contiene componentes reutilizables diseñados con la identidad visual de la Universidad de Talca.

## 🎨 Componentes Disponibles

### 1. **UtalcaHeader**
Header principal con el estilo de la universidad.

```tsx
import { UtalcaHeader } from '../components/layout';

<UtalcaHeader
  title="Mi Aplicación"
  subtitle="Universidad de Talca - Descripción del sistema"
  logoText="UTalca" // Opcional, por defecto es "UTalca"
/>
```

**Props:**
- `title`: Título principal (string)
- `subtitle`: Subtítulo descriptivo (string)
- `logoText`: Texto del logo (string, opcional)

---

### 2. **TabNavigation**
Sistema de navegación por pestañas estilo UTalca.

```tsx
import { TabNavigation, TabItem } from '../components/layout';

const tabs: TabItem[] = [
  { id: 'tab1', label: 'PESTAÑA 1', active: true },
  { id: 'tab2', label: 'PESTAÑA 2' },
  { id: 'tab3', label: 'PESTAÑA 3' },
];

<TabNavigation 
  tabs={tabs} 
  onTabChange={(tabId) => console.log('Tab seleccionado:', tabId)} 
/>
```

**Props:**
- `tabs`: Array de objetos TabItem
- `onTabChange`: Función callback opcional para manejar cambios de pestaña

**Tipos:**
```tsx
interface TabItem {
  id: string;
  label: string;
  active?: boolean;
}
```

---

### 3. **MainLayout**
Contenedor principal para el contenido de la página.

```tsx
import { MainLayout } from '../components/layout';

<MainLayout>
  <div>Tu contenido aquí</div>
</MainLayout>
```

**Props:**
- `children`: ReactNode - El contenido a renderizar

---

### 4. **ContentSection**
Sección de contenido con título y estilo consistente.

```tsx
import { ContentSection } from '../components/layout';

<ContentSection title="Título de la Sección">
  <div>Contenido de la sección</div>
</ContentSection>
```

**Props:**
- `title`: Título de la sección (string)
- `children`: Contenido a renderizar (ReactNode)
- `className`: Clase CSS opcional (string)

---

### 5. **StatsGrid y StatCard**
Componentes para mostrar estadísticas en formato de tarjetas.

```tsx
import { StatsGrid, StatCard, StatCardData } from '../components/layout';

// Usando StatsGrid (recomendado)
const stats: StatCardData[] = [
  {
    title: 'Usuarios Activos',
    value: '1,234',
    subtitle: 'Último mes',
    icon: '👥',
  },
  {
    title: 'Ventas',
    value: '$45,678',
    subtitle: 'Este mes',
    icon: '💰',
  },
];

<StatsGrid 
  stats={stats}
  onCardClick={(stat, index) => console.log('Card clicked:', stat, index)}
/>

// Usando StatCard individual
<StatCard
  title="Mi Estadística"
  value="100"
  subtitle="Descripción"
  icon="📊"
  onClick={() => console.log('Clicked!')}
/>
```

**Props StatsGrid:**
- `stats`: Array de StatCardData
- `onCardClick`: Función callback opcional

**Props StatCard:**
- `title`: Título de la estadística (string)
- `value`: Valor a mostrar (string | number)
- `subtitle`: Subtítulo opcional (string)
- `icon`: Emoji o icono opcional (string)
- `onClick`: Función callback opcional

**Tipos:**
```tsx
interface StatCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}
```

---

### 6. **MapContainer**
Contenedor estilizado para mapas.

```tsx
import { MapContainer } from '../components/layout';

<MapContainer height="400px">
  {/* Tu mapa aquí */}
</MapContainer>
```

**Props:**
- `children`: Contenido del mapa (ReactNode)
- `height`: Altura del contenedor (string, por defecto: "500px")
- `borderRadius`: Radio del borde (string, por defecto: "10px")

---

## 🎨 Paleta de Colores UTalca

Los componentes utilizan la siguiente paleta de colores:

```css
/* Colores principales */
--utalca-primary: #00BCD4;      /* Turquesa principal */
--utalca-primary-light: #00ACC1; /* Turquesa claro */
--utalca-primary-dark: #0097A7;  /* Turquesa oscuro */

/* Colores de apoyo */
--utalca-gray-dark: #2c3e50;
--utalca-gray-medium: #6c757d;
--utalca-gray-light: #e9ecef;
--utalca-background: #f8f9fa;
--utalca-white: #ffffff;
```

---

## 📱 Responsive Design

Todos los componentes están diseñados para ser responsivos y se adaptan automáticamente a diferentes tamaños de pantalla.

---

## 🚀 Ejemplo de Uso Completo

```tsx
import React from 'react';
import {
  UtalcaHeader,
  TabNavigation,
  MainLayout,
  ContentSection,
  StatsGrid,
  TabItem,
  StatCardData
} from '../components/layout';

const MiPagina: React.FC = () => {
  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'DASHBOARD', active: true },
    { id: 'analytics', label: 'ANALÍTICAS' },
    { id: 'settings', label: 'CONFIGURACIÓN' },
  ];

  const stats: StatCardData[] = [
    { title: 'Total Usuarios', value: '1,234', icon: '👥' },
    { title: 'Ingresos', value: '$45,678', icon: '💰' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <UtalcaHeader
        title="Mi Dashboard"
        subtitle="Universidad de Talca - Sistema de Gestión"
      />
      
      <TabNavigation tabs={tabs} onTabChange={console.log} />
      
      <MainLayout>
        <ContentSection title="Estadísticas Principales">
          <StatsGrid stats={stats} />
        </ContentSection>
        
        <ContentSection title="Otra Sección">
          <p>Más contenido aquí...</p>
        </ContentSection>
      </MainLayout>
    </div>
  );
};

export default MiPagina;
```

---

## 📂 Estructura de Archivos

```
src/components/layout/
├── UtalcaHeader.tsx
├── TabNavigation.tsx
├── MainLayout.tsx
├── ContentSection.tsx
├── StatsGrid.tsx
├── MapContainer.tsx
├── index.ts              // Exportaciones centralizadas
└── README.md            // Esta documentación
```

---

## 🔧 Próximas Mejoras

- [ ] Agregar soporte para temas personalizados
- [ ] Implementar animaciones más avanzadas
- [ ] Agregar más variaciones de componentes
- [ ] Crear sistema de iconos personalizado
- [ ] Implementar modo oscuro