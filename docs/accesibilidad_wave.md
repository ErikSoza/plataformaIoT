# Mejoras de Accesibilidad WAVE — Plataforma IoT

**Herramienta:** WAVE Web Accessibility Evaluation Tool
**Fecha:** Junio 2026
**Alcance:** Vista principal (Home + Dashboard logueado)
**Regla:** Solo cambios de CSS, estilos inline, HTML semántico y atributos ARIA — sin tocar lógica, hooks, estado ni rutas

---

## Resultado

| Métrica | Antes | Después Round 1 | Después Round 2 |
| --- | --- | --- | --- |
| AIM Score | 4.3 / 10 | 7.3 / 10 | ~8+ / 10 |
| Errores de formulario | 2 | 0 | 0 |
| Errores de contraste | 31 | 8 | 0 |
| Alertas de estructura | 18 | 0 | 0 |
| Alertas de texto pequeño | — | 16 | 0 |

---

## Round 1 — AIM 4.3 → 7.3

### Errores de formulario (2 errores → 0)

| Elemento | Archivo | Solución |
| --- | --- | --- |
| Slider de horizonte de predicción | MonitoreoPagina.tsx | `<label htmlFor="horizonSlider">` invisible + `id="horizonSlider"` en el input |
| Campo de búsqueda de ciudad | CitySearch.tsx | `aria-label="Buscar ciudad"` directo en el input |

---

### Estructura semántica (18 alertas → 0)

| Problema | Archivo | Cambio aplicado |
| --- | --- | --- |
| Sin landmark `<main>` | MainLayout.tsx | `<div>` → `<main>` |
| Sin `<header>` (guest) | Home.tsx | `<div>` → `<header>` |
| Sin `<header>` (logueado) | UserHeader.tsx | `<div>` → `<header>` |
| Sin `<nav>` en tabs | TabNavigation.tsx | `<div>` → `<nav aria-label="Navegación principal">` |
| Sin `<h1>` en página guest | Home.tsx | `<h2>` → `<h1>` |
| Sin `<h1>` en dashboard | UserHeader.tsx | `<h2>` → `<h1>` |
| Tabs no navegables con teclado | TabNavigation.tsx | `<div>` → `<button type="button" aria-current="page">` |

---

### Contraste insuficiente (31 errores → 8)

**Colores problemáticos más frecuentes y su reemplazo:**

| Color original | Color nuevo | Ratio original | Ratio nuevo | Aparecía en |
| --- | --- | --- | --- | --- |
| `#00BCD4` (como texto) | `#006B77` | ~2.8:1 | ~4.6:1 | Títulos de marca, botones |
| `#6c757d` | `#495057` | ~3.9:1 | ~5.7:1 | Subtítulos, metadatos |
| `#7f8c8d` | `#595959` | ~3.5:1 | ~5.3:1 | Texto de rol, coordenadas |
| `#90a4ae` | `#546e7a` | ~2.4:1 | ~5.4:1 | Labels meteorológicos |
| `#bdbdbd` | `#495057` | ~1.6:1 | ~5.7:1 | Mensaje "sin datos" |
| `#b0bec5` | `#546e7a` | ~2.2:1 | ~5.4:1 | Unidades de gas |
| Tab activo bg `#00BCD4` | `#007E8A` | — | — | Fondo del tab activo |
| Tab texto `#666` | `#444444` | — | — | Texto de tabs inactivos |

**Tokens CSS globales agregados en `index.css`:**

```css
:root {
  --color-text-secondary: #495057;
  --color-brand-text: #006B77;
  --color-brand-bg: #007E8A;
  --color-brand-accent: #00BCD4;
}

:focus-visible {
  outline: 3px solid #006B77;
  outline-offset: 2px;
  border-radius: 2px;
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
}
```

---

## Round 2 — AIM 7.3 → ~8+

### A. Contraste en tarjetas de estadísticas (8 errores → 0)

Los valores numéricos grandes usan `fontWeight: 300`. WAVE aplica el umbral estricto de **4.5:1 incluso a texto grande no negrita**.

**StatsGrid.tsx — METRIC_CONFIG:**

| Variable | Color anterior | Color nuevo | Ratio antes | Ratio después | Fondo de tarjeta |
| --- | --- | --- | --- | --- | --- |
| temperature | `#E65100` | `#A84000` | 3.58:1 | 5.01:1 | `#ffecb3` |
| temperature_hot | `#BF360C` | `#962800` | 3.73:1 | 5.24:1 | `#ffccbc` |
| radiation | `#BF6000` | `#7B3C00` | 3.79:1 | 7.16:1 | `#fff9c4` |

**MonitoreoPagina.tsx — selector de variable y badges:**

| Elemento | Color anterior | Color nuevo |
| --- | --- | --- |
| Color de variable temperatura | `#0288D1` | `#006DA3` |
| Color de variable humedad | `#00897B` | `#00695C` |
| Color de variable viento | `#E65100` | `#A84000` |
| Badge Edge TinyML | `#E65100` | `#A84000` |
| Títulos "Acerca de" (×3) | `#00BCD4` | `#006B77` |

---

### B. Texto muy pequeño (16 alertas → 0)

WAVE marca como alerta cualquier texto menor a ~14px. Todos los tamaños fueron subidos a **`0.875rem` (14px)**.

| Archivo | Elemento | Tamaño anterior | Tamaño nuevo |
| --- | --- | --- | --- |
| StatsGrid.tsx | `h3` título de tarjeta stat | `0.78rem` | `0.875rem` |
| StatsGrid.tsx | `subtitle` de tarjeta stat | `0.74rem` | `0.875rem` |
| MonitoreoPagina.tsx | Ticks del slider de horizonte | `0.72rem` | `0.875rem` |
| MonitoreoPagina.tsx | Botones de variable (Temp / Hum / Pres / Viento) | `0.82rem` | `0.875rem` |
| MonitoreoPagina.tsx | `predCardSubtitle` (×3 horizontes) | `0.78rem` | `0.875rem` |
| MonitoreoPagina.tsx | `predCardMeta` (×3 horizontes) | `0.78rem` | `0.875rem` |
| MonitoreoPagina.tsx | `predCardBadge` (×3 horizontes) | `0.72rem` | `0.875rem` |
| ResumenEstacion.tsx | `meteoLabel` (Temp / Hum / Pres / Viento) | `0.72rem` | `0.875rem` |
| ResumenEstacion.tsx | `gasName` (×6 gases) | `0.72rem` | `0.875rem` |
| ResumenEstacion.tsx | `gasUnit` (×6 gases) | `0.68rem` | `0.875rem` |
| ResumenEstacion.tsx | `gasBadge` (×6 gases) | `0.66rem` | `0.875rem` |
| CitySearch.tsx | `resultCoords` | `0.80rem` | `0.875rem` |
| CitySearch.tsx | `footerText` | `0.75rem` | `0.875rem` |

---

### C. Elementos sin cambio (decisión intencional)

| Elemento | Motivo |
| --- | --- |
| `<noscript>` | Mensaje estándar de Create React App — no afecta accesibilidad funcional |
| `alt=""` en imágenes de Features | Correcto según WCAG 1.1.1: imágenes puramente decorativas deben tener alt vacío |

---

## Archivos modificados (resumen)

| Archivo | Qué se cambió |
| --- | --- |
| `frontend/src/index.css` | Tokens CSS, estilos `:focus-visible`, clase `.sr-only` |
| `frontend/src/components/layout/MainLayout.tsx` | `<div>` → `<main>` |
| `frontend/src/components/layout/TabNavigation.tsx` | `<nav>`, `<button>`, `aria-current` |
| `frontend/src/components/layout/StatsGrid.tsx` | Colores de contraste en `METRIC_CONFIG`, tamaños de fuente |
| `frontend/src/pages/Home.tsx` | `<header>`, `<h1>`, corrección de colores |
| `frontend/src/components/UserHeader.tsx` | `<header>`, `<h1>`, corrección de colores |
| `frontend/src/pages/MonitoreoPagina.tsx` | Label en slider, colores `VARIABLE_DISPLAY`, tamaños de fuente |
| `frontend/src/components/ResumenEstacion.tsx` | `semColor()`, colores, tamaños de fuente |
| `frontend/src/components/CitySearch.tsx` | `aria-label`, colores, tamaños de fuente |

---

## Criterios WCAG 2.1 AA aplicados

| Criterio | Descripción | Nivel |
| --- | --- | --- |
| 1.1.1 Non-text Content | Imágenes decorativas con `alt=""` | A |
| 1.3.1 Info and Relationships | Landmarks semánticos (`<header>`, `<main>`, `<nav>`) | A |
| 1.3.5 Identify Input Purpose | `id` + `htmlFor` o `aria-label` en todos los inputs | AA |
| 1.4.3 Contrast Minimum | Texto normal ≥ 4.5:1 / Texto grande ≥ 3:1 | AA |
| 1.4.4 Resize Text | Sin tamaños de fuente fijos pequeños | AA |
| 2.1.1 Keyboard | Tabs navegables con teclado mediante `<button>` | A |
| 2.4.1 Bypass Blocks | Landmark `<main>` permite saltar navegación | A |
| 2.4.6 Headings and Labels | Jerarquía correcta `<h1>` → `<h2>` → `<h3>` | AA |
