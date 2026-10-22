const fs = require('fs');
const path = require('path');

// Ensure directories
['public/assets', 'data', 'uploads'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Helper to create valid minimalist PDF files
function buildMinimalPdf(title, provider, amount, date, refNumber, isProof = false) {
  const lines = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj",
    "<< /Length 400 >>",
    "stream",
    "BT",
    "/F1 20 Tf",
    "50 740 Td",
    `(${title}) Tj`,
    "/F1 12 Tf",
    "0 -40 Td",
    "(Empresa: TechSolutions Peru S.A.C. - RUC 20601827361) Tj",
    "0 -25 Td",
    `(Beneficiario / Proveedor: ${provider}) Tj`,
    "0 -25 Td",
    `(Importe Total: S/ ${amount}) Tj`,
    "0 -25 Td",
    `(Fecha de Emision / Pago: ${date}) Tj`,
    "0 -25 Td",
    `(Nro. Documento / Operacion: ${refNumber}) Tj`,
    "0 -30 Td",
    `(${isProof ? 'ESTADO: PAGO CONCILIADO Y CONFORME' : 'DOCUMENTO: FACTURA / RECIBO POR PAGAR'}) Tj`,
    "0 -25 Td",
    "(SISTEMA DE CONTROL DE CUENTAS POR PAGAR) Tj",
    "ET",
    "endstream",
    "endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000245 00000 n ",
    "0000000695 00000 n ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "775",
    "%%EOF"
  ];
  return lines.join("\n");
}

fs.writeFileSync('uploads/recibo_sedapal.pdf', buildMinimalPdf('RECIBO DE AGUA SEDAPAL', 'Sedapal S.A.', '480.00', '2026-10-08', 'SED-992381', false));
fs.writeFileSync('uploads/recibo_luz_enel.pdf', buildMinimalPdf('RECIBO DE ENERGIA ELECTRICA', 'Enel Distribucion Peru', '1,850.00', '2026-10-10', 'REC-ENEL-88392', false));
fs.writeFileSync('uploads/factura_sunat.pdf', buildMinimalPdf('ORDEN DE PAGO SUNAT IGV', 'Superintendencia SUNAT', '4,200.00', '2026-10-14', 'SUNAT-DEC-0926', false));
fs.writeFileSync('uploads/factura_movistar.pdf', buildMinimalPdf('FACTURA FIBRA OPTICA EMPRESARIAL', 'Telefonica del Peru S.A.A.', '920.00', '2026-10-11', 'F001-003891', false));
fs.writeFileSync('uploads/factura_papelera.pdf', buildMinimalPdf('FACTURA UTILES Y SUMINISTROS', 'Proveedora Papelera Nacional', '650.00', '2026-10-14', 'F002-09812', false));
fs.writeFileSync('uploads/comprobante_alquiler_banco.pdf', buildMinimalPdf('CONSTANCIA TRANSFERENCIA BANCARIA', 'Inmobiliaria Los Sauces S.A.C.', '5,500.00', '2026-10-12', 'BCP-TRANSF-9948271', true));
fs.writeFileSync('uploads/vale_caja_chica_limpieza.pdf', buildMinimalPdf('VALE EGRESO EFECTIVO CAJA CHICA', 'Servicios de Limpieza Express', '380.00', '2026-10-15', 'VALE-CC-1049', true));

// Boletas de demostración para pruebas de auditoría del profesor:
// 1. Boleta válida legítima emitida para TechSolutions Perú S.A.C.
fs.writeFileSync('uploads/boleta_valida_techsolutions.pdf', buildMinimalPdf('FACTURA ELECTRONICA F001-00982', 'Distribuidora Logistica Peru S.A.', '350.00', '2026-10-20', 'F001-00982', false));

// 2. Boleta ajena que NO pertenece a la empresa (emitida a otra empresa ajena con RUC 20554433221)
function buildAlienPdf() {
  const lines = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    "4 0 obj",
    "<< /Length 400 >>",
    "stream",
    "BT",
    "/F1 20 Tf",
    "50 740 Td",
    "(BOLETA DE VENTA ELECTRONICA B003-88129) Tj",
    "/F1 12 Tf",
    "0 -40 Td",
    "(Cliente / Destinatario: Inversiones Los Andes S.A.C. - RUC 20554433221) Tj",
    "0 -25 Td",
    "(Beneficiario / Emisor: Ferreteria Central El Sol E.I.R.L. - RUC 20129384751) Tj",
    "0 -25 Td",
    "(Importe Total: S/ 780.00) Tj",
    "0 -25 Td",
    "(Fecha de Emision: 2026-10-19) Tj",
    "0 -25 Td",
    "(Nro. Operacion / Documento: B003-88129) Tj",
    "0 -30 Td",
    "(ADVERTENCIA: COMPROBANTE EMITIDO A OTRA EMPRESA AJENA) Tj",
    "ET",
    "endstream",
    "endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "0000000009 00000 n ",
    "0000000058 00000 n ",
    "0000000115 00000 n ",
    "0000000245 00000 n ",
    "0000000695 00000 n ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "775",
    "%%EOF"
  ];
  return lines.join("\n");
}
fs.writeFileSync('uploads/boleta_ajena_otra_empresa.pdf', buildAlienPdf());

// Initial debts seed dataset
const initialDebts = [
  {
    id: "PAY-202610-001",
    provider: "Sedapal S.A.",
    concept: "Consumo mensual de agua potable sede principal",
    category: "Servicios Básicos",
    amount: 480.00,
    currency: "PEN",
    dueDate: "2026-10-19", // Today -> ROJO
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Agua",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-001",
        name: "Recibo_Sedapal_Oct2026.pdf",
        type: "application/pdf",
        url: "/uploads/recibo_sedapal.pdf",
        size: "18 KB",
        uploadDate: "2026-10-08"
      }
    ],
    payment: null,
    createdAt: "2026-10-08"
  },
  {
    id: "PAY-202610-002",
    provider: "Enel Distribución Perú",
    concept: "Suministro eléctrico oficinas centrales pisos 3 y 4",
    category: "Servicios Básicos",
    amount: 1850.00,
    currency: "PEN",
    dueDate: "2026-10-20", // Tomorrow -> ROJO
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Luz",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-002",
        name: "Recibo_Luz_Enel_Oct2026.pdf",
        type: "application/pdf",
        url: "/uploads/recibo_luz_enel.pdf",
        size: "22 KB",
        uploadDate: "2026-10-10"
      }
    ],
    payment: null,
    createdAt: "2026-10-10"
  },
  {
    id: "PAY-202610-003",
    provider: "SUNAT Tributos Internos",
    concept: "Declaración y pago IGV periodo contable Setiembre",
    category: "Impuestos",
    amount: 4200.00,
    currency: "PEN",
    dueDate: "2026-10-18", // Yesterday -> ROJO (Vencido)
    priority: "Alta",
    status: "Pendiente",
    isRecurring: false,
    recurringCategory: null,
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-003",
        name: "Boleta_SUNAT_IGV_Setiembre.pdf",
        type: "application/pdf",
        url: "/uploads/factura_sunat.pdf",
        size: "35 KB",
        uploadDate: "2026-10-14"
      }
    ],
    payment: null,
    createdAt: "2026-10-14"
  },
  {
    id: "PAY-202610-004",
    provider: "Telefónica del Perú S.A.A.",
    concept: "Fibra óptica dedicada 500Mbps y PBX corporativa",
    category: "Telecomunicaciones",
    amount: 920.00,
    currency: "PEN",
    dueDate: "2026-10-23", // In 4 days -> NARANJA
    priority: "Media",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Internet / Teléfono",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-004",
        name: "Factura_Movistar_Fibra_Octubre.pdf",
        type: "application/pdf",
        url: "/uploads/factura_movistar.pdf",
        size: "28 KB",
        uploadDate: "2026-10-11"
      }
    ],
    payment: null,
    createdAt: "2026-10-11"
  },
  {
    id: "PAY-202610-005",
    provider: "Proveedora Papelera Nacional S.A.C.",
    concept: "Lote de papel bond, tóneres y suministros de administración",
    category: "Insumos de Oficina",
    amount: 650.00,
    currency: "PEN",
    dueDate: "2026-10-25", // In 6 days -> NARANJA
    priority: "Media",
    status: "Pendiente",
    isRecurring: false,
    recurringCategory: null,
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-005",
        name: "Factura_Papelera_F002-09812.pdf",
        type: "application/pdf",
        url: "/uploads/factura_papelera.pdf",
        size: "19 KB",
        uploadDate: "2026-10-14"
      }
    ],
    payment: null,
    createdAt: "2026-10-14"
  },
  {
    id: "PAY-202610-006",
    provider: "Inmobiliaria Los Sauces S.A.C.",
    concept: "Renta mensual de local corporativo y 4 estacionamientos",
    category: "Alquiler",
    amount: 5500.00,
    currency: "PEN",
    dueDate: "2026-10-12",
    priority: "Alta",
    status: "Pagado",
    isRecurring: true,
    recurringCategory: "Alquiler",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-006",
        name: "Factura_Alquiler_Local_Octubre.pdf",
        type: "application/pdf",
        url: "/uploads/comprobante_alquiler_banco.pdf",
        size: "45 KB",
        uploadDate: "2026-10-02"
      }
    ],
    payment: {
      paidDate: "2026-10-12T11:45:00",
      paidBy: "Ana Torres (Asistente Contable)",
      method: "Transferencia",
      transactionRef: "BCP-TRANSF-9948271",
      proofFile: {
        name: "Constancia_Transferencia_BCP_5500.pdf",
        type: "application/pdf",
        url: "/uploads/comprobante_alquiler_banco.pdf"
      },
      cashControl: null,
      notes: "Transferido a la cuenta corriente BCP del arrendador."
    },
    createdAt: "2026-10-02"
  },
  {
    id: "PAY-202610-007",
    provider: "Servicios de Limpieza Express",
    concept: "Servicio quincenal de mantenimiento y desinfección integral",
    category: "Mantenimiento",
    amount: 380.00,
    currency: "PEN",
    dueDate: "2026-10-15",
    priority: "Baja",
    status: "Pagado",
    isRecurring: false,
    recurringCategory: null,
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-007",
        name: "Recibo_Limpieza_Quincena1.pdf",
        type: "application/pdf",
        url: "/uploads/vale_caja_chica_limpieza.pdf",
        size: "14 KB",
        uploadDate: "2026-10-05"
      }
    ],
    payment: {
      paidDate: "2026-10-15T16:20:00",
      paidBy: "Ana Torres (Asistente Contable)",
      method: "Efectivo",
      transactionRef: "VALE-CC-1049",
      proofFile: {
        name: "Vale_Caja_Chica_Firmado_380.pdf",
        type: "application/pdf",
        url: "/uploads/vale_caja_chica_limpieza.pdf"
      },
      cashControl: {
        cashVoucherNumber: "VALE-CC-1049",
        cashCustodian: "Caja Chica Administración Central",
        receivedBy: "Marcos Villanueva (DNI 44819201)",
        cashNotes: "Efectivo entregado y liquidado en arqueo de caja chica del día."
      },
      notes: "Pago presencial en efectivo al proveedor con firma de conformidad."
    },
    createdAt: "2026-10-05"
  },
  {
    id: "PAY-202610-008",
    provider: "Consorcio Jurídico & Asociados",
    concept: "Honorarios asesoría legal societaria y laboral mensual",
    category: "Servicios Profesionales",
    amount: 2800.00,
    currency: "PEN",
    dueDate: "2026-10-28", // In 9 days -> BLANCO/NEUTRO
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Legal",
    assignedTo: "Gerente",
    managerAssumed: true,
    managerAssumptionReason: "Negociación directa de addenda contractual con socios del estudio legal.",
    receipts: [
      {
        id: "rec-008",
        name: "Recibo_Honorarios_Juridico.pdf",
        type: "application/pdf",
        url: "/uploads/factura_movistar.pdf",
        size: "30 KB",
        uploadDate: "2026-10-15"
      }
    ],
    payment: null,
    createdAt: "2026-10-15"
  },
  {
    id: "PAY-202610-009",
    provider: "Amazon Web Services Inc.",
    concept: "Hosting servidores cloud y base de datos de producción",
    category: "Tecnología",
    amount: 1350.00,
    currency: "PEN",
    dueDate: "2026-11-04", // In 16 days -> BLANCO (>= 15 días)
    priority: "Media",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Cloud / Servidores",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-009",
        name: "AWS_Invoice_October2026.pdf",
        type: "application/pdf",
        url: "/uploads/factura_movistar.pdf",
        size: "42 KB",
        uploadDate: "2026-10-17"
      }
    ],
    payment: null,
    createdAt: "2026-10-17"
  },

  // Future scheduled (Noviembre 2026)
  {
    id: "PAY-202611-001",
    provider: "Inmobiliaria Los Sauces S.A.C.",
    concept: "Renta programada mes Noviembre 2026",
    category: "Alquiler",
    amount: 5500.00,
    currency: "PEN",
    dueDate: "2026-11-05",
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Alquiler",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [],
    payment: null,
    createdAt: "2026-10-01"
  },
  {
    id: "PAY-202611-002",
    provider: "Sedapal S.A.",
    concept: "Suministro agua potable cuota Noviembre 2026 (Estimado)",
    category: "Servicios Básicos",
    amount: 490.00,
    currency: "PEN",
    dueDate: "2026-11-18",
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Agua",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [],
    payment: null,
    createdAt: "2026-10-01"
  },
  {
    id: "PAY-202611-003",
    provider: "Enel Distribución Perú",
    concept: "Suministro de energía eléctrica cuota Noviembre 2026 (Estimado)",
    category: "Servicios Básicos",
    amount: 1820.00,
    currency: "PEN",
    dueDate: "2026-11-20",
    priority: "Alta",
    status: "Pendiente",
    isRecurring: true,
    recurringCategory: "Luz",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [],
    payment: null,
    createdAt: "2026-10-01"
  },

  // Past debts (Setiembre 2026)
  {
    id: "PAY-202609-001",
    provider: "Inmobiliaria Los Sauces S.A.C.",
    concept: "Renta de local corporativo mes Setiembre 2026",
    category: "Alquiler",
    amount: 5500.00,
    currency: "PEN",
    dueDate: "2026-09-05",
    priority: "Alta",
    status: "Pagado",
    isRecurring: true,
    recurringCategory: "Alquiler",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-091",
        name: "Factura_Alquiler_Set2026.pdf",
        type: "application/pdf",
        url: "/uploads/comprobante_alquiler_banco.pdf",
        size: "38 KB",
        uploadDate: "2026-09-01"
      }
    ],
    payment: {
      paidDate: "2026-09-05T09:15:00",
      paidBy: "Ana Torres (Asistente Contable)",
      method: "Transferencia",
      transactionRef: "BCP-TRANSF-881290",
      proofFile: {
        name: "Constancia_BCP_Setiembre.pdf",
        type: "application/pdf",
        url: "/uploads/comprobante_alquiler_banco.pdf"
      },
      cashControl: null,
      notes: "Cancelado oportunamente sin mora."
    },
    createdAt: "2026-09-01"
  },
  {
    id: "PAY-202609-002",
    provider: "Sedapal S.A.",
    concept: "Agua y saneamiento mes Setiembre 2026",
    category: "Servicios Básicos",
    amount: 470.00,
    currency: "PEN",
    dueDate: "2026-09-18",
    priority: "Alta",
    status: "Pagado",
    isRecurring: true,
    recurringCategory: "Agua",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-092",
        name: "Recibo_Sedapal_Set2026.pdf",
        type: "application/pdf",
        url: "/uploads/recibo_sedapal.pdf",
        size: "20 KB",
        uploadDate: "2026-09-10"
      }
    ],
    payment: {
      paidDate: "2026-09-17T15:00:00",
      paidBy: "Ana Torres (Asistente Contable)",
      method: "Efectivo",
      transactionRef: "VALE-CC-0994",
      proofFile: {
        name: "Vale_Caja_Chica_Sedapal_Set.pdf",
        type: "application/pdf",
        url: "/uploads/vale_caja_chica_limpieza.pdf"
      },
      cashControl: {
        cashVoucherNumber: "VALE-CC-0994",
        cashCustodian: "Caja Chica Administración Central",
        receivedBy: "Cajero Agente Sedapal",
        cashNotes: "Cancelado en efectivo en centro autorizado de cobranza."
      },
      notes: "Pago en efectivo liquidado."
    },
    createdAt: "2026-09-10"
  },
  {
    id: "PAY-202609-003",
    provider: "Enel Distribución Perú",
    concept: "Energía eléctrica mes Setiembre 2026",
    category: "Servicios Básicos",
    amount: 1790.00,
    currency: "PEN",
    dueDate: "2026-09-20",
    priority: "Alta",
    status: "Pagado",
    isRecurring: true,
    recurringCategory: "Luz",
    assignedTo: "Asistente",
    managerAssumed: false,
    managerAssumptionReason: "",
    receipts: [
      {
        id: "rec-093",
        name: "Recibo_Luz_Set2026.pdf",
        type: "application/pdf",
        url: "/uploads/recibo_luz_enel.pdf",
        size: "22 KB",
        uploadDate: "2026-09-12"
      }
    ],
    payment: {
      paidDate: "2026-09-19T11:00:00",
      paidBy: "Ana Torres (Asistente Contable)",
      method: "Transferencia",
      transactionRef: "BBVA-PAG-44281",
      proofFile: {
        name: "Comprobante_BBVA_Enel_Set.pdf",
        type: "application/pdf",
        url: "/uploads/recibo_luz_enel.pdf"
      },
      cashControl: null,
      notes: "Pago por banca empresarial BBVA."
    },
    createdAt: "2026-09-12"
  }
];

const crypto = require('crypto');
initialDebts.forEach(d => {
  if (d.receipts && Array.isArray(d.receipts)) {
    d.receipts.forEach(r => {
      if (r.url && r.url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', r.url);
        if (fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          r.fileHash = crypto.createHash('sha256').update(buf).digest('hex');
          r.verifiedBelongs = true;
          r.recipientCompany = 'TechSolutions Perú S.A.C.';
          r.recipientRuc = '20601827361';
        }
      }
    });
  }
  if (d.payment && d.payment.proofFile) {
    const pf = d.payment.proofFile;
    if (pf.url && pf.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', pf.url);
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        pf.fileHash = crypto.createHash('sha256').update(buf).digest('hex');
        pf.verifiedBelongs = true;
        pf.recipientCompany = 'TechSolutions Perú S.A.C.';
        pf.recipientRuc = '20601827361';
      }
    }
  }
});

fs.writeFileSync('data/debts.json', JSON.stringify(initialDebts, null, 2), 'utf8');
console.log('Seed data and sample PDFs generated successfully!');

