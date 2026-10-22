import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_document():
    doc = docx.Document()

    # Set standard page margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Header / Title
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title.add_run("HISTORIAS DE USUARIO (HU) Y SUBTAREAS")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(22)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(30, 58, 138) # Deep Navy Blue

    sub_title = doc.add_paragraph()
    sub_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = sub_title.add_run("Sistema de Control de Pagos y Cuentas por Pagar (PayControl Enterprise)")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(13)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(71, 85, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Meta Info Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Proyecto:", "PayControl Enterprise - Cuentas por Pagar"),
        ("Empresa:", "TechSolutions Perú S.A.C. (RUC 20601827361)"),
        ("Roles del Sistema:", "Rol Gerente General & Rol Asistente Contable"),
        ("Metodología:", "Scrum / Agile - Especificación de Requisitos y Criterios de Aceptación")
    ]
    for i, (label, val) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_background(c0, "F1F5F9")
        set_cell_margins(c0, 60, 60, 100, 100)
        set_cell_margins(c1, 60, 60, 100, 100)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(label)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor(30, 41, 59)

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(18)

    # Introducción
    p_intro = doc.add_paragraph()
    r_intro = p_intro.add_run("El presente documento contiene la especificación detallada de todas las Historias de Usuario (HU) implementadas en el sistema web de cuentas por pagar, organizadas con su narrativa ágil (Como... Quiero... Para...), criterios de aceptación verificables y desglose de subtareas técnicas.")
    r_intro.font.size = Pt(10.5)
    r_intro.font.color.rgb = RGBColor(71, 85, 105)

    # List of User Stories
    user_stories = [
        {
            "id": "HU-01",
            "title": "Autenticación de Usuarios y Control de Acceso por Roles",
            "role": "Usuario del Sistema (Gerente o Asistente)",
            "narrative": "Como usuario autorizado de la empresa, quiero ingresar a través de una pantalla de inicio de sesión con mi correo y contraseña específicos, para que el sistema me identifique y cargue las funciones y permisos correspondientes a mi rol (Gerente o Asistente).",
            "priority": "Alta",
            "criteria": [
                "Debe existir una pantalla de inicio de sesión previa que impida el acceso directo al panel sin autenticarse.",
                "El Gerente ingresa con el correo 'gerenteagile@hotmail.com' y la contraseña 'contraseña123'.",
                "El Asistente ingresa con el correo 'asistenteagile@hotmail.com' y la misma contraseña 'contraseña123'.",
                "Cualquier otra combinación de credenciales debe mostrar un mensaje de error claro en pantalla sin permitir el acceso.",
                "Se deben proveer botones de acceso rápido de demostración para ingresar con 1 solo clic.",
                "En la cabecera del sistema se debe mostrar el nombre del usuario activo y un botón para 'Cerrar Sesión' que elimine la sesión y retorne al login."
            ],
            "subtasks": [
                ("Subtarea 1.1", "Diseñar interfaz visual de login modal/overlay con validación en tiempo real."),
                ("Subtarea 1.2", "Crear endpoint backend POST /api/login para autenticar correos y contraseñas autorizadas."),
                ("Subtarea 1.3", "Implementar persistencia de sesión en sessionStorage para recordar al usuario autenticado."),
                ("Subtarea 1.4", "Añadir botones de acceso rápido ('Rol Gerente General' y 'Rol Asistente Contable')."),
                ("Subtarea 1.5", "Implementar función de logout que limpie sesión y redireccione a la pantalla de login.")
            ]
        },
        {
            "id": "HU-02",
            "title": "Visualización de Obligaciones en Formato Post-it con Semáforo Automático",
            "role": "Gerente y Asistente",
            "narrative": "Como usuario del sistema, quiero ver todas las deudas del mes en un formato visual tipo 'Post-it' ordenadas estrictamente por fecha de vencimiento (las más próximas primero), con un código de colores automático, para identificar de inmediato cuáles pagos requieren atención urgente.",
            "priority": "Alta",
            "criteria": [
                "Cada deuda se representa como una tarjeta estilo nota adhesiva / Post-it con cinta superior, sombreado y tipografía clara.",
                "El orden de los Post-its debe ser estrictamente cronológico: las deudas más próximas a vencer deben aparecer siempre primero.",
                "Color Rojo: Se asigna automáticamente a deudas que vencen al día siguiente o que ya se encuentran vencidas (diff <= 1 día).",
                "Color Naranja: Se asigna automáticamente a deudas que vencen en una semana (2 a 7 días).",
                "Color Blanco / Neutro: Se asigna a deudas a las que les faltan 15 días o más para su vencimiento.",
                "Color Verde: Se asigna a deudas ya pagadas y respaldadas con comprobante (con sello visual [ PAGADO ✓ ]).",
                "Debe existir un conmutador para alternar entre 'Vista Post-its' (predeterminada) y 'Vista Tabla'.",
                "El modo claro y oscuro deben mantener contraste perfecto (textos oscuros en fondo claro, sin letras blancas invisibles)."
            ],
            "subtasks": [
                ("Subtarea 2.1", "Desarrollar componentes CSS de tarjetas Post-it con estética táctil y cabeceras de cinta adhesiva."),
                ("Subtarea 2.2", "Implementar función calculateDueAlert() para categorizar días restantes contra la fecha actual."),
                ("Subtarea 2.3", "Asegurar ordenamiento Array.sort() por dueDate ascendente antes de cualquier renderizado."),
                ("Subtarea 2.4", "Implementar selector de vista (Post-its vs Tabla) con persistencia de estado."),
                ("Subtarea 2.5", "Corregir variables CSS en [data-theme='light'] para evitar texto blanco sobre fondos claros.")
            ]
        },
        {
            "id": "HU-03",
            "title": "Registro de Nuevas Tareas de Pago con Recepción de Recibos",
            "role": "Asistente Contable",
            "narrative": "Como Asistente Contable, quiero registrar las nuevas tareas de pago indicando proveedor, concepto, importe, fecha de vencimiento y prioridad, además de adjuntar los recibos o facturas recibidas, para mantener centralizada toda la documentación contable previa al pago.",
            "priority": "Alta",
            "criteria": [
                "Solo el Asistente Contable tiene visible y habilitado el botón '+ Nueva Tarea de Pago'.",
                "Formulario con validación obligatoria para: Proveedor, Importe, Fecha de Vencimiento y Prioridad (Alta, Media, Baja).",
                "Permitir clasificar la categoría (Servicios Básicos, Alquiler, Telecomunicaciones, Impuestos, etc.).",
                "Permitir marcar la deuda como 'Pago Recurrente Mensual' (agua, luz, alquiler) para su pre-programación futura.",
                "Zona de carga de archivos (Dropzone) para adjuntar el recibo o factura recibida en formato PDF o imagen.",
                "Validación criptográfica binaria (SHA-256) obligatoria: el sistema rechaza recibos idénticos previamente cargados, impidiendo duplicidad aun si se altera el nombre del archivo.",
                "Auditoría de Titularidad de Documento: si el recibo adjunto pertenece a otra razón social o RUC ajeno distinto a TechSolutions Perú S.A.C. (RUC 20601827361), el sistema bloquea el registro con alerta de seguridad.",
                "Al guardar, la deuda se almacena en el sistema y se muestra inmediatamente en el listado del mes."
            ],
            "subtasks": [
                ("Subtarea 3.1", "Construir formulario modal con campos validados para la creación de tareas de pago."),
                ("Subtarea 3.2", "Crear endpoint POST /api/debts que genere ID correlativo y guarde la deuda en la base JSON."),
                ("Subtarea 3.3", "Implementar cálculo de huella digital SHA-256 en cliente y backend para evitar archivos duplicados."),
                ("Subtarea 3.4", "Implementar motor nativo de inspección de texto PDF y validación de pertenencia empresarial (TechSolutions Perú S.A.C.)."),
                ("Subtarea 3.5", "Restringir la visibilidad del botón de creación únicamente para el rol Asistente.")
            ]
        },
        {
            "id": "HU-04",
            "title": "Ejecución de Pagos con Comprobante Obligatorio, Auditoría SHA-256 y Unicidad de Operación",
            "role": "Asistente Contable",
            "narrative": "Como Asistente Contable encargada de realizar los pagos, quiero registrar la liquidación de una deuda seleccionando el método de pago, adjuntando obligatoriamente el comprobante verificado por huella digital SHA-256 y registrando un número de operación bancaria o recibo único, para que ninguna deuda se marque como pagada sin una prueba real, irrepetible y perteneciente a la empresa.",
            "priority": "Alta (Regla de Negocio Crítica)",
            "criteria": [
                "Para marcar una tarea como 'Pagada', el sistema EXIGE OBLIGATORIAMENTE adjuntar un comprobante en formato PDF o Imagen.",
                "El botón de confirmación de pago debe estar deshabilitado hasta que se haya seleccionado un archivo válido.",
                "Validación de Duplicidad de Archivos por Hash SHA-256: Si el archivo ya fue utilizado como comprobante o recibo en cualquier deuda, se bloquea la operación indicando el código de la deuda original.",
                "Validación de Unicidad de Referencia Bancaria / N° de Recibo: En transferencias (N° de operación) o efectivo (N° de recibo), el sistema verifica en tiempo real que el código no exista previamente en otra deuda pagada.",
                "Inspección de Titularidad del Comprobante: Bloqueo inmediato si el comprobante digital detecta facturas o boletas emitidas a terceros ajenos a la empresa autorizada.",
                "El Asistente puede seleccionar entre método 'Transferencia Bancaria' o 'Pago en Efectivo'.",
                "Al confirmarse el pago, la tarjeta Post-it pasa a estado Verde [ PAGADO ✓ ].",
                "Tanto el Gerente como el Asistente pueden hacer clic en 'Ver Comprobante' para auditar el documento en un visor integrado con trazabilidad de hash SHA-256 y validación de pertenencia."
            ],
            "subtasks": [
                ("Subtarea 4.1", "Crear modal 'Registrar Ejecución de Pago' con resumen de la deuda a cancelar."),
                ("Subtarea 4.2", "Implementar endpoint POST /api/check-reference y validación en tiempo real de duplicidad de N° de operación bancaria."),
                ("Subtarea 4.3", "Implementar motor de validación criptográfica SHA-256 contra la base de datos de comprobantes y recibos."),
                ("Subtarea 4.4", "Crear endpoint PUT /api/debts/:id/pay que verifique comprobante, unicidad de hash, referencia bancaria y titularidad de empresa."),
                ("Subtarea 4.5", "Desarrollar visor de documentos modal con tarjeta de auditoría criptográfica (SHA-256) e indicador de empresa titular.")
            ]
        },
        {
            "id": "HU-05",
            "title": "Control Simplificado de Pagos en Efectivo",
            "role": "Asistente Contable y Gerente",
            "narrative": "Como Asistente Contable, cuando realice un pago en efectivo quiero registrar de forma sencilla el número de recibo, el custodio y quién recibe el dinero mediante un menú desplegable, para que la salida de dinero físico quede justificada ante cualquier arqueo de caja.",
            "priority": "Alta",
            "criteria": [
                "Al seleccionar 'Pago en Efectivo' en el modal de pago, se despliega automáticamente el panel de control de efectivo.",
                "Campo 'N° de Recibo': campo de texto para registrar el número correlativo del comprobante físico.",
                "Campo 'Custodio': indica de qué caja o fondo salió el efectivo (ej. Caja Chica Administración).",
                "Menú desplegable '¿Quién recibe el dinero?': opciones claras: Cobrador / Proveedor, Dueño / Propietario, Persona en Recepción, Asistente, Otro.",
                "Campo complementario 'Nombre o Detalle': campo opcional para especificar el nombre o DNI de la persona.",
                "La tarjeta Post-it pagada debe exhibir una insignia con el N° de recibo en efectivo.",
                "El resumen mensual debe contabilizar por separado el total pagado en Efectivo vs. Banco."
            ],
            "subtasks": [
                ("Subtarea 5.1", "Actualizar formulario de pago con etiquetas claras: N° de Recibo y Custodio."),
                ("Subtarea 5.2", "Integrar selector <select> con las opciones de roles de recepción de dinero."),
                ("Subtarea 5.3", "Almacenar la estructura cashControl en el objeto de pago de la deuda."),
                ("Subtarea 5.4", "Actualizar la tarjeta de métrica KPI de Efectivo / Caja Chica en el dashboard principal.")
            ]
        },
        {
            "id": "HU-06",
            "title": "Pantalla Principal Ejecutiva y Navegación de Meses para Gerencia",
            "role": "Gerente General",
            "narrative": "Como Gerente General, quiero que al ingresar al sistema se me muestren directamente todas las deudas del mes actual (pagadas y pendientes) con un resumen financiero y la posibilidad de navegar hacia meses pasados o futuros, para supervisar el flujo de compromisos sin intervenir en el registro ordinario.",
            "priority": "Alta",
            "criteria": [
                "Al ingresar como Gerente, la pantalla principal muestra directamente el consolidado de deudas del mes actual.",
                "El Gerente visualiza claramente a quién se le paga (proveedor), fecha de vencimiento, prioridad e importe.",
                "Muestra 4 tarjetas de métricas KPI: Total Pagado en el Mes (% de presupuesto liquidado), Total Pendiente, Deudas Críticas (Rojo/Naranja) y Total en Efectivo.",
                "El Gerente no puede crear tareas de pago ni ejecutar pagos ordinarios (los botones operativos se ocultan).",
                "Permite navegar libremente mediante flechas o selector rápido hacia meses pasados (Setiembre) o futuros (Noviembre)."
            ],
            "subtasks": [
                ("Subtarea 6.1", "Implementar lógica de vista de Gerencia por defecto tras autenticarse como Gerente."),
                ("Subtarea 6.2", "Crear endpoint GET /api/stats con cálculo en tiempo real de totales pagados, pendientes y semáforos."),
                ("Subtarea 6.3", "Construir barra de navegación temporal con botones de mes anterior/siguiente y selector rápido."),
                ("Subtarea 6.4", "Ocultar botones de registro y pago para cumplir con la separación de funciones del Gerente.")
            ]
        },
        {
            "id": "HU-07",
            "title": "Excepción de Gerencia: Asumir Pago Directo y Bloqueo Operativo al Asistente",
            "role": "Gerente General y Asistente Contable",
            "narrative": "Como Gerente General, quiero disponer de una opción para indicar excepcionalmente que me encargaré personalmente de realizar un pago, y como Asistente Contable, quiero ver que dicha deuda ya no me permite pagarla y me muestre un botón que indique 'Gestionado por el gerente' con el motivo.",
            "priority": "Alta (Excepción Operativa)",
            "criteria": [
                "En cualquier deuda pendiente, el Gerente tiene disponible el botón 'Asumir Pago'.",
                "Al presionar 'Asumir Pago', se abre un modal donde el Gerente registra la justificación o motivo de la excepción.",
                "Una vez asumida, para el Asistente DESAPARECE el botón 'Pagar' y en su lugar aparece el botón 'Gestionado por el gerente'.",
                "Al hacer clic en 'Gestionado por el gerente', el Asistente ve un modal informativo con la explicación y el motivo registrado por el gerente.",
                "El modal incluye un botón claro de 'Cerrar' y no permite ejecutar ninguna acción de pago."
            ],
            "subtasks": [
                ("Subtarea 7.1", "Crear modal 'Excepción de Gerencia: Asumir Pago Directo' con campo de motivo justificado."),
                ("Subtarea 7.2", "Crear endpoint PUT /api/debts/:id/assume-manager para marcar managerAssumed = true."),
                ("Subtarea 7.3", "Actualizar renderizado del Asistente: ocultar botón 'Pagar' y mostrar 'Gestionado por el gerente'."),
                ("Subtarea 7.4", "Crear modal informativo modalManagerAssumedNotice en reemplazo del alert nativo del navegador.")
            ]
        },
        {
            "id": "HU-08",
            "title": "Pre-programación de Pagos Recurrentes del Siguiente Mes",
            "role": "Asistente Contable",
            "narrative": "Como Asistente Contable, quiero consultar los pagos fijos recurrentes (agua, luz, alquiler, internet) y poder pre-programarlos para el mes siguiente con un solo clic, para anticipar las obligaciones antes de que comience el nuevo periodo.",
            "priority": "Media",
            "criteria": [
                "El Asistente dispone del botón 'Recurrentes Próximo Mes (Agua, Luz...)' en la barra de herramientas.",
                "Al abrirlo, se muestra una ventana con la lista de servicios fijos marcados como recurrentes en la empresa.",
                "Incluye el botón 'Programar para Noviembre 2026' (o el mes siguiente al activo).",
                "Al hacer clic, el sistema genera automáticamente las tareas de pago pendientes en el mes objetivo sin duplicar las existentes.",
                "El sistema navega automáticamente al mes siguiente para que el asistente pueda verificar las tareas programadas."
            ],
            "subtasks": [
                ("Subtarea 8.1", "Crear modal 'Pagos Recurrentes del Próximo Mes' con listado de plantillas de servicios fijos."),
                ("Subtarea 8.2", "Crear endpoint POST /api/debts/recurring/generate para duplicar y calendarizar pagos en el mes entrante."),
                ("Subtarea 8.3", "Integrar redirección automática al nuevo mes y notificación toast de confirmación.")
            ]
        }
    ]

    for hu in user_stories:
        # Heading 1 for each Story
        h1 = doc.add_paragraph()
        h1.paragraph_format.space_before = Pt(14)
        h1.paragraph_format.space_after = Pt(4)
        h1.paragraph_format.keep_with_next = True
        
        run_h1_code = h1.add_run(f"[{hu['id']}] ")
        run_h1_code.font.bold = True
        run_h1_code.font.size = Pt(14)
        run_h1_code.font.color.rgb = RGBColor(37, 99, 235) # Blue

        run_h1_title = h1.add_run(hu['title'])
        run_h1_title.font.bold = True
        run_h1_title.font.size = Pt(14)
        run_h1_title.font.color.rgb = RGBColor(15, 23, 42)

        # Meta attributes box
        table_hu = doc.add_table(rows=2, cols=2)
        table_hu.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        c00, c01 = table_hu.rows[0].cells[0], table_hu.rows[0].cells[1]
        c10, c11 = table_hu.rows[1].cells[0], table_hu.rows[1].cells[1]
        
        c00.width = Inches(3.2)
        c01.width = Inches(3.3)
        c10.width = Inches(3.2)
        c11.width = Inches(3.3)

        for cell in [c00, c01, c10, c11]:
            set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, 40, 40, 80, 80)

        p = c00.paragraphs[0]
        p.add_run("Rol / Actor: ").font.bold = True
        p.add_run(hu['role']).font.color.rgb = RGBColor(71, 85, 105)

        p = c01.paragraphs[0]
        p.add_run("Prioridad: ").font.bold = True
        r_prio = p.add_run(hu['priority'])
        r_prio.font.bold = True
        r_prio.font.color.rgb = RGBColor(220, 38, 38) if "Crítica" in hu['priority'] or "Alta" in hu['priority'] else RGBColor(202, 138, 4)

        p = c10.paragraphs[0]
        p.add_run("Estado: ").font.bold = True
        r_done = p.add_run("100% Implementado y Verificado")
        r_done.font.bold = True
        r_done.font.color.rgb = RGBColor(22, 163, 74)

        p = c11.paragraphs[0]
        p.add_run("Módulo: ").font.bold = True
        p.add_run("Gestión de Cuentas por Pagar").font.color.rgb = RGBColor(71, 85, 105)

        # Narrativa de la HU
        p_narrative = doc.add_paragraph()
        p_narrative.paragraph_format.space_before = Pt(8)
        p_narrative.paragraph_format.space_after = Pt(6)
        r_narr_label = p_narrative.add_run("Narrativa Ágil:\n")
        r_narr_label.font.bold = True
        r_narr_label.font.size = Pt(10.5)
        r_narr_label.font.color.rgb = RGBColor(30, 41, 59)

        r_narr_text = p_narrative.add_run(f'"{hu["narrative"]}"')
        r_narr_text.font.italic = True
        r_narr_text.font.size = Pt(10)
        r_narr_text.font.color.rgb = RGBColor(51, 65, 85)

        # Criterios de Aceptación
        p_crit = doc.add_paragraph()
        p_crit.paragraph_format.space_before = Pt(4)
        p_crit.paragraph_format.space_after = Pt(4)
        p_crit.paragraph_format.keep_with_next = True
        r_crit_label = p_crit.add_run("Criterios de Aceptación:")
        r_crit_label.font.bold = True
        r_crit_label.font.size = Pt(10.5)
        r_crit_label.font.color.rgb = RGBColor(30, 41, 59)

        for crit in hu['criteria']:
            p_item = doc.add_paragraph(style='List Bullet')
            p_item.paragraph_format.space_before = Pt(1)
            p_item.paragraph_format.space_after = Pt(2)
            r_item = p_item.add_run(crit)
            r_item.font.size = Pt(9.5)
            r_item.font.color.rgb = RGBColor(51, 65, 85)

        # Subtareas Técnicas
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(6)
        p_sub.paragraph_format.space_after = Pt(4)
        p_sub.paragraph_format.keep_with_next = True
        r_sub_label = p_sub.add_run("Subtareas de Desarrollo y Pruebas:")
        r_sub_label.font.bold = True
        r_sub_label.font.size = Pt(10.5)
        r_sub_label.font.color.rgb = RGBColor(30, 41, 59)

        # Subtasks Table
        sub_table = doc.add_table(rows=len(hu['subtasks']) + 1, cols=3)
        sub_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Header Row
        hdr = sub_table.rows[0]
        h_titles = ["Código", "Descripción de la Subtarea", "Estado"]
        h_widths = [Inches(1.2), Inches(4.3), Inches(1.0)]
        for j, (h_title, w) in enumerate(zip(h_titles, h_widths)):
            c = hdr.cells[j]
            c.width = w
            set_cell_background(c, "E2E8F0")
            set_cell_margins(c, 60, 60, 100, 100)
            p = c.paragraphs[0]
            r = p.add_run(h_title)
            r.font.bold = True
            r.font.size = Pt(9)
            r.font.color.rgb = RGBColor(30, 41, 59)

        for idx, (sub_code, sub_desc) in enumerate(hu['subtasks'], start=1):
            row = sub_table.rows[idx]
            c_code, c_desc, c_stat = row.cells[0], row.cells[1], row.cells[2]
            c_code.width = Inches(1.2)
            c_desc.width = Inches(4.3)
            c_stat.width = Inches(1.0)

            for c in [c_code, c_desc, c_stat]:
                set_cell_margins(c, 40, 40, 80, 80)
                if idx % 2 == 0:
                    set_cell_background(c, "F8FAFC")

            r0 = c_code.paragraphs[0].add_run(sub_code)
            r0.font.bold = True
            r0.font.size = Pt(8.5)

            r1 = c_desc.paragraphs[0].add_run(sub_desc)
            r1.font.size = Pt(8.5)

            r2 = c_stat.paragraphs[0].add_run("Completado ✓")
            r2.font.bold = True
            r2.font.size = Pt(8.5)
            r2.font.color.rgb = RGBColor(22, 163, 74)

        # Separator line
        p_sep = doc.add_paragraph()
        p_sep.paragraph_format.space_before = Pt(12)
        p_sep.paragraph_format.space_after = Pt(12)
        r_sep = p_sep.add_run("―" * 45)
        r_sep.font.color.rgb = RGBColor(226, 232, 240)

    # Save document
    doc.save("Historias_de_Usuario_PayControl.docx")
    print("Document successfully created: Historias_de_Usuario_PayControl.docx")

if __name__ == "__main__":
    create_document()
