const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'debts.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

function readDebts() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading debts file:', err);
    return [];
  }
}

function writeDebts(debts) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(debts, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving debts file:', err);
    return false;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB max
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        if (!body) return resolve({});
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getSystemDateStrings() {
  const now = new Date();
  const utcDate = now.toISOString().slice(0, 10);
  let limaDate;
  try {
    limaDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  } catch {
    limaDate = utcDate;
  }
  return { utcDate, limaDate };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;
  const query = Object.fromEntries(reqUrl.searchParams.entries());

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API Routes
  if (pathname.startsWith('/api/')) {
    try {
      // POST /api/login (Autenticación para Gerente y Asistente)
      if (pathname === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        if (email === 'gerenteagile@hotmail.com' && password === 'contraseña123') {
          return sendJson(res, 200, {
            success: true,
            user: {
              role: 'gerente',
              name: 'Carlos Mendoza',
              title: 'Gerente General',
              email: 'gerenteagile@hotmail.com'
            }
          });
        } else if (email === 'asistenteagile@hotmail.com' && password === 'contraseña123') {
          return sendJson(res, 200, {
            success: true,
            user: {
              role: 'asistente',
              name: 'Ana Torres',
              title: 'Asistente Contable',
              email: 'asistenteagile@hotmail.com'
            }
          });
        } else {
          return sendJson(res, 401, {
            success: false,
            message: 'Credenciales inválidas. Verifique su correo o contraseña.'
          });
        }
      }

      // GET /api/debts
      if (pathname === '/api/debts' && method === 'GET') {
        const debts = readDebts();
        const monthQuery = query.month; // e.g. "2026-10"

        let filtered = debts;
        if (monthQuery) {
          filtered = debts.filter(d => {
            const debtMonth = d.dueDate ? d.dueDate.substring(0, 7) : '';
            return debtMonth === monthQuery;
          });
        }

        // Sort by dueDate ascending (earliest first, prompt requirement)
        filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return sendJson(res, 200, { success: true, count: filtered.length, data: filtered });
      }

      // GET /api/stats
      if (pathname === '/api/stats' && method === 'GET') {
        const debts = readDebts();
        const monthQuery = query.month || new Date().toISOString().substring(0, 7);

        const monthDebts = debts.filter(d => {
          return d.dueDate && d.dueDate.substring(0, 7) === monthQuery;
        });

        let totalPaid = 0;
        let totalPending = 0;
        let totalCashPaid = 0;
        let totalBankPaid = 0;
        let urgentCount = 0; // Rojo
        let soonCount = 0;   // Naranja
        let managerAssumedCount = 0;

        const { limaDate } = getSystemDateStrings();
        const today = new Date(limaDate + 'T00:00:00');
        today.setHours(0, 0, 0, 0);

        monthDebts.forEach(d => {
          const amt = Number(d.amount) || 0;
          if (d.status === 'Pagado') {
            totalPaid += amt;
            if (d.payment?.method === 'Efectivo') {
              totalCashPaid += amt;
            } else {
              totalBankPaid += amt;
            }
          } else {
            totalPending += amt;

            // Date difference calculation
            const dueDate = new Date(d.dueDate + 'T00:00:00');
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
              urgentCount++;
            } else if (diffDays <= 7) {
              soonCount++;
            }
          }

          if (d.managerAssumed) {
            managerAssumedCount++;
          }
        });

        return sendJson(res, 200, {
          success: true,
          month: monthQuery,
          summary: {
            totalPaid,
            totalPending,
            totalMonth: totalPaid + totalPending,
            totalCashPaid,
            totalBankPaid,
            urgentCount,
            soonCount,
            managerAssumedCount,
            totalCount: monthDebts.length,
            paidCount: monthDebts.filter(d => d.status === 'Pagado').length,
            pendingCount: monthDebts.filter(d => d.status === 'Pendiente').length
          }
        });
      }

      // POST /api/debts (Crear nueva tarea de pago - Asistente)
      if (pathname === '/api/debts' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.provider || body.amount === undefined || !body.dueDate) {
          return sendJson(res, 400, { success: false, message: 'Proveedor, importe y fecha de vencimiento son obligatorios.' });
        }

        const provider = String(body.provider).trim();
        if (provider.length < 3 || provider.length > 100) {
          return sendJson(res, 400, { success: false, message: 'El nombre del proveedor debe tener entre 3 y 100 caracteres.' });
        }
        if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\.,&'\-\(\)]+$/.test(provider)) {
          return sendJson(res, 400, { success: false, message: 'El nombre del proveedor contiene caracteres no permitidos.' });
        }

        const amount = parseFloat(body.amount);
        if (isNaN(amount) || amount < 0.10 || amount > 1000000.00) {
          return sendJson(res, 400, { success: false, message: 'El importe debe ser un número válido entre S/ 0.10 y S/ 1,000,000.00.' });
        }

        const concept = body.concept ? String(body.concept).trim().substring(0, 200) : 'Pago programado';
        const recurringCategory = body.recurringCategory ? String(body.recurringCategory).trim().substring(0, 60) : null;

        const dueMatch = String(body.dueDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!dueMatch) {
          return sendJson(res, 400, { success: false, message: 'La fecha de vencimiento debe tener formato AAAA-MM-DD con año de 4 dígitos.' });
        }
        const dueYear = parseInt(dueMatch[1], 10);
        // Permitir registrar recibos pasados (atrasados) o futuros dentro del rango 2024 - 2027
        if (dueYear < 2024 || dueYear > 2027 || body.dueDate > '2027-12-31') {
          return sendJson(res, 400, {
            success: false,
            message: 'Fecha no permitida. El año de vencimiento debe encontrarse entre 2024 y 2027.'
          });
        }

        const debts = readDebts();
        const { limaDate } = getSystemDateStrings();
        const newId = 'PAY-' + body.dueDate.replace(/-/g, '').substring(0, 6) + '-' + String(debts.length + 1).padStart(3, '0');

        const newDebt = {
          id: newId,
          provider: provider,
          concept: concept,
          category: body.category || 'Varios',
          amount: Math.round(amount * 100) / 100,
          currency: (body.currency === 'USD' ? 'USD' : 'PEN'),
          dueDate: body.dueDate,
          priority: ['Alta', 'Media', 'Baja'].includes(body.priority) ? body.priority : 'Media',
          status: 'Pendiente',
          isRecurring: !!body.isRecurring,
          recurringCategory: recurringCategory,
          assignedTo: 'Asistente',
          managerAssumed: false,
          managerAssumptionReason: '',
          receipts: Array.isArray(body.receipts) ? body.receipts : [],
          payment: null,
          createdAt: limaDate
        };

        debts.push(newDebt);
        writeDebts(debts);

        return sendJson(res, 201, { success: true, message: 'Tarea de pago creada exitosamente.', data: newDebt });
      }

      // PUT /api/debts/:id/pay (Marcar como Pagado - Asistente)
      const payMatch = pathname.match(/^\/api\/debts\/([^/]+)\/pay$/);
      if (payMatch && method === 'PUT') {
        const debtId = decodeURIComponent(payMatch[1]);
        const body = await parseBody(req);

        // Strict Requirement: Comprobante obligatorio (PDF o imagen)
        if (!body.proofFile || (!body.proofFile.url && !body.proofFile.dataUrl)) {
          return sendJson(res, 400, {
            success: false,
            message: 'Requisito obligatorio: Debe adjuntar el comprobante de pago en formato PDF o Imagen para marcar como pagada.'
          });
        }

        // CRITICAL REQUIREMENT: Pagos solo con la fecha del día en que se registran (hoy)
        const { limaDate, utcDate } = getSystemDateStrings();
        const pDateOnly = body.paidDate ? String(body.paidDate).split('T')[0] : limaDate;
        const pMatch = pDateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!pMatch || (pDateOnly !== limaDate && pDateOnly !== utcDate)) {
          return sendJson(res, 400, {
            success: false,
            message: `Fecha de pago no permitida. Los pagos solo pueden registrarse con la fecha de hoy (${limaDate}).`
          });
        }

        const debts = readDebts();
        const index = debts.findIndex(d => d.id === debtId);
        if (index === -1) {
          return sendJson(res, 404, { success: false, message: 'Deuda no encontrada.' });
        }

        const methodType = body.method === 'Efectivo' ? 'Efectivo' : 'Transferencia';

        // Cash payment control
        let cashControl = null;
        let transactionRef = '';
        if (methodType === 'Efectivo') {
          const voucher = (body.cashVoucherNumber || '').trim();
          if (voucher.length < 2 || voucher.length > 30) {
            return sendJson(res, 400, { success: false, message: 'El N° de recibo de caja debe tener entre 2 y 30 caracteres.' });
          }
          const custodian = (body.cashCustodian || 'Caja Chica Administración').trim().substring(0, 60);
          const receivedBy = (body.receivedBy || 'Personal de cobranza / Proveedor').trim().substring(0, 100);

          cashControl = {
            cashVoucherNumber: voucher,
            cashCustodian: custodian,
            receivedBy: receivedBy,
            cashNotes: 'Pago liquidado en efectivo con registro de recibo.'
          };
          transactionRef = voucher;
        } else {
          transactionRef = (body.transactionRef || '').trim().substring(0, 50);
          if (transactionRef.length < 3) {
            return sendJson(res, 400, { success: false, message: 'El N° de operación bancaria debe tener al menos 3 caracteres.' });
          }
        }

        const notes = (body.notes || '').trim().substring(0, 250);

        if (body.updatedAmount !== undefined) {
          const ua = Number(body.updatedAmount);
          if (!isNaN(ua) && ua > 0 && ua <= 1000000) {
            debts[index].amount = Math.round(ua * 100) / 100;
          }
        }

        debts[index].status = 'Pagado';
        debts[index].payment = {
          paidDate: body.paidDate || `${limaDate}T12:00`,
          paidBy: body.paidBy || 'Ana Torres (Asistente Contable)',
          method: methodType,
          transactionRef: transactionRef,
          proofFile: body.proofFile,
          cashControl: cashControl,
          notes: notes
        };

        writeDebts(debts);
        return sendJson(res, 200, { success: true, message: 'Pago registrado y comprobante verificado.', data: debts[index] });
      }

      // PUT /api/debts/:id/assume-manager (Excepción: Gerente asume el pago)
      const assumeMatch = pathname.match(/^\/api\/debts\/([^/]+)\/assume-manager$/);
      if (assumeMatch && method === 'PUT') {
        const debtId = decodeURIComponent(assumeMatch[1]);
        const body = await parseBody(req);

        const reason = (body.reason || '').trim();
        if (reason.length < 5 || reason.length > 300) {
          return sendJson(res, 400, {
            success: false,
            message: 'La justificación de gerencia debe tener entre 5 y 300 caracteres.'
          });
        }

        const debts = readDebts();
        const index = debts.findIndex(d => d.id === debtId);
        if (index === -1) {
          return sendJson(res, 404, { success: false, message: 'Deuda no encontrada.' });
        }

        debts[index].assignedTo = 'Gerente';
        debts[index].managerAssumed = true;
        debts[index].managerAssumptionReason = reason;

        writeDebts(debts);
        return sendJson(res, 200, {
          success: true,
          message: 'Pago asumido bajo supervisión directa de Gerencia.',
          data: debts[index]
        });
      }

      // PUT /api/debts/:id/amount (Alterar monto de servicio recurrente u obligación pendiente)
      const amountMatch = pathname.match(/^\/api\/debts\/([^/]+)\/amount$/);
      if (amountMatch && method === 'PUT') {
        const debtId = decodeURIComponent(amountMatch[1]);
        const body = await parseBody(req);
        const newAmount = Number(body.amount);
        if (isNaN(newAmount) || newAmount <= 0 || newAmount > 1000000) {
          return sendJson(res, 400, {
            success: false,
            message: 'El importe debe ser un número positivo menor o igual a S/ 1,000,000.00'
          });
        }
        const debts = readDebts();
        const index = debts.findIndex(d => d.id === debtId);
        if (index === -1) {
          return sendJson(res, 404, { success: false, message: 'Deuda no encontrada.' });
        }
        if (debts[index].status === 'Pagado') {
          return sendJson(res, 400, { success: false, message: 'No se puede alterar el importe de una deuda que ya fue pagada.' });
        }
        debts[index].amount = Math.round(newAmount * 100) / 100;
        writeDebts(debts);
        return sendJson(res, 200, {
          success: true,
          message: 'Importe actualizado exitosamente.',
          data: debts[index]
        });
      }

      // POST /api/debts/recurring/generate (Generar pagos recurrentes para el mes siguiente)
      if (pathname === '/api/debts/recurring/generate' && method === 'POST') {
        const body = await parseBody(req);
        const targetMonth = body.targetMonth; // e.g. "2026-11"
        if (!targetMonth || !targetMonth.match(/^(\d{4})-(\d{2})$/)) {
          return sendJson(res, 400, { success: false, message: 'targetMonth (YYYY-MM) es inválido.' });
        }
        if (targetMonth < '2026-10' || targetMonth > '2027-12') {
          return sendJson(res, 400, { success: false, message: 'El mes para generación recurrente debe estar entre 2026-10 y 2027-12.' });
        }

        const customAmounts = (body.customAmounts && typeof body.customAmounts === 'object') ? body.customAmounts : {};

        const debts = readDebts();
        // Find existing recurring debts
        const recurringDebts = debts.filter(d => d.isRecurring);

        // Deduplicate templates by provider + concept/recurringCategory
        const templates = new Map();
        recurringDebts.forEach(d => {
          const key = d.provider + '|' + (d.recurringCategory || d.concept);
          if (!templates.has(key)) {
            templates.set(key, d);
          }
        });

        // Check which ones already exist in targetMonth
        const existingInTarget = debts.filter(d => d.dueDate.startsWith(targetMonth));
        const created = [];

        templates.forEach((template, key) => {
          const alreadyExists = existingInTarget.some(d =>
            d.provider === template.provider &&
            (d.recurringCategory === template.recurringCategory || d.concept === template.concept)
          );

          if (!alreadyExists) {
            // Determine day from template due date
            const origDay = template.dueDate ? template.dueDate.substring(8, 10) : '15';
            const newDueDate = `${targetMonth}-${origDay}`;
            const newId = `PAY-${targetMonth.replace('-', '')}-${String(debts.length + created.length + 1).padStart(3, '0')}`;

            // Allow custom variable amount from client input (ej. luz, agua, internet)
            let itemAmount = template.amount;
            if (customAmounts[key] !== undefined) {
              const ca = Number(customAmounts[key]);
              if (!isNaN(ca) && ca > 0 && ca <= 1000000) {
                itemAmount = Math.round(ca * 100) / 100;
              }
            } else if (customAmounts[template.provider] !== undefined) {
              const ca = Number(customAmounts[template.provider]);
              if (!isNaN(ca) && ca > 0 && ca <= 1000000) {
                itemAmount = Math.round(ca * 100) / 100;
              }
            }

            const generatedDebt = {
              id: newId,
              provider: template.provider,
              concept: `${template.recurringCategory || template.concept} (Cuota recurrente)`,
              category: template.category,
              amount: itemAmount,
              currency: template.currency || 'PEN',
              dueDate: newDueDate,
              priority: template.priority || 'Alta',
              status: 'Pendiente',
              isRecurring: true,
              recurringCategory: template.recurringCategory,
              assignedTo: 'Asistente',
              managerAssumed: false,
              managerAssumptionReason: '',
              receipts: [],
              payment: null,
              createdAt: new Date().toISOString().substring(0, 10)
            };
            created.push(generatedDebt);
          }
        });

        if (created.length > 0) {
          debts.push(...created);
          writeDebts(debts);
        }

        return sendJson(res, 200, {
          success: true,
          message: `Se generaron ${created.length} pagos recurrentes para ${targetMonth}.`,
          count: created.length,
          data: created
        });
      }

      // POST /api/upload (Cargar recibo o comprobante)
      if (pathname === '/api/upload' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.fileName || !body.fileData) {
          return sendJson(res, 400, { success: false, message: 'fileName y fileData (base64) son requeridos.' });
        }

        // Clean filename and write
        const safeName = Date.now() + '_' + body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(UPLOADS_DIR, safeName);
        const base64Data = body.fileData.replace(/^data:([A-Za-z-+/]+);base64,/, '');

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const fileUrl = `/uploads/${safeName}`;
        return sendJson(res, 201, {
          success: true,
          url: fileUrl,
          fileName: body.fileName,
          type: body.fileType || 'application/octet-stream'
        });
      }

      // DELETE /api/debts/:id
      const delMatch = pathname.match(/^\/api\/debts\/([^/]+)$/);
      if (delMatch && method === 'DELETE') {
        const debtId = decodeURIComponent(delMatch[1]);
        const debts = readDebts();
        const filtered = debts.filter(d => d.id !== debtId);
        if (filtered.length === debts.length) {
          return sendJson(res, 404, { success: false, message: 'Deuda no encontrada.' });
        }
        writeDebts(filtered);
        return sendJson(res, 200, { success: true, message: 'Registro de deuda eliminado.' });
      }

      return sendJson(res, 404, { success: false, message: 'Endpoint no encontrado.' });
    } catch (apiErr) {
      console.error('API Error:', apiErr);
      return sendJson(res, 500, { success: false, message: 'Error interno del servidor.', error: apiErr.message });
    }
  }

  // Static File Serving
  let filePath;
  if (pathname.startsWith('/uploads/')) {
    filePath = path.join(UPLOADS_DIR, pathname.replace('/uploads/', ''));
  } else {
    const safePath = pathname === '/' ? 'index.html' : pathname;
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR) && !filePath.startsWith(UPLOADS_DIR)) {
    res.writeHead(403);
    return res.end('Access denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for client-side routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (err2, content) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('404 Not Found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(portToUse) {
  server.listen(portToUse, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` SISTEMA DE CONTROL DE PAGOS - CUENTAS POR PAGAR`);
    console.log(` Servidor activo en http://0.0.0.0:${portToUse}`);
    console.log(` Roles: Asistente & Gerente`);
    console.log(`====================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.log(`\n[AVISO] El puerto ${PORT} está en uso. Intentando en http://localhost:${nextPort}...\n`);
    startServer(nextPort);
  } else {
    console.error('Error al iniciar el servidor:', err);
  }
});

startServer(PORT);

