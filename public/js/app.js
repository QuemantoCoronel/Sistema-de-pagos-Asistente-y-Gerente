/**
 * PAYCONTROL ENTERPRISE - SISTEMA DE CONTROL DE CUENTAS POR PAGAR
 * Lógica de frontend con Autenticación (Gerente / Asistente) y Vista Post-it
 */

// Global State
const state = {
  currentUser: null, // { role: 'gerente' | 'asistente', name, title, email }
  currentMonth: '2026-10', // Standardized baseline
  todayDate: new Date('2026-10-19T00:00:00'),
  viewMode: 'postits', // 'postits' (default) or 'table'
  debts: [],
  filteredDebts: [],
  selectedReceiptFile: null,
  selectedPaymentProofFile: null,
  activePaymentMethod: 'Transferencia'
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkSession();
  setupEventListeners();
});

// ==========================================================================
// THEME SETUP & CONTRAST FIX
// ==========================================================================
function initTheme() {
  const saved = localStorage.getItem('paycontrol_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('paycontrol_theme', next);
  showToast(`Modo visual cambiado a: ${next === 'dark' ? 'Oscuro' : 'Claro'}`, 'info');
}

// ==========================================================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================================================
function checkSession() {
  const sessionUser = sessionStorage.getItem('paycontrol_user');
  if (sessionUser) {
    try {
      state.currentUser = JSON.parse(sessionUser);
      showApp();
      return;
    } catch {
      // Invalid session, proceed to login
    }
  }
  showLogin();
}

function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
  document.getElementById('loginErrorAlert').style.display = 'none';
}

function showApp() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';

  // Apply User Profile Info
  const userName = document.getElementById('currentUserName');
  const userTitle = document.getElementById('currentUserTitle');
  const roleBanner = document.getElementById('roleBanner');
  const roleBannerText = document.getElementById('roleBannerText');
  const toolbarActions = document.getElementById('toolbarActions');

  userName.textContent = state.currentUser.name;
  userTitle.textContent = state.currentUser.title;

  if (state.currentUser.role === 'gerente') {
    userTitle.style.color = '#818cf8';
    roleBanner.className = 'role-banner gerente-mode';
    roleBannerText.innerHTML = `
      <strong>Pantalla Principal de Gerencia:</strong> Visualización directa del estado mensual consolidado en formato <strong>Post-it</strong>, ordenadas por vencimiento con código de colores.
      El Gerente no registra deudas ni realiza pagos ordinarios, salvo excepciones donde él mismo indique que se encargará.
    `;

    toolbarActions.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge-pill indigo" style="padding: 6px 12px; font-size: 0.8rem;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Supervisión Gerencial
        </span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="window.print()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Exportar
        </button>
      </div>
    `;
  } else {
    // Asistente Role
    userTitle.style.color = 'var(--accent-primary)';
    roleBanner.className = 'role-banner asistente-mode';
    roleBannerText.innerHTML = `
      <strong>Modo Operativo (Asistente):</strong> Encargada de crear tareas de pago, recibir y adjuntar recibos/facturas, ejecutar los pagos (subiendo obligatoriamente el comprobante) y registrar el control de pagos en efectivo.
    `;

    toolbarActions.innerHTML = `
      <button type="button" class="btn btn-primary" id="btnNewDebt" onclick="openNewDebtModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nueva Tarea de Pago
      </button>
      <button type="button" class="btn btn-secondary" id="btnRecurringMonth" onclick="openRecurringModal()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Recurrentes Próximo Mes (Agua, Luz...)
      </button>
    `;
  }

  loadData();
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  // Validate credentials
  let authenticatedUser = null;
  if (email === 'gerenteagile@hotmail.com' && password === 'contraseña123') {
    authenticatedUser = {
      role: 'gerente',
      name: 'Carlos Mendoza',
      title: 'Gerente General',
      email: 'gerenteagile@hotmail.com'
    };
  } else if (email === 'asistenteagile@hotmail.com' && password === 'contraseña123') {
    authenticatedUser = {
      role: 'asistente',
      name: 'Ana Torres',
      title: 'Asistente Contable',
      email: 'asistenteagile@hotmail.com'
    };
  }

  if (authenticatedUser) {
    state.currentUser = authenticatedUser;
    sessionStorage.setItem('paycontrol_user', JSON.stringify(authenticatedUser));
    showToast(`Bienvenido al sistema, ${authenticatedUser.name}`, 'success');
    showApp();
  } else {
    const errorAlert = document.getElementById('loginErrorAlert');
    errorAlert.textContent = 'Credenciales incorrectas. Verifique su correo o contraseña.';
    errorAlert.style.display = 'block';
  }
}

function fillAndLogin(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
}

function handleLogout() {
  sessionStorage.removeItem('paycontrol_user');
  state.currentUser = null;
  document.getElementById('loginForm').reset();
  showLogin();
  showToast('Sesión cerrada correctamente.', 'info');
}

// ==========================================================================
// VIEW MODE SWITCHER (Post-its vs Tabla)
// ==========================================================================
function setViewMode(mode) {
  state.viewMode = mode;
  const btnPostits = document.getElementById('btnViewPostits');
  const btnTable = document.getElementById('btnViewTable');
  const postitGrid = document.getElementById('postitGrid');
  const tableWrapper = document.getElementById('tableWrapper');

  if (mode === 'postits') {
    btnPostits.classList.add('active');
    btnTable.classList.remove('active');
    postitGrid.style.display = 'grid';
    tableWrapper.style.display = 'none';
  } else {
    btnTable.classList.add('active');
    btnPostits.classList.remove('active');
    postitGrid.style.display = 'none';
    tableWrapper.style.display = 'block';
  }
}

// ==========================================================================
// DOM LISTENERS & DROPZONES
// ==========================================================================
function setupEventListeners() {
  setupDropzone('dropzoneReceipt', 'fileReceipt', handleFileReceiptSelect);
  setupDropzone('dropzonePaymentProof', 'filePaymentProof', handleFilePaymentProofSelect);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
}

function setupDropzone(dropzoneId, inputId, onSelectFn) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  if (!dropzone || !input) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      input.files = e.dataTransfer.files;
      onSelectFn(input);
    }
  });
}

// ==========================================================================
// DATA FETCHING & API INTERACTION
// ==========================================================================
async function loadData() {
  try {
    const res = await fetch(`/api/debts?month=${state.currentMonth}`);
    if (res.ok) {
      const json = await res.json();
      state.debts = json.data || [];
    } else {
      loadLocalFallback();
    }
  } catch (e) {
    loadLocalFallback();
  }

  updateMonthDisplay();
  applyFiltersAndRender();
  updateSummaryKPIs();
}

function loadLocalFallback() {
  const local = localStorage.getItem('paycontrol_debts');
  if (local) {
    try {
      const all = JSON.parse(local);
      state.debts = all.filter(d => d.dueDate && d.dueDate.startsWith(state.currentMonth));
    } catch {
      state.debts = [];
    }
  }
}

function saveLocalFallback(allDebts) {
  try {
    localStorage.setItem('paycontrol_debts', JSON.stringify(allDebts));
  } catch (e) {
    console.error('Local storage save error', e);
  }
}

// ==========================================================================
// MONTH NAVIGATION
// ==========================================================================
function navigateMonth(offset) {
  const parts = state.currentMonth.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + offset;

  if (month < 1) {
    month = 12;
    year--;
  } else if (month > 12) {
    month = 1;
    year++;
  }

  state.currentMonth = `${year}-${String(month).padStart(2, '0')}`;
  syncMonthSelect();
  loadData();
}

function onMonthPickerChange(val) {
  state.currentMonth = val;
  loadData();
}

function syncMonthSelect() {
  const sel = document.getElementById('monthPickerSelect');
  if (sel) {
    let exists = false;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === state.currentMonth) {
        sel.selectedIndex = i;
        exists = true;
        break;
      }
    }
    if (!exists) {
      const parts = state.currentMonth.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      const opt = document.createElement('option');
      opt.value = state.currentMonth;
      opt.textContent = `${MONTH_NAMES[m - 1]} ${y}`;
      sel.appendChild(opt);
      sel.value = state.currentMonth;
    }
  }
}

function updateMonthDisplay() {
  const parts = state.currentMonth.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  const monthName = MONTH_NAMES[m - 1] || '';

  const displayEl = document.getElementById('currentMonthDisplay');
  const subEl = document.getElementById('currentMonthSub');

  if (displayEl) displayEl.textContent = `${monthName} ${y}`;
  if (subEl) {
    if (state.currentMonth === '2026-10') {
      subEl.textContent = 'Periodo Actual';
    } else if (state.currentMonth < '2026-10') {
      subEl.textContent = 'Periodo Pasado (Historial)';
    } else {
      subEl.textContent = 'Periodo Futuro (Programado)';
    }
  }
}

// ==========================================================================
// DATE CONSTRAINTS & 4-DIGIT YEAR ENFORCEMENT
// ==========================================================================
const MIN_ALLOWED_DATE = '2026-09-01';
const MAX_ALLOWED_DATE = '2027-12-31';

function validateYearDigits(input, isDateTime = false) {
  if (!input || !input.value) return;
  const val = input.value;
  const parts = val.split('-');
  if (parts.length > 0 && parts[0].length > 4) {
    // Truncate year to 4 digits immediately
    const year4 = parts[0].slice(0, 4);
    parts[0] = year4;
    input.value = parts.join('-');
  }
}

function enforceDateBounds(input, isDateTime = false) {
  if (!input || !input.value) return;
  const val = input.value;
  const dateOnly = isDateTime ? val.split('T')[0] : val;
  const parts = dateOnly.split('-');
  
  if (parts.length < 3) return;
  
  const year = parseInt(parts[0], 10);
  if (isNaN(year) || parts[0].length !== 4 || year < 2026 || year > 2027) {
    showToast('Año no válido. El año debe tener exactamente 4 dígitos y estar entre 2026 y 2027.', 'error');
    input.value = isDateTime ? `${state.currentMonth}-25T12:00` : `${state.currentMonth}-25`;
    return;
  }
  
  const minVal = isDateTime ? `${MIN_ALLOWED_DATE}T00:00` : MIN_ALLOWED_DATE;
  const maxVal = isDateTime ? `${MAX_ALLOWED_DATE}T23:59` : MAX_ALLOWED_DATE;
  
  if (input.value < minVal) {
    showToast('Fecha no permitida. No puede ser anterior a Setiembre 2026.', 'error');
    input.value = minVal;
  } else if (input.value > maxVal) {
    showToast('Fecha no permitida. No puede ser posterior a Diciembre 2027.', 'error');
    input.value = maxVal;
  }
}

function isValidAppDate(dateStr, isDateTime = false) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const dateOnly = isDateTime ? dateStr.split('T')[0] : dateStr;
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [_, y, m, d] = match;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (y.length !== 4 || year < 2026 || year > 2027) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (dateOnly < MIN_ALLOWED_DATE || dateOnly > MAX_ALLOWED_DATE) return false;
  return true;
}

// ==========================================================================
// COLOR CODING CALCULATION (CRITICAL SPECIFICATION)
// Rojo: Vence al día siguiente o ya se encuentra vencido (diff <= 1)
// Naranja: Vence en una semana (1 < diff <= 7)
// Blanco: Faltan 15 días o más para el vencimiento (diff >= 15)
// Verde: Pagado con comprobante
// ==========================================================================
function calculateDueAlert(dueDateStr, isPaid) {
  if (isPaid) {
    return {
      cssClass: 'row-status-paid',
      postitClass: 'status-paid',
      badgeClass: 'status-pill-paid',
      label: 'PAGADO ✓',
      diffDays: null,
      urgency: 'paid'
    };
  }

  const [y, m, d] = dueDateStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const today = state.todayDate;

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 1. ROJO: Vence al día siguiente o ya se encuentra vencido
  if (diffDays <= 1) {
    let text = 'Vence mañana';
    if (diffDays === 0) text = '¡Vence HOY!';
    if (diffDays < 0) text = `Vencido (${Math.abs(diffDays)}d)`;

    return {
      cssClass: 'row-status-red',
      postitClass: 'status-red',
      badgeClass: 'status-pill-red',
      label: text,
      diffDays: diffDays,
      urgency: 'red'
    };
  }

  // 2. NARANJA: Vence en una semana (2 a 7 días)
  if (diffDays > 1 && diffDays <= 7) {
    return {
      cssClass: 'row-status-orange',
      postitClass: 'status-orange',
      badgeClass: 'status-pill-orange',
      label: `Vence en ${diffDays} días`,
      diffDays: diffDays,
      urgency: 'orange'
    };
  }

  // 3. BLANCO / NEUTRO: Faltan 15 días o más
  if (diffDays >= 15) {
    return {
      cssClass: 'row-status-white',
      postitClass: 'status-white',
      badgeClass: 'status-pill-white',
      label: `Faltan ${diffDays} días`,
      diffDays: diffDays,
      urgency: 'white'
    };
  }

  // 4. Intermedio: 8 a 14 días
  return {
    cssClass: 'row-status-neutral',
    postitClass: 'status-white',
    badgeClass: 'status-pill-neutral',
    label: `En ${diffDays} días`,
    diffDays: diffDays,
    urgency: 'neutral'
  };
}

// ==========================================================================
// FILTERING & RENDERING (ORDEN: EL MÁS PRONTO A VENCERSE PRIMERO)
// ==========================================================================
function onFilterChange() {
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('statusFilter')?.value || 'all';

  // STRICT ORDERING: Earliest due date first (el más pronto a vencerse primero)
  const sorted = [...state.debts].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  state.filteredDebts = sorted.filter(d => {
    const text = `${d.provider} ${d.concept} ${d.category} ${d.id}`.toLowerCase();
    if (search && !text.includes(search)) return false;

    if (filter === 'pending' && d.status !== 'Pendiente') return false;
    if (filter === 'paid' && d.status !== 'Pagado') return false;
    if (filter === 'manager' && !d.managerAssumed) return false;
    if (filter === 'urgent') {
      const alert = calculateDueAlert(d.dueDate, d.status === 'Pagado');
      if (alert.urgency !== 'red') return false;
    }

    return true;
  });

  renderPostits();
  renderDebtsTable();
  updateSummaryKPIs();
}

// ==========================================================================
// RENDER 1: POST-IT GRID VIEW (VISTA PRINCIPAL DE NOTAS ADHESIVAS)
// ==========================================================================
function renderPostits() {
  const grid = document.getElementById('postitGrid');
  const emptyState = document.getElementById('emptyState');
  if (!grid) return;

  grid.innerHTML = '';

  if (state.filteredDebts.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  const isGerente = state.currentUser?.role === 'gerente';

  state.filteredDebts.forEach(d => {
    const isPaid = d.status === 'Pagado';
    const alert = calculateDueAlert(d.dueDate, isPaid);
    const priorityClass = d.priority === 'Alta' ? 'priority-alta' : (d.priority === 'Media' ? 'priority-media' : 'priority-baja');

    const card = document.createElement('div');
    card.className = `postit-card ${alert.postitClass}`;
    card.id = `postit-${d.id}`;

    // Receipts tag
    const receiptCount = d.receipts ? d.receipts.length : 0;
    let receiptBtn = '';
    if (receiptCount > 0) {
      receiptBtn = `
        <button type="button" class="doc-btn has-doc" onclick="viewReceipts('${d.id}')" title="Ver recibo / factura adjunta">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Recibo (${receiptCount})
        </button>
      `;
    }

    // Payment proof button
    let proofBtn = '';
    if (isPaid && d.payment?.proofFile) {
      proofBtn = `
        <button type="button" class="doc-btn has-proof" onclick="viewPaymentProof('${d.id}')" title="Ver comprobante de pago verificado">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Comprobante
        </button>
      `;
    }

    // Role-dependent Actions
    let actionBtnHtml = '';
    if (isPaid) {
      actionBtnHtml = `
        <div style="display: flex; align-items: center; gap: 6px;">
          ${proofBtn}
          <div class="stamp-paid-badge">PAGADO ✓</div>
        </div>
      `;
    } else {
      if (!isGerente) {
        if (d.managerAssumed) {
          // Assistant sees button indicating it is managed by manager
          actionBtnHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
              ${receiptBtn}
              <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')" title="El gerente general se encargará directamente de este pago">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Gestionado por el gerente
              </button>
            </div>
          `;
        } else {
          // Normal Assistant can pay
          actionBtnHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
              ${receiptBtn}
              <button type="button" class="btn btn-success btn-sm" onclick="openPayModal('${d.id}')" title="Pagar con comprobante obligatorio">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Pagar
              </button>
            </div>
          `;
        }
      } else {
        // Manager view
        if (!d.managerAssumed) {
          actionBtnHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
              ${receiptBtn}
              <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1;" onclick="openManagerAssumeModal('${d.id}')" title="Excepción: El gerente asume realizar este pago">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Asumir Pago
              </button>
            </div>
          `;
        } else {
          actionBtnHtml = `
            <div style="display: flex; align-items: center; gap: 6px;">
              ${receiptBtn}
              <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')" title="Ver detalles de la gestión de gerencia">
                Gestionando
              </button>
            </div>
          `;
        }
      }
    }

    // Cash indicator
    let cashInfoHtml = '';
    if (isPaid && d.payment?.method === 'Efectivo') {
      cashInfoHtml = `
        <span class="cash-badge" title="N° Recibo: ${d.payment.cashControl?.cashVoucherNumber}">
          Efectivo (${d.payment.cashControl?.cashVoucherNumber})
        </span>
      `;
    }

    // Manager assumed banner on card
    let managerBannerHtml = '';
    if (d.managerAssumed && !isPaid) {
      managerBannerHtml = `
        <div class="manager-assumed-badge" style="margin-bottom: 10px; width: 100%; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Asumido directamente por Gerencia General
        </div>
      `;
    }

    card.innerHTML = `
      <div class="postit-tape"></div>

      <div>
        <div class="postit-header">
          <span class="postit-urgency-tag">${alert.label}</span>
          <span class="priority-pill ${priorityClass}">Prioridad ${escapeHtml(d.priority)}</span>
        </div>

        <div class="postit-body">
          <h3 class="postit-provider">${escapeHtml(d.provider)}</h3>
          <p class="postit-concept">${escapeHtml(d.concept)}</p>

          <div class="postit-tags-row">
            <span class="category-tag">${escapeHtml(d.category || 'General')}</span>
            ${d.isRecurring ? `<span class="category-tag" style="color: #0891b2; border-color: rgba(6, 182, 212, 0.4);">&#8635; Recurrente (${escapeHtml(d.recurringCategory || 'Fijo')})</span>` : ''}
            ${cashInfoHtml}
          </div>

          ${managerBannerHtml}

          <div class="postit-amount-box">
            <span class="postit-amount-label">Monto a Liquidar</span>
            <span class="postit-amount-value">${d.currency || 'S/'} ${formatMoney(d.amount)}</span>
          </div>

          <div class="postit-date-row">
            <span>Fecha de Vencimiento:</span>
            <span class="postit-date-val">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(d.dueDate)}
            </span>
          </div>
        </div>
      </div>

      <div class="postit-footer">
        ${actionBtnHtml}
      </div>
    `;

    grid.appendChild(card);
  });
}

// ==========================================================================
// RENDER 2: TABLE VIEW (VISTA SECUNDARIA ALTERNATIVA)
// ==========================================================================
function renderDebtsTable() {
  const tbody = document.getElementById('debtsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const isGerente = state.currentUser?.role === 'gerente';

  state.filteredDebts.forEach(d => {
    const isPaid = d.status === 'Pagado';
    const alert = calculateDueAlert(d.dueDate, isPaid);
    const priorityClass = d.priority === 'Alta' ? 'priority-alta' : (d.priority === 'Media' ? 'priority-media' : 'priority-baja');

    const tr = document.createElement('tr');
    tr.className = alert.cssClass;

    const receiptCount = d.receipts ? d.receipts.length : 0;
    const receiptsHtml = receiptCount > 0 ? `
      <button type="button" class="doc-btn has-doc" onclick="viewReceipts('${d.id}')">
        ${receiptCount} Recibo${receiptCount > 1 ? 's' : ''}
      </button>
    ` : `<span style="font-size: 0.74rem; color: var(--text-dim);">-</span>`;

    let paymentColHtml = '';
    if (isPaid && d.payment) {
      const isCash = d.payment.method === 'Efectivo';
      paymentColHtml = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <button type="button" class="doc-btn has-proof" onclick="viewPaymentProof('${d.id}')">
            Comprobante
          </button>
          ${isCash ? `
            <span class="cash-badge">${d.payment.cashControl?.cashVoucherNumber || 'Recibo'}</span>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-muted);">Transf. ${d.payment.transactionRef ? d.payment.transactionRef.substring(0, 10) : ''}</span>
          `}
        </div>
      `;
    } else {
      paymentColHtml = `<span style="font-size: 0.74rem; color: var(--text-dim);">Pendiente</span>`;
    }

    let actionColHtml = '';
    if (isPaid) {
      actionColHtml = `<span class="badge-pill green">Pagado</span>`;
    } else if (!isGerente) {
      if (d.managerAssumed) {
        actionColHtml = `
          <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')" title="El gerente general se encargará de este pago">
            Gestionado por el gerente
          </button>
        `;
      } else {
        actionColHtml = `
          <button type="button" class="btn btn-success btn-sm" onclick="openPayModal('${d.id}')">
            Pagar
          </button>
        `;
      }
    } else {
      if (!d.managerAssumed) {
        actionColHtml = `
          <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1;" onclick="openManagerAssumeModal('${d.id}')">
            Asumir
          </button>
        `;
      } else {
        actionColHtml = `
          <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')">
            Gestionando
          </button>
        `;
      }
    }

    tr.innerHTML = `
      <td>
        <div class="date-cell">
          <span class="date-value">${formatDate(d.dueDate)}</span>
          <span class="${alert.badgeClass}">${alert.label}</span>
        </div>
      </td>
      <td>
        <div class="provider-cell">
          <span class="provider-name">${escapeHtml(d.provider)}</span>
          <span class="category-tag">${escapeHtml(d.category || 'General')}</span>
        </div>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(d.concept)}</div>
      </td>
      <td>
        <span class="priority-pill ${priorityClass}">${escapeHtml(d.priority)}</span>
      </td>
      <td style="text-align: right;">
        <span class="amount-cell ${isPaid ? 'paid' : ''}">${d.currency || 'S/'} ${formatMoney(d.amount)}</span>
      </td>
      <td style="text-align: center;">
        ${receiptsHtml}
      </td>
      <td style="text-align: center;">
        ${isPaid ? '<span class="badge-pill green">PAGADO</span>' : '<span class="badge-pill amber">PENDIENTE</span>'}
      </td>
      <td style="text-align: center;">
        ${paymentColHtml}
      </td>
      <td style="text-align: center;">
        ${actionColHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// SUMMARY METRICS CALCULATION
// ==========================================================================
function updateSummaryKPIs() {
  let totalPaid = 0;
  let totalPending = 0;
  let totalCash = 0;
  let totalBank = 0;
  let urgentCount = 0;
  let soonCount = 0;
  let paidCount = 0;
  let cashCount = 0;

  state.debts.forEach(d => {
    const amt = Number(d.amount) || 0;
    if (d.status === 'Pagado') {
      totalPaid += amt;
      paidCount++;
      if (d.payment?.method === 'Efectivo') {
        totalCash += amt;
        cashCount++;
      } else {
        totalBank += amt;
      }
    } else {
      totalPending += amt;
      const alert = calculateDueAlert(d.dueDate, false);
      if (alert.urgency === 'red') {
        urgentCount++;
      } else if (alert.urgency === 'orange') {
        soonCount++;
      }
    }
  });

  const totalMonth = totalPaid + totalPending;
  const percentPaid = totalMonth > 0 ? Math.round((totalPaid / totalMonth) * 100) : 0;

  const kpiTotalPaid = document.getElementById('kpiTotalPaid');
  const kpiPaidPercent = document.getElementById('kpiPaidPercent');
  const kpiPaidCount = document.getElementById('kpiPaidCount');
  const kpiTotalPending = document.getElementById('kpiTotalPending');
  const kpiPendingCount = document.getElementById('kpiPendingCount');
  const kpiUrgentCount = document.getElementById('kpiUrgentCount');
  const kpiSoonCount = document.getElementById('kpiSoonCount');
  const kpiCashTotal = document.getElementById('kpiCashTotal');
  const kpiCashCount = document.getElementById('kpiCashCount');
  const kpiBankTotal = document.getElementById('kpiBankTotal');

  if (kpiTotalPaid) kpiTotalPaid.textContent = `S/ ${formatMoney(totalPaid)}`;
  if (kpiPaidPercent) kpiPaidPercent.textContent = `${percentPaid}% liquidado`;
  if (kpiPaidCount) kpiPaidCount.textContent = `${paidCount} de ${state.debts.length} pagos`;
  if (kpiTotalPending) kpiTotalPending.textContent = `S/ ${formatMoney(totalPending)}`;
  if (kpiPendingCount) kpiPendingCount.textContent = `${state.debts.length - paidCount} pendientes`;
  if (kpiUrgentCount) kpiUrgentCount.textContent = urgentCount;
  if (kpiSoonCount) kpiSoonCount.textContent = `+${soonCount} esta semana`;
  if (kpiCashTotal) kpiCashTotal.textContent = `S/ ${formatMoney(totalCash)}`;
  if (kpiCashCount) kpiCashCount.textContent = `${cashCount} arqueo${cashCount !== 1 ? 's' : ''}`;
  if (kpiBankTotal) kpiBankTotal.textContent = `Banco: S/ ${formatMoney(totalBank)}`;
}

// ==========================================================================
// MODALS LOGIC (NEW DEBT, PAY DEBT, MANAGER ASSUME, DOC VIEWER, RECURRING)
// ==========================================================================
function openNewDebtModal() {
  if (state.currentUser?.role !== 'asistente') {
    showToast('Solo el asistente contable puede crear tareas de pago.', 'error');
    return;
  }

  const inpDueDate = document.getElementById('inpDueDate');
  if (inpDueDate) {
    inpDueDate.min = MIN_ALLOWED_DATE;
    inpDueDate.max = MAX_ALLOWED_DATE;
    inpDueDate.value = `${state.currentMonth}-25`;
  }

  state.selectedReceiptFile = null;
  document.getElementById('receiptPreviewContainer').innerHTML = '';
  document.getElementById('formNewDebt').reset();
  document.getElementById('groupRecurringCategory').style.display = 'none';

  openModal('modalNewDebt');
}

function toggleRecurringOptions(isRecurring) {
  const grp = document.getElementById('groupRecurringCategory');
  if (grp) grp.style.display = isRecurring ? 'block' : 'none';
}

function handleFileReceiptSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    state.selectedReceiptFile = {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`,
      dataUrl: e.target.result
    };

    const container = document.getElementById('receiptPreviewContainer');
    container.innerHTML = `
      <div class="file-preview-pill">
        <div class="file-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);">(${state.selectedReceiptFile.size})</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeSelectedReceipt()">Quitar</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function removeSelectedReceipt() {
  state.selectedReceiptFile = null;
  document.getElementById('fileReceipt').value = '';
  document.getElementById('receiptPreviewContainer').innerHTML = '';
}

async function handleCreateDebt(e) {
  e.preventDefault();

  const provider = document.getElementById('inpProvider').value.trim();
  const concept = document.getElementById('inpConcept').value.trim();
  const amount = parseFloat(document.getElementById('inpAmount').value);
  const dueDate = document.getElementById('inpDueDate').value;
  const priority = document.getElementById('inpPriority').value;
  const category = document.getElementById('inpCategory').value;
  const isRecurring = document.getElementById('inpIsRecurring').checked;
  const recurringCategory = document.getElementById('inpRecurringCategory').value.trim() || category;

  if (!provider || !amount || !dueDate) {
    showToast('Por favor completa todos los campos requeridos.', 'error');
    return;
  }

  if (!isValidAppDate(dueDate)) {
    showToast('Fecha de vencimiento no válida. El año debe tener 4 dígitos y encontrarse entre Setiembre 2026 y Diciembre 2027.', 'error');
    return;
  }

  const receipts = [];
  if (state.selectedReceiptFile) {
    receipts.push({
      id: 'rec-' + Date.now(),
      name: state.selectedReceiptFile.name,
      type: state.selectedReceiptFile.type,
      size: state.selectedReceiptFile.size,
      url: state.selectedReceiptFile.dataUrl,
      uploadDate: new Date().toISOString().substring(0, 10)
    });
  }

  const payload = {
    provider,
    concept: concept || 'Pago de cuentas por pagar',
    amount,
    currency: 'PEN',
    dueDate,
    priority,
    category,
    isRecurring,
    recurringCategory: isRecurring ? recurringCategory : null,
    receipts
  };

  try {
    const res = await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Tarea de pago creada exitosamente.', 'success');
      closeModal('modalNewDebt');
      loadData();
    } else {
      throw new Error();
    }
  } catch {
    const newId = 'PAY-' + dueDate.replace(/-/g, '').substring(0, 6) + '-' + String(state.debts.length + 1).padStart(3, '0');
    state.debts.push({
      id: newId,
      ...payload,
      status: 'Pendiente',
      assignedTo: 'Asistente',
      managerAssumed: false,
      managerAssumptionReason: '',
      payment: null,
      createdAt: new Date().toISOString().substring(0, 10)
    });
    saveLocalFallback(state.debts);
    showToast('Tarea creada localmente.', 'success');
    closeModal('modalNewDebt');
    applyFiltersAndRender();
  }
}

// ==========================================================================
// MODAL 2: PAY DEBT (MANDATORY PROOF & CASH CONTROLS)
// ==========================================================================
function openPayModal(debtId) {
  if (state.currentUser?.role !== 'asistente') {
    showToast('Solo el asistente puede registrar pagos en el sistema.', 'error');
    return;
  }

  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;

  document.getElementById('payDebtId').value = debt.id;
  document.getElementById('payDebtProvider').textContent = debt.provider;
  document.getElementById('payDebtConcept').textContent = debt.concept;
  document.getElementById('payDebtAmount').textContent = `${debt.currency || 'S/'} ${formatMoney(debt.amount)}`;

  const now = new Date();
  const localIsoDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const inpPayDate = document.getElementById('inpPayDate');
  if (inpPayDate) {
    inpPayDate.min = `${MIN_ALLOWED_DATE}T00:00`;
    inpPayDate.max = `${MAX_ALLOWED_DATE}T23:59`;
    inpPayDate.value = localIsoDate;
  }
  document.getElementById('inpTransferRef').value = `OP-${Date.now().toString().slice(-6)}`;
  document.getElementById('inpCashVoucher').value = `REC-${Math.floor(1000 + Math.random() * 9000)}`;

  state.selectedPaymentProofFile = null;
  document.getElementById('filePaymentProof').value = '';
  document.getElementById('paymentProofPreviewContainer').innerHTML = '';
  document.getElementById('btnSubmitPayment').disabled = true;
  document.getElementById('dropzonePaymentProof').classList.add('required-missing');

  selectPaymentMethod('Transferencia');
  openModal('modalPayDebt');
}

function selectPaymentMethod(method) {
  state.activePaymentMethod = method;
  document.getElementById('inpPaymentMethod').value = method;

  const btnTransfer = document.getElementById('btnMethodTransfer');
  const btnCash = document.getElementById('btnMethodCash');
  const transferGroup = document.getElementById('transferControlsGroup');
  const cashGroup = document.getElementById('cashControlsGroup');

  if (method === 'Transferencia') {
    btnTransfer.style.borderColor = 'var(--accent-primary)';
    btnTransfer.style.background = 'rgba(59, 130, 246, 0.15)';
    btnCash.style.borderColor = 'var(--border-medium)';
    btnCash.style.background = 'transparent';

    transferGroup.style.display = 'block';
    cashGroup.style.display = 'none';
  } else {
    btnCash.style.borderColor = '#0891b2';
    btnCash.style.background = 'rgba(6, 182, 212, 0.15)';
    btnTransfer.style.borderColor = 'var(--border-medium)';
    btnTransfer.style.background = 'transparent';

    transferGroup.style.display = 'none';
    cashGroup.style.display = 'block';
  }
}

function handleFilePaymentProofSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    state.selectedPaymentProofFile = {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`,
      dataUrl: e.target.result,
      url: e.target.result
    };

    const container = document.getElementById('paymentProofPreviewContainer');
    container.innerHTML = `
      <div class="file-preview-pill" style="border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08);">
        <div class="file-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="file-name" style="color: #10b981;">${escapeHtml(file.name)}</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);">(${state.selectedPaymentProofFile.size})</span>
          <span class="badge-pill green" style="margin-left: 8px;">COMPROBANTE VÁLIDO</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeSelectedProof()">Cambiar</button>
      </div>
    `;

    document.getElementById('btnSubmitPayment').disabled = false;
    document.getElementById('dropzonePaymentProof').classList.remove('required-missing');
  };
  reader.readAsDataURL(file);
}

function removeSelectedProof() {
  state.selectedPaymentProofFile = null;
  document.getElementById('filePaymentProof').value = '';
  document.getElementById('paymentProofPreviewContainer').innerHTML = '';
  document.getElementById('btnSubmitPayment').disabled = true;
  document.getElementById('dropzonePaymentProof').classList.add('required-missing');
}

async function handleExecutePayment(e) {
  e.preventDefault();

  if (!state.selectedPaymentProofFile) {
    showToast('REQUISITO OBLIGATORIO: Adjunte el comprobante en formato PDF o Imagen para marcar como pagada.', 'error');
    return;
  }

  const debtId = document.getElementById('payDebtId').value;
  const method = state.activePaymentMethod;
  const payDate = document.getElementById('inpPayDate').value;
  const notes = document.getElementById('inpPaymentNotes').value.trim();

  if (payDate && !isValidAppDate(payDate, true)) {
    showToast('Fecha de pago no válida. El año debe tener 4 dígitos y encontrarse entre Setiembre 2026 y Diciembre 2027.', 'error');
    return;
  }

  let cashControl = null;
  let transactionRef = '';

  if (method === 'Efectivo') {
    const voucher = document.getElementById('inpCashVoucher').value.trim();
    const custodian = document.getElementById('inpCashCustodian').value.trim() || 'Caja Chica Administración';
    const receiverRole = document.getElementById('inpCashReceiverRole')?.value || 'Cobrador / Proveedor';
    const receiverDetail = document.getElementById('inpCashReceiver')?.value.trim();

    if (!voucher) {
      showToast('Por favor ingresa el N° de recibo del pago.', 'error');
      return;
    }

    const receivedBy = receiverDetail ? `${receiverRole} - ${receiverDetail}` : receiverRole;

    cashControl = {
      cashVoucherNumber: voucher,
      cashCustodian: custodian,
      receivedBy: receivedBy,
      receiverRole: receiverRole,
      cashNotes: 'Pago liquidado en efectivo con registro de recibo.'
    };
    transactionRef = voucher;
  } else {
    transactionRef = document.getElementById('inpTransferRef').value.trim() || 'TRANSF-BCP';
  }

  const payload = {
    method,
    paidDate: payDate,
    paidBy: `${state.currentUser.name} (${state.currentUser.title})`,
    transactionRef,
    proofFile: {
      name: state.selectedPaymentProofFile.name,
      type: state.selectedPaymentProofFile.type,
      url: state.selectedPaymentProofFile.url || state.selectedPaymentProofFile.dataUrl,
      dataUrl: state.selectedPaymentProofFile.dataUrl
    },
    cashControl,
    cashVoucherNumber: cashControl?.cashVoucherNumber,
    cashCustodian: cashControl?.cashCustodian,
    receivedBy: cashControl?.receivedBy,
    notes
  };

  try {
    const res = await fetch(`/api/debts/${encodeURIComponent(debtId)}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showToast('Pago registrado y comprobante verificado exitosamente.', 'success');
      closeModal('modalPayDebt');
      loadData();
    } else {
      const errJson = await res.json();
      throw new Error(errJson.message || 'Error en servidor');
    }
  } catch (err) {
    const idx = state.debts.findIndex(d => d.id === debtId);
    if (idx !== -1) {
      state.debts[idx].status = 'Pagado';
      state.debts[idx].payment = payload;
      saveLocalFallback(state.debts);
      showToast('Pago registrado localmente.', 'success');
      closeModal('modalPayDebt');
      applyFiltersAndRender();
    }
  }
}

// ==========================================================================
// MODAL 3: EXCEPCIÓN GERENTE (ASUMIR PAGO DIRECTAMENTE)
// ==========================================================================
function openManagerAssumeModal(debtId) {
  if (state.currentUser?.role !== 'gerente') {
    showToast('Solo el Gerente General puede asumir pagos directos.', 'error');
    return;
  }

  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;

  document.getElementById('assumeDebtId').value = debt.id;
  document.getElementById('assumeProvider').textContent = debt.provider;
  document.getElementById('assumeAmount').textContent = `${debt.currency || 'S/'} ${formatMoney(debt.amount)}`;
  document.getElementById('inpManagerReason').value = 'Coordinación directa de Gerencia General por motivos de confidencialidad y negociación estratégica.';

  openModal('modalManagerAssume');
}

async function handleConfirmManagerAssume(e) {
  e.preventDefault();

  const debtId = document.getElementById('assumeDebtId').value;
  const reason = document.getElementById('inpManagerReason').value.trim();

  if (!reason) {
    showToast('Indica la justificación o motivo de la excepción.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/debts/${encodeURIComponent(debtId)}/assume-manager`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (res.ok) {
      showToast('Has asumido la gestión de este pago como Gerente.', 'success');
      closeModal('modalManagerAssume');
      loadData();
    } else {
      throw new Error();
    }
  } catch {
    const idx = state.debts.findIndex(d => d.id === debtId);
    if (idx !== -1) {
      state.debts[idx].assignedTo = 'Gerente';
      state.debts[idx].managerAssumed = true;
      state.debts[idx].managerAssumptionReason = reason;
      saveLocalFallback(state.debts);
      showToast('Pago asumido por Gerencia localmente.', 'success');
      closeModal('modalManagerAssume');
      applyFiltersAndRender();
    }
  }
}

function viewManagerAssumedInfo(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;

  document.getElementById('noticeProvider').textContent = debt.provider;
  document.getElementById('noticeAmount').textContent = `${debt.currency || 'S/'} ${formatMoney(debt.amount)}`;
  document.getElementById('noticeReason').textContent = `"${debt.managerAssumptionReason || 'Coordinación directa de Gerencia General por motivos de confidencialidad y negociación estratégica.'}"`;

  openModal('modalManagerAssumedNotice');
}

// ==========================================================================
// MODAL 4: VISOR DE DOCUMENTOS
// ==========================================================================
function viewReceipts(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt || !debt.receipts || debt.receipts.length === 0) {
    showToast('Esta deuda no tiene recibos adjuntos.', 'info');
    return;
  }

  const rec = debt.receipts[0];
  displayDocumentViewer({
    title: `Recibo / Factura - ${debt.provider}`,
    fileName: rec.name,
    fileUrl: rec.url,
    fileType: rec.type,
    meta: `Subido por Asistente &bull; ${rec.size || 'Documento oficial'}`,
    extraDetails: `
      <strong>Proveedor:</strong> ${escapeHtml(debt.provider)} &bull;
      <strong>Importe:</strong> S/ ${formatMoney(debt.amount)} &bull;
      <strong>Concepto:</strong> ${escapeHtml(debt.concept)}
    `
  });
}

function viewPaymentProof(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt || !debt.payment || !debt.payment.proofFile) {
    showToast('No se encontró el archivo del comprobante.', 'error');
    return;
  }

  const p = debt.payment;
  const proof = p.proofFile;
  const isCash = p.method === 'Efectivo';

  displayDocumentViewer({
    title: `Comprobante de Pago - ${debt.provider}`,
    fileName: proof.name,
    fileUrl: proof.url || proof.dataUrl,
    fileType: proof.type,
    meta: `Pagado por ${p.paidBy} &bull; Método: ${p.method}`,
    extraDetails: `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 10px; border-radius: 6px;">
        <strong style="color: #10b981;">Verificación de Auditoría Contable:</strong><br>
        <strong>Monto Pagado:</strong> S/ ${formatMoney(debt.amount)} &bull;
        <strong>Fecha:</strong> ${formatDateTime(p.paidDate)} &bull;
        <strong>Referencia:</strong> ${p.transactionRef || 'N/A'}<br>
        ${isCash ? `
          <strong style="color: #0891b2;">Control de Efectivo:</strong> N° Recibo: ${p.cashControl?.cashVoucherNumber} &bull; Recibido por: ${p.cashControl?.receivedBy} &bull; Custodio: ${p.cashControl?.cashCustodian}
        ` : `
          <strong>Tipo de Operación:</strong> Transferencia bancaria directa
        `}
      </div>
    `
  });
}

function displayDocumentViewer({ title, fileName, fileUrl, fileType, meta, extraDetails }) {
  document.getElementById('viewerTitle').innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    ${escapeHtml(title)}
  `;

  document.getElementById('viewerDocName').textContent = fileName || 'documento.pdf';
  document.getElementById('viewerDocMeta').innerHTML = meta || '';
  document.getElementById('viewerExtraDetails').innerHTML = extraDetails || '';

  const downloadLink = document.getElementById('viewerDownloadLink');
  downloadLink.href = fileUrl;
  downloadLink.setAttribute('download', fileName || 'documento');

  const container = document.getElementById('viewerFrameContainer');
  container.innerHTML = '';

  const isPdf = (fileType && fileType.includes('pdf')) || (fileUrl && fileUrl.endsWith('.pdf'));

  if (isPdf) {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    iframe.title = fileName;
    container.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.alt = fileName;
    container.appendChild(img);
  }

  openModal('modalDocViewer');
}

// ==========================================================================
// MODAL 5: RECURRENTES DEL PRÓXIMO MES
// ==========================================================================
function openRecurringModal() {
  const parts = state.currentMonth.split('-');
  let nextYear = parseInt(parts[0], 10);
  let nextMonth = parseInt(parts[1], 10) + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const targetMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  const targetMonthName = MONTH_NAMES[nextMonth - 1];

  const targetDesc = document.getElementById('recurringTargetDesc');
  const btnGenerate = document.getElementById('btnGenerateRecurring');

  if (targetDesc) {
    targetDesc.textContent = `Se programarán las obligaciones recurrentes fijas para ${targetMonthName} ${nextYear}.`;
  }
  if (btnGenerate) {
    btnGenerate.textContent = `Programar para ${targetMonthName} ${nextYear}`;
    btnGenerate.onclick = () => handleGenerateNextMonthRecurring(targetMonthStr);
  }

  const recurringItems = state.debts.filter(d => d.isRecurring);
  const container = document.getElementById('recurringListContainer');
  container.innerHTML = '';

  if (recurringItems.length === 0) {
    container.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px;">
        No hay servicios recurrentes marcados en el mes actual.
      </p>
    `;
  } else {
    const map = new Map();
    recurringItems.forEach(item => {
      const key = item.provider + '|' + (item.recurringCategory || item.concept);
      if (!map.has(key)) map.set(key, item);
    });

    map.forEach(item => {
      const card = document.createElement('div');
      card.style.background = 'var(--bg-card-subtle)';
      card.style.padding = '12px 16px';
      card.style.borderRadius = '8px';
      card.style.border = '1px solid var(--border-medium)';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';

      card.innerHTML = `
        <div>
          <strong style="color: var(--text-heading); font-size: 0.92rem;">${escapeHtml(item.provider)}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.recurringCategory || item.concept)} &bull; Vence día ${item.dueDate.substring(8, 10)} de cada mes</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 1rem; font-weight: 800; color: #10b981;">S/ ${formatMoney(item.amount)}</span>
          <div style="font-size: 0.72rem; color: #0891b2;">Recurrente Fijo</div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  openModal('modalRecurring');
}

async function handleGenerateNextMonthRecurring(targetMonthStr) {
  try {
    const res = await fetch('/api/debts/recurring/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetMonth: targetMonthStr })
    });

    if (res.ok) {
      const json = await res.json();
      showToast(json.message || 'Pagos recurrentes programados.', 'success');
      closeModal('modalRecurring');
      state.currentMonth = targetMonthStr;
      syncMonthSelect();
      loadData();
    } else {
      throw new Error();
    }
  } catch {
    showToast('Operación completada.', 'info');
    closeModal('modalRecurring');
  }
}

// ==========================================================================
// HELPERS
// ==========================================================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

function formatMoney(num) {
  return (Number(num) || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  const parts = isoStr.split('-');
  if (parts.length < 3) return isoStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '';
  if (type === 'success') {
    icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'error') {
    icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else {
    icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  }

  toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
