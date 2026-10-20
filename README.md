# PayControl Enterprise - Sistema de Control de Cuentas por Pagar

Sistema web de gestión de cuentas por pagar enfocado exclusivamente en una sola empresa (**TechSolutions Perú S.A.C.**), diseñado bajo una arquitectura limpia sin complejidades innecesarias, con separación estricta de roles (**Asistente Contable** y **Gerente General**), interfaz visual en formato de **notas adhesivas (Post-its)**, semáforo inteligente de vencimientos y verificación obligatoria de comprobantes.

---

## 🚀 Inicio Rápido

El sistema cuenta con un servidor ligero nativo en Node.js sin dependencias externas pesadas (`0 npm dependencies` en producción), garantizando máxima estabilidad y arranque instantáneo en cualquier equipo con Node.js v18+.

### 1. Iniciar el Servidor Web
Abre tu terminal en la carpeta del proyecto y ejecuta:
```bash
node server.js
```
O también:
```bash
npm start
```

### 2. Acceder al Sistema
Abre tu navegador web en:
```
http://localhost:3000
```

---

## 🔐 Pantalla de Inicio de Sesión y Credenciales Autorizadas

El sistema cuenta con una pantalla de login obligatoria que restringe y adapta la interfaz según el rol del usuario:

| Rol del Sistema | Correo Electrónico | Contraseña | Perfil y Alcance |
| :--- | :--- | :--- | :--- |
| 👔 **Rol Gerente** | `gerenteagile@hotmail.com` | `contraseña123` | Carlos Mendoza &bull; Vista ejecutiva mensual y excepciones |
| 📋 **Rol Asistente** | `asistenteagile@hotmail.com` | `contraseña123` | Ana Torres &bull; Creación, recepción de recibos y pagos |

> [!TIP]
> **Accesos Rápidos de Prueba:** En la misma pantalla de login dispones de dos botones de acceso rápido (`[ Rol Gerente General ]` y `[ Rol Asistente Contable ]`) que rellenan e inician sesión con un solo clic.
> En la esquina superior derecha dispones del botón **"Salir"** para cerrar sesión en cualquier momento.

---

## 🗂️ Interfaz Visual en Formato Post-it y Semáforo Automático

Cada compromiso u obligación de pago se presenta como una **tarjeta Post-it** interactiva con cinta adhesiva y sombreado táctil:

- **Orden Cronológico Estricto:** Los Post-its se ordenan automáticamente mostrando siempre **el pago más próximo a vencerse primero**.
- **Semáforo de Vencimiento:**
  - 🔴 **Post-it Rojo (Urgente):** Vence al día siguiente o ya se encuentra vencido (`días restantes <= 1`).
  - 🟠 **Post-it Naranja (Próximo):** Vence en el transcurso de una semana (`2 a 7 días`).
  - ⚪ **Post-it Blanco / Neutro (Programado):** Faltan 15 días o más para su vencimiento.
  - 🟢 **Post-it Verde (Pagado y Conciliado):** Obligación liquidada con sello visual `[ PAGADO ✓ ]`.
- **Selector de Vista:** En la barra de herramientas puedes alternar entre **Vista Post-its** (activa por defecto) y **Vista Tabla**.
- **Tema Oscuro y Claro:** Ambos modos cuentan con tipografía contrastada (`#0f172a` en modo claro) para evitar textos invisibles sobre fondos claros.

---

## 👥 Matriz de Funcionalidades por Rol

### 1. Rol Asistente Contable (Ana Torres)
- **Creación de Tareas de Pago:** Registra proveedor, concepto, importe, fecha de vencimiento, prioridad (**Alta**, **Media**, **Baja**) y categoría.
- **Recepción de Recibos y Facturas:** Adjunta obligatoriamente los recibos o facturas recibidas (PDF o Imagen) para mantener el archivo digital centralizado.
- **Ejecución de Pagos:** Es la encargada operativa de liquidar las deudas.
- **Comprobante Obligatorio:** El sistema **bloquea** el registro del pago si no se adjunta el comprobante (PDF o imagen).
- **Control de Efectivo Simplificado:**
  - **N° de Recibo:** Registro del número correlativo físico (ej. `REC-2186`).
  - **Custodio:** Indica de qué caja chica o fondo salió el dinero.
  - **¿Quién recibe el dinero? (Desplegable):** Selector rápido con opciones cotidianas:
    - *Cobrador / Proveedor*
    - *Dueño / Propietario*
    - *Persona en Recepción*
    - *Asistente*
    - *Otro*
  - **Nombre o Detalle:** Campo complementario para especificar el nombre o DNI de quien recibió el efectivo.
- **Bloqueo ante Excepciones de Gerencia:** Si el Gerente asume un pago, a la Asistente se le oculta el botón "Pagar" y se le muestra el botón **`Gestionado por el gerente`**, el cual abre una ventana modal explicando el motivo registrado por Gerencia sin permitirle pagar.
- **Pagos Recurrentes del Próximo Mes:** Botón de 1-clic para pre-programar las obligaciones fijas de servicios (Agua, Luz, Internet, Renta de local) para el mes entrante.

### 2. Rol Gerente General (Carlos Mendoza)
- **Pantalla Principal Directa:** Muestra directamente el consolidado de deudas del mes actual (tanto pagadas como pendientes).
- **Separación de Funciones:** El Gerente no registra deudas ni ejecuta pagos ordinarios (los botones operativos se ocultan).
- **Resumen Financiero (KPIs):** Total Pagado en el Mes (% liquidado), Total Pendiente, Deudas Críticas (Rojo/Naranja) y Control de Efectivo vs. Banco.
- **Navegación Temporal:** Permite retroceder a meses pasados (historial) o avanzar a meses futuros (deudas programadas).
- **Excepción de Gerencia:** Botón **"Asumir Pago"** con modal para registrar la justificación en casos donde él mismo indique que se encargará del pago.

---

## 📑 Historias de Usuario (HU) y Documento Editable Word

Todas las funcionalidades fueron diseñadas siguiendo el marco de trabajo **Scrum / Agile**. Se ha generado un documento editable oficial en formato Microsoft Word:

📄 **[Historias_de_Usuario_PayControl.docx](file:///f:/Agile%20trabajo/Sistema%20de%20pagos%20Asistente%20y%20Gerente/Historias_de_Usuario_PayControl.docx)** *(Ubicado en la raíz del proyecto para edición y presentación).*

### Resumen de Historias de Usuario Implementadas:

| Código | Título de la Historia de Usuario | Rol Principal | Criterios Clave y Subtareas |
| :--- | :--- | :--- | :--- |
| **HU-01** | Autenticación y Control de Acceso por Roles | Gerente y Asistente | Login obligatorio, credenciales predefinidas, botones demo y logout. |
| **HU-02** | Visualización en Post-its con Semáforo Automático | Gerente y Asistente | Tarjetas táctiles, orden cronológico estricto, 4 colores y modo claro/oscuro. |
| **HU-03** | Creación de Tareas de Pago y Recepción de Recibos | Asistente | Formulario validado, clasificación de prioridades y adjunto de recibos/facturas. |
| **HU-04** | Liquidación de Pagos con Comprobante Obligatorio | Asistente | Requisito estricto de PDF/Imagen, visor integrado y sello `[ PAGADO ✓ ]`. |
| **HU-05** | Control Simplificado de Pagos en Efectivo | Asistente y Gerente | N° de Recibo, Custodio, desplegable de receptor y arqueo de caja chica. |
| **HU-06** | Dashboard Mensual y Navegación de Meses | Gerente | Métricas de total pagado/pendiente, navegación a pasados/futuros y auditoría. |
| **HU-07** | Excepción de Gerencia y Bloqueo Operativo | Gerente y Asistente | Botón "Asumir Pago", bloqueo de pago al asistente y botón "Gestionado por el gerente". |
| **HU-08** | Pre-programación de Pagos Recurrentes | Asistente | Detección de servicios fijos (agua/luz) y generación 1-clic para el próximo mes. |

---

## 📁 Estructura del Código Fuente

```
Sistema de pagos Asistente y Gerente/
│
├── Historias_de_Usuario_PayControl.docx # Documento de Word editable con todas las HUs y subtareas
├── package.json                        # Metadata y comandos del proyecto
├── server.js                           # Servidor HTTP nativo con API REST y fallback de puertos
│
├── data/
│   └── debts.json                      # Base de datos JSON de obligaciones y pagos
│
├── uploads/                            # Almacén de archivos PDF e imágenes (recibos y comprobantes)
│
├── scripts/
│   ├── init-data.js                    # Inicializador de datos y PDFs de muestra
│   └── generate_hu_doc.py              # Generador del documento de Word de Historias de Usuario
│
└── public/                             # Interfaz web de usuario
    ├── index.html                      # Layout, modales, login y estructura Post-it / Tabla
    ├── css/
    │   └── styles.css                  # Estilos visuales, contraste claro/oscuro y Post-its
    ├── js/
    │   └── app.js                      # Lógica interactiva, control de roles y validaciones
    └── assets/
        └── logo.jpg                    # Logotipo corporativo de PayControl
```
#   S i s t e m a - d e - p a g o s - A s i s t e n t e - y - G e r e n t e  
 