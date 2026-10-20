# 💳 PayControl Enterprise
### Sistema Ejecutivo de Control de Cuentas por Pagar

<p align="left">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Dependencies-0_npm_deps-blue?style=for-the-badge&logo=npm" alt="Zero Dependencies" />
  <img src="https://img.shields.io/badge/Metodolog%C3%ADa-Scrum_%2F_Agile-orange?style=for-the-badge" alt="Scrum" />
  <img src="https://img.shields.io/badge/Roles-Gerente_%7C_Asistente-8A2BE2?style=for-the-badge" alt="Roles" />
  <img src="https://img.shields.io/badge/Licencia-Privada-red?style=for-the-badge" alt="Licencia" />
</p>

---

## 📌 Descripción del Proyecto

**PayControl Enterprise** es un sistema web de tesorería y gestión de cuentas por pagar diseñado a medida para una sola empresa (**TechSolutions Perú S.A.C.**). 

El sistema elimina complejidades innecesarias y se concentra de forma directa y efectiva en el flujo real de pagos corporativos:
* **Separación estricta de funciones:** Los perfiles de **Asistente Contable** y **Gerente General** tienen pantallas, permisos y acciones diferenciadas.
* **Tablero visual táctil tipo Post-it:** Cada obligación pendiente se visualiza como una nota adhesiva interactiva, ordenada cronológicamente mostrando **el pago más próximo a vencer primero**.
* **Semáforo inteligente de vencimientos:** Alertas de color automáticas según la cercanía de la fecha límite.
* **Control estricto de comprobantes:** No es posible liquidar una deuda sin adjuntar obligatoriamente el voucher o comprobante digital (PDF o imagen).
* **Control simplificado de pagos en efectivo:** Registro físico de número de recibo, custodio y receptor del dinero.
* **Documentación oficial ágil:** Especificación completa de **Historias de Usuario (HUs)** con criterios de aceptación y subtareas en un documento oficial editable en Word.

---

## 🚀 Inicio Rápido

El servidor fue construido utilizando la API nativa de Node.js (**0 dependencias externas en producción**), lo que garantiza máxima compatibilidad, estabilidad y arranque instantáneo.

### 1. Iniciar el Servidor

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
node server.js
```

*(También puedes usar `npm start`).*

### 2. Acceder a la Aplicación

Abre tu navegador e ingresa a:

```
http://localhost:3000
```

> **Nota:** Si el puerto `3000` se encuentra ocupado por otra aplicación, el servidor se vincula automáticamente al puerto `3001` sin generar errores.

---

## 🔐 Credenciales de Acceso y Perfiles

Al entrar al sistema se presenta una pantalla de login obligatoria que adapta toda la plataforma según el rol autenticado:

| Rol | Correo Electrónico | Contraseña | Alcance y Responsabilidades |
| :--- | :--- | :--- | :--- |
| 👔 **Gerente General** | `gerenteagile@hotmail.com` | `contraseña123` | **Carlos Mendoza**<br>• Vista ejecutiva mensual consolidada.<br>• Resumen financiero de liquidez y KPIs.<br>• Puede asumir excepcionalmente un pago con justificación.<br>• No realiza pagos rutinarios ni crea obligaciones. |
| 📋 **Asistente Contable** | `asistenteagile@hotmail.com` | `contraseña123` | **Ana Torres**<br>• Creación de tareas de pago y registro de facturas recibidas.<br>• Ejecución operativa de pagos bancarios y en efectivo.<br>• Adjunto obligatorio de comprobantes.<br>• Pre-programación de pagos recurrentes (luz, agua, etc.). |

> 💡 **Tip de Acceso Rápido:** En la pantalla de login dispones de dos botones de demostración rápida (**[👔 Rol Gerente General]** y **[📋 Rol Asistente Contable]**) para rellenar las credenciales e ingresar con un solo clic.

---

## 🗂️ Interfaz Visual: Formato Post-it y Semáforo

Cada obligación de pago se renderiza como una nota adhesiva interactiva con cinta simulada y sombreado tridimensional:

* **Orden Cronológico Estricto:** Los pagos siempre se posicionan ordenados por vencimiento (el más urgente primero).
* **Semáforo de Vencimiento:**
  * 🔴 **Post-it Rojo (Urgente):** Vence al día siguiente o ya venció (`<= 1 día restante`).
  * 🟠 **Post-it Naranja (Próximo):** Vence en el transcurso de la semana (`2 a 7 días`).
  * ⚪ **Post-it Neutro / Claro (Programado):** Obligaciones con más de 15 días de margen.
  * 🟢 **Post-it Verde (Pagado y Conciliado):** Deuda liquidada con sello visual de `[ PAGADO ✓ ]` y comprobante auditable.
* **Modos de Visualización:** Alternancia con 1 clic entre **Vista Post-its** y **Vista Tabla**.
* **Soporte Tema Oscuro y Claro:** Paleta de colores ajustada con contrastes de texto (`#0f172a` en modo claro) que garantizan legibilidad en cualquier monitor.

---

## ⚙️ Reglas de Negocio Implementadas

### 1. Rol Asistente Contable (Ana Torres)
1. **Recepción de Recibos:** Al crear una deuda, se exige adjuntar la factura o recibo recibido (PDF o imagen).
2. **Comprobante Obligatorio de Pago:** Al pagar, el sistema exige el comprobante de transferencia bancaria o voucher. Sin él, no permite liquidar.
3. **Control de Efectivo:**
   * **N° de Recibo:** Número correlativo físico (ej. `REC-2186`).
   * **Custodio:** Caja o fondo de donde salieron los fondos.
   * **¿Quién recibe el dinero?:** Selector desplegable con opciones claras:
     * *Cobrador / Proveedor*
     * *Dueño / Propietario*
     * *Persona en Recepción*
     * *Asistente*
     * *Otro*
   * **Nombre o Detalle:** Nombre o DNI de la persona que recibió el efectivo.
4. **Bloqueo ante Excepción de Gerencia:** Si el Gerente asume una deuda, la Asistente ve un botón informativo **`Gestionado por el gerente`** que muestra el motivo registrado por Gerencia, bloqueando cualquier pago duplicado.
5. **Pagos Recurrentes del Próximo Mes:** Botón que proyecta automáticamente los servicios básicos (Luz, Agua, Internet, Alquiler) hacia el mes siguiente con 1 clic.

### 2. Rol Gerente General (Carlos Mendoza)
1. **Dashboard Directo:** Al ingresar visualiza inmediatamente el resumen financiero del mes en curso.
2. **KPIs Ejecutivos:** Total Pagado (con barra de porcentaje liquidado), Total Pendiente, Deudas Críticas y Comparativa Efectivo vs. Banco.
3. **Navegación Temporal:** Selector de meses para auditar períodos pasados o inspeccionar compromisos futuros.
4. **Excepción de Gerencia:** Botón **"Asumir Pago"** con modal de justificación cuando el Gerente decide gestionar el pago personalmente.

---

## 📑 Historias de Usuario (HUs) y Documento Word

El proyecto incluye la especificación formal de requerimientos en formato Microsoft Word:

📥 **[Descargar Documento Oficial: Historias_de_Usuario_PayControl.docx](./Historias_de_Usuario_PayControl.docx)**

### Tabla Resumen de Historias de Usuario

| Código | Título de la Historia de Usuario | Rol Principal | Criterios de Aceptación Clave |
| :--- | :--- | :--- | :--- |
| **HU-01** | Autenticación y Control de Acceso por Roles | Gerente y Asistente | Login obligatorio, credenciales autorizadas, botones demo y logout. |
| **HU-02** | Visualización en Post-its con Semáforo Automático | Gerente y Asistente | Tarjetas táctiles, orden cronológico estricto, 4 colores y temas claro/oscuro. |
| **HU-03** | Creación de Tareas de Pago y Recepción de Recibos | Asistente | Formulario validado, clasificación de prioridades y adjunto de facturas. |
| **HU-04** | Liquidación de Pagos con Comprobante Obligatorio | Asistente | Requisito estricto de PDF/Imagen, visor integrado y sello `[ PAGADO ✓ ]`. |
| **HU-05** | Control Simplificado de Pagos en Efectivo | Asistente y Gerente | N° de Recibo, Custodio, desplegable de receptor y arqueo de caja. |
| **HU-06** | Dashboard Mensual y Navegación de Meses | Gerente | Métricas de total pagado/pendiente, navegación histórica y auditoría. |
| **HU-07** | Excepción de Gerencia y Bloqueo Operativo | Gerente y Asistente | Botón "Asumir Pago", bloqueo al asistente y botón "Gestionado por el gerente". |
| **HU-08** | Pre-programación de Pagos Recurrentes | Asistente | Detección de servicios fijos y generación 1-clic para el próximo mes. |

---

## 📁 Estructura del Repositorio

```text
Sistema-de-pagos-Asistente-y-Gerente/
│
├── Historias_de_Usuario_PayControl.docx # Documento de Word con especificación de HUs
├── package.json                        # Metadata y scripts del proyecto
├── server.js                           # Servidor HTTP nativo con API REST
│
├── data/
│   └── debts.json                      # Base de datos JSON de obligaciones y pagos
│
├── uploads/                            # Almacén de comprobantes y recibos (PDF/JPG/PNG)
│
├── scripts/
│   ├── init-data.js                    # Script para regenerar datos y comprobantes de prueba
│   └── generate_hu_doc.py              # Script en Python para compilar el documento Word
│
└── public/                             # Aplicación web Frontend
    ├── index.html                      # Estructura HTML5, modales y layouts
    ├── css/
    │   └── styles.css                  # Sistema de diseño, Post-its, temas y tipografías
    ├── js/
    │   └── app.js                      # Lógica cliente, autenticación y validaciones
    └── assets/
        └── logo.jpg                    # Logotipo corporativo de PayControl
```

---

<p align="center">
  <b>TechSolutions Perú S.A.C. &bull; Sistema PayControl Enterprise</b><br>
  Desarrollado bajo metodología ágil para el control eficiente de cuentas por pagar.
</p>