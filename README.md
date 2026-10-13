# 🏢 Planos 3D (Dollhouse 3D Studio)

> Aplicación web que transforma planos 2D en renders arquitectónicos 3D amueblados (estilo corte isométrico *dollhouse*, vistas cenitales y planos 2D comerciales) con Inteligencia Artificial.

---

## ✨ Características

- **Identificador interactivo de estancias:** Sistema de pines sobre el canvas para ubicar salón, cocina, dormitorios, baños y fijar sus coordenadas espaciales.
- **Memoria de calidades:** Selección de pavimentos, tonalidades de gres, carpintería exterior (oscilobatiente, corredera minimal), puertas de paso y acabados de tabiquería.
- **Modos de cámara y render:**
  - Corte Isométrico 45° (*Dollhouse*)
  - Planta Cenital 90° (*Top-Down 3D*)
  - Plano 2D Comercial Amueblado
  - Sección Transversal
- **Visor Comparativo con Split Slider:** Comparador interactivo antes/después entre plano 2D y maqueta 3D.
- **Gestión de Presets:** Carga, guardado y exportación en formato `.json`.
- **Integración con IA Generativa:** Compatible con Flow SDK y la API de Google Gemini (`nano-banana-pro-preview`, `gemini-nano-banana-2.1`, `gemini-2.5-flash-image`).

---

## 🚀 Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/jlherrerovallenova/planos-3d-app.git
cd planos-3d-app
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto a partir de la plantilla:

```bash
cp .env.example .env.local
```

Añade tu clave de API de Gemini:
```env
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tecnologías

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Google Material Symbols Outlined**
- **Gemini API / Flow SDK**

---

## 📄 Licencia

MIT
