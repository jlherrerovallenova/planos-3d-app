# 🏢 Guía de Clonación y Arquitectura: Planos 3D (Dollhouse 3D Studio)
Esta guía documenta la arquitectura técnica, las dependencias, la estructura de archivos y las instrucciones paso a paso para clonar y ejecutar la aplicación **Planos 3D** en el entorno de Flow Tools (React 19 + TypeScript + Tailwind CSS v4 + Flow SDK).
---
## 📋 Resumen del Proyecto
**Planos 3D** es una aplicación cliente para arquitectos, interioristas y comercializadoras inmobiliarias que convierte planos arquitectónicos 2D (JPEG/PNG) en maquetas 3D amuebladas (estilo corte isométrico *dollhouse*, plantas cenitales o planos 2D comerciales amueblados).
### Características Principales:
1. **Identificador interactivo de estancias:** Sistema de pines en canvas para ubicar salón, dormitorios, cocina, baños, etc., fijando sus coordenadas y evitando confusiones del modelo generativo.
2. **Memoria de calidades completa:**
   - **Pavimentos:** Salón y dormitorios (roble claro, espiga, microcemento, travertino), cocina (gres personalizable por tono), baños (gres 60x60cm + regla estricta de platos de ducha blanco puro) y terraza (tarima teka, porcelánico exterior, etc.).
   - **Ventanas y carpintería exterior:** Tipología (oscilobatiente, corredera minimal, fijo panorámico) y acabados (antracita RAL 7016, blanco satinado, roble, etc.).
   - **Puertas de paso y armarios:** Lacado blanco, roble natural, nogal tostado, etc.
   - **Muros:** Acabados interiores y exteriores independientes.
3. **Control de perspectiva y render:**
   - Corte Isométrico 45° (*Dollhouse*)
   - Planta Cenital 90° (*Top-Down 3D*)
   - Plano 2D Comercial Amueblado
   - Sección Transversal
4. **Visor con Comparador Split Slider:** Deslizador antes/después interactivo para comparar el plano original 2D y el render resultante.
5. **Gestor de Presets:** Guardado, carga y exportación en formato `.json` de memorias de calidades completas.
6. **Descarga nativa en alta resolución:** A través de `Flow.download()` con sanitización de nombres.
---
## 🛠️ Stack Tecnológico y Dependencias
- **Framework:** React 19 (Componentes funcionales y Hooks)
- **Lenguaje:** TypeScript (`.tsx`, `.ts` estrictos)
- **Estilos:** Tailwind CSS v4 (pre-cargado por el entorno)
- **Iconografía:** Google Material Symbols Outlined
- **SDK de Plataforma:** `flow-sdk`
  - Métodos utilizados:
    - `Flow.media.select({ filter: 'image' })`: Selección de planos desde la galería Flow.
    - `Flow.upload({ base64, mimeType, name })`: Registro en galería y obtención de `mediaId`.
    - `Flow.generate.image({ prompt, referenceImageMediaIds, aspectRatio, modelDisplayName })`: Generación de renders arquitectónicos con IA.
    - `Flow.download({ base64, mimeType, filename })`: Descarga segura en disco del usuario (imágenes PNG/JPEG y configuraciones JSON).
- **Modelo de IA predeterminado:** `🍌 Nano Banana Pro` (con fallback dinámico a `🍌 Nano Banana 2.1`).
---
## 📂 Estructura del Proyecto
```
.
├── App.tsx                     # Orquestador principal, estados de generación e historial
├── types.ts                   # Interfaces y tipos de RenderConfig, RoomMarker, etc.
├── constants.ts               # Opciones de materiales, colores, presets y categorías de estancias
├── CLONE_GUIDE.md             # Esta guía de clonación
├── components/
│   ├── IntroModal.tsx         # Modal de bienvenida y guía rápida
│   ├── PlanCanvasPreview.tsx  # Visor 2D/3D, split slider y renderizado de pines
│   ├── PresetManager.tsx      # Gestión y exportación JSON de presets
│   ├── RoomIdentifierPanel.tsx# Editor y panel de marcado de estancias
│   └── StyleSelector.tsx      # Selector multinivel de memoria de calidades
└── services/
    ├── downloadHelper.ts      # Envoltura segura para Flow.download con sanitización
    └── promptBuilder.ts       # Compilador algorítmico del prompt arquitectónico
```
---
## 🚀 Pasos para Clonar la Aplicación
### Paso 1: Configurar Tipos (`types.ts`)
Copia los tipos estructurales. Asegúrate de incluir:
- Tipos de cámara: `CameraAngle`.
- Materiales: `FlooringType`, `KitchenFlooringType`, `KitchenGresColor`, `BathroomFlooring60x60Tone`, `TerraceFlooringType`.
- Carpinterías y acabados: `WindowFrameType`, `WindowFrameFinish`, `DoorFinish`, `WallColorType`.
- Estructura `RoomMarker` (id, name, category, x, y, notes) y `RenderConfig`.
### Paso 2: Crear el Catálogo de Calidades (`constants.ts`)
Registra:
- `ROOM_CATEGORIES`: Array con las 12 categorías de espacios (iconos de Material Symbols, colores HEX y descripciones en inglés para el prompt).
- Opciones de pavimentos y carpinterías con su respectivo `promptKeyword`.
- `DEFAULT_PRESETS`: Las 4 configuraciones maestras de muestra (Nórdico, Mediterráneo, Contemporáneo y Plano 2D).
- `SAMPLE_PLANS`: URLs de demostración para pruebas sin subir plano inicial.
### Paso 3: Implementar el Compilador de Prompts (`services/promptBuilder.ts`)
El prompt builder traduce la configuración en directrices arquitectónicas para el modelo:
- Mapea las coordenadas `(x, y)` de cada pin a regiones cardinales (`left / west section`, `upper / north part`, etc.).
- Aplica la directiva crítica del plato de ducha: *"In all bathrooms, shower trays MUST ALWAYS BE PURE CHALK WHITE mineral resin... framing with transparent glass"*.
- Diferencia entre el modo plano 2D comercial ortográfico y la maqueta 3D isométrica a 1.2m de altura de corte.
### Paso 4: Implementar Servicios de Descarga (`services/downloadHelper.ts`)
- Utiliza **exclusivamente** `Flow.download()`.
- Limpia el Base64 (eliminando encabezados tipo `data:image/...;base64,` si vienen presentes).
- Sanitiza el nombre de archivo a formato `[a-zA-Z0-9_\-]` con extensión `.png` o `.jpg`.
### Paso 5: Desarrollar los Componentes de Interfaz (`components/`)
1. **`IntroModal.tsx`**: Modal de orientación al usuario.
2. **`PlanCanvasPreview.tsx`**: Contenedor visual que gestiona:
   - Clic para añadir/desplazar marcadores con coordenadas relativas porcentuales.
   - Pestañas: Render 3D/2D, Comparativa con Split Slider (``), y Plano Original.
3. **`RoomIdentifierPanel.tsx`**: Panel lateral para seleccionar habitación, ingresar observaciones (ej. "isla central", "ducha lluvia") y alternar modo puntero.
4. **`PresetManager.tsx`**: Selector de configuraciones rápidas y botón de exportación `.json`.
5. **`StyleSelector.tsx`**: Barra de pestañas secundarias (`general`, `rooms`, `flooring`, `windows`, `doors`, `walls`) con selectores visuales de muestras de color.
### Paso 6: Integración en `App.tsx`
1. Conecta los métodos del Flow SDK:
   - Carga desde dispositivo (`FileReader` -> `Flow.upload`).
   - Carga desde galería Flow (`Flow.media.select`).
   - Generación de imagen (`Flow.generate.image`).
2. Implementa la lógica de recuperación o fallback de modelo si ocurre alta demanda.
3. Almacena en estado React el historial de renders de la sesión.
---
## 🔒 Restricciones y Reglas Clave del Entorno Flow
1. **Sin formularios nativos:** No usar etiquetas `
2. **Sin enlaces directos de descarga:** No usar etiquetas `` ni `URL.createObjectURL` para descargas; están bloqueadas por el sandbox del iframe. Utilizar siempre `Flow.download()`.
3. **Base64 en Flow.upload / Flow.download:** Pasar Base64 limpio sin saltos de línea y con el MIME type correcto (`image/png`, `image/jpeg` o `application/json`).
4. **Modelos:** Pasar el nombre exacto con emoji: `'🍌 Nano Banana Pro'`.