# Sistema de Gestin e-Commerce "La Tiendita de Julia (tiajulia)"

## 📝 Descripción
"La Tiendita de Julia" es una plataforma completa de comercio electrónico diseñada para un negocio local. Permite tanto a los clientes explorar productos y promociones, como a los administradores gestionar de forma segura el catálogo de inventario a través de un panel de control dedicado.

## 🚀 Características Principales

*   **Catálogo Digital Completo:** Visualización atractiva de productos con soporte para imágenes, precios (originales y de oferta) y categorías (Frutas, Carnes, Abarrotes, Verduras, Cuidado Personal).
*   **Sección de Promociones Dinámica:** Un carrusel destacado e interactivo que muestra las ofertas del momento, captando la atención de los clientes.
*   **Búsqueda Inteligente:** Barra de búsqueda en tiempo real que filtra productos rápidamente por nombre o descripción.
*   **Diseño Totalmente Responsivo:** Una interfaz de usuario moderna (con toques de glassmorphism y animaciones suaves) que se adapta perfectamente a computadoras de escritorio, tabletas y teléfonos móviles.
*   **Panel de Administración Seguro (Dashboard):**
    *   Gestión CRUD completa (Crear, Leer, Actualizar, Eliminar) para productos y promociones.
    *   Subida de imágenes para el catálogo.
    *   Protegido mediante un **sistema de autenticación por PIN Virtual (Keypad)**, con bloqueo temporal de seguridad tras intentos fallidos y efectos de "shake" en contraseñas incorrectas.

## 🛠️ Tecnologías Utilizadas

*   **Frontend / UI:** HTML5 semántico, CSS3 moderno (Custom Properties, Flexbox, Grid, Animaciones), JavaScript (ES6+ Vainilla).
*   **Backend / Base de Datos:** Supabase (PostgreSQL para almacenamiento estructurado, Supabase Storage para alojamiento de imágenes de productos y promociones).

## 🗂️ Estructura del Proyecto

*   `index.html`: Página principal de la tienda (vista cliente).
*   `admin.html`: Panel de control para la gestión del inventario.
*   `/css/`: Hojas de estilo para la presentación, incluyendo responsive design y animaciones.
*   `/js/`: Lógica de la aplicación interactiva:
    *   `app.js` (cliente).
    *   `admin.js` (dashboard).
    *   `supabase-config.js` (conexión a la base de datos).
    *   `utils.js` (funciones de apoyo y seguridad del PIN).

## ⚙️ Instalación y Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/miikexddt/tiajulia.git
    cd tiajulia
    ```
2.  **Configurar Supabase:**
    *   Crea un proyecto en [Supabase](https://supabase.com/).
    *   Ejecuta los scripts SQL proporcionados (`security_setup.sql`, `create_promotions_table.sql`) en el panel SQL de Supabase para generar las tablas y políticas de seguridad (RLS).
    *   Crea un archivo `.env` o configura directamente en `supabase-config.js` tus credenciales `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
3.  **Ejecutar:**
    *   Abre `index.html` en tu navegador, o utiliza un servidor local (como Live Server en VSCode) para la mejor experiencia.

## 🤝 Contribuciones
Este es un proyecto personal, pero las sugerencias y *pull requests* son siempre bienvenidos para mejorar la funcionalidad o el diseño.
