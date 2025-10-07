# 📁 Estructura de Páginas Separadas - Clima UTalca

La aplicación ha sido refactorizada para separar cada vista en su propio archivo, mejorando la organización del código y facilitando el mantenimiento.

## 🏗️ Arquitectura Actual

### **Archivo Principal: `Home.tsx`**
- **Responsabilidad**: Manejo del estado global y navegación entre páginas
- **Funciones**: Gestión de pestañas, estado de dispositivos seleccionados, coordinación entre vistas
- **Tamaño reducido**: ~110 líneas (vs. ~300 líneas originales)

### **Datos Compartidos: `data/sensorData.ts`**
```typescript
export const deviceData: DeviceData[] = [...]; // 5 sensores UTalca
export const calculateStats = (): StatCardData[] => {...}; // Estadísticas dinámicas
```

## 📄 Páginas Separadas

### **1. `MonitoringPage.tsx` - Vista de Monitoreo**
```typescript
interface MonitoringPageProps {
  devices: DeviceData[];
  stats: StatCardData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick: (device: DeviceData) => void;
  onStatCardClick: (stat: StatCardData, index: number) => void;
}
```

**Contenido:**
- 🗺️ Mapa interactivo con todos los sensores
- 📊 Grid de estadísticas en tiempo real
- 🎯 Funcionalidad de click en marcadores

---

### **2. `DevicesPage.tsx` - Vista de Dispositivos**
```typescript
interface DevicesPageProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceSelect: (device: DeviceData) => void;
}
```

**Contenido:**
- 📋 Lista detallada de sensores (panel izquierdo)
- 🗺️ Mapa que se mueve según selección (panel derecho)
- 🎯 Selección bidireccional lista ↔ mapa

---

### **3. `ReportsPage.tsx` - Vista de Reportes**
```typescript
const ReportsPage: React.FC = () => {...}
```

**Contenido:**
- 📈 Sección de reportes con diseño profesional
- 📊 Cards explicativas para cada tipo de análisis
- 🚀 Información sobre funcionalidades próximas
- 🎨 Diseño preparado para gráficos futuros

---

### **4. `SettingsPage.tsx` - Vista de Configuración**
```typescript
const SettingsPage: React.FC = () => {...}
```

**Contenido:**
- 👥 Panel de gestión de usuarios
- 🔔 Configuración de alertas y notificaciones
- 📡 Parámetros de sensores IoT
- 💾 Backup y gestión de datos
- ⚠️ Zona de peligro para operaciones críticas

## 🔄 Flujo de Datos

```
Home.tsx (Estado Global)
├── deviceData (desde sensorData.ts)
├── calculateStats() (desde sensorData.ts)
├── selectedDevice (estado local)
└── activeTab (estado local)
    │
    ├─► MonitoringPage (devices, stats, callbacks)
    ├─► DevicesPage (devices, selectedDevice, callbacks)
    ├─► ReportsPage (sin props - componente estático)
    └─► SettingsPage (sin props - componente estático)
```

## 🎯 Ventajas de la Separación

### ✅ **Mantenibilidad**
- Cada página es independiente
- Fácil localizar y modificar funcionalidades específicas
- Menor acoplamiento entre componentes

### ✅ **Escalabilidad**
- Agregar nuevas páginas es simple
- Modificar una vista no afecta las demás
- Fácil testing de componentes individuales

### ✅ **Colaboración**
- Diferentes desarrolladores pueden trabajar en diferentes páginas
- Conflictos de merge minimizados
- Revisiones de código más enfocadas

### ✅ **Performance**
- Posibilidad de lazy loading futuro
- Bundles más pequeños por página
- Mejor tree shaking

### ✅ **Organización**
- Estructura de carpetas clara
- Separación de responsabilidades
- Código más legible

## 📂 Estructura de Archivos

```
src/
├── pages/
│   ├── Home.tsx              # 🏠 Controlador principal
│   ├── MonitoringPage.tsx    # 📊 Vista de monitoreo
│   ├── DevicesPage.tsx       # 📱 Vista de dispositivos
│   ├── ReportsPage.tsx       # 📈 Vista de reportes
│   ├── SettingsPage.tsx      # ⚙️ Vista de configuración
│   └── index.ts              # 📦 Exportaciones centralizadas
├── data/
│   └── sensorData.ts         # 🗄️ Datos compartidos
└── components/layout/
    ├── UtalcaHeader.tsx      # 🏢 Header reutilizable
    ├── TabNavigation.tsx     # 🔖 Navegación por pestañas
    ├── DeviceList.tsx        # 📋 Lista de dispositivos
    ├── InteractiveMap.tsx    # 🗺️ Mapa interactivo
    └── ...                   # Otros componentes reutilizables
```

## 🚀 Próximos Pasos

### **Inmediatos:**
- [ ] Probar todas las funcionalidades
- [ ] Verificar que la navegación funcione correctamente
- [ ] Confirmar que los datos se comparten correctamente

### **Futuro:**
- [ ] Implementar lazy loading de páginas
- [ ] Agregar animaciones de transición entre páginas
- [ ] Implementar sistema de routing con React Router
- [ ] Crear tests unitarios para cada página
- [ ] Implementar Context API para estado global más complejo

## 🔧 Comandos de Desarrollo

```bash
# Ejecutar aplicación
npm start

# Verificar tipos TypeScript
npx tsc --noEmit

# Verificar errores de linting
npm run lint
```

---

## 📝 Notas Importantes

1. **Estado Global**: `Home.tsx` mantiene el estado de la pestaña activa y dispositivo seleccionado
2. **Datos Compartidos**: `sensorData.ts` es la fuente única de verdad para los datos de sensores
3. **Props Drilling**: Por ahora usamos props drilling, pero se puede migrar a Context API si crece la complejidad
4. **Componentes Reutilizables**: Los componentes de layout siguen siendo reutilizables entre páginas
5. **Tipado**: Todas las interfaces están correctamente tipadas con TypeScript

Esta nueva estructura permite un desarrollo más eficiente y mantenible del sistema de monitoreo IoT de la Universidad de Talca.