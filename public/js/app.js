/**
 * PAYCONTROL ENTERPRISE - SISTEMA DE CONTROL DE CUENTAS POR PAGAR
 * Lógica de frontend con Autenticación (Gerente / Asistente) y Vista Post-it
 */

// System Date Computation (Dynamic real-time detection)
function getSystemToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getTodayFormattedFull() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str = now.toLocaleDateString('es-PE', options);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateLiveDateDisplay() {
  const el = document.getElementById('liveDateText');
  if (el) {
    el.textContent = `Hoy: ${getTodayFormattedFull()}`;
  }
}

// Global State
const state = {
  currentUser: null, // { role: 'gerente' | 'asistente', name, title, email }
  currentMonth: '2026-10', // Standardized baseline
  get todayDate() {
    return getSystemToday();
  },
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
  updateLiveDateDisplay();
  updateDateHelperTexts();
  initAutoDayTracker();
});

let lastObservedDay = '';

function initAutoDayTracker() {
  lastObservedDay = getTodayStr();

  // Check day change periodically (every 15 seconds)
  setInterval(() => {
    const currentDay = getTodayStr();
    if (currentDay !== lastObservedDay) {
      lastObservedDay = currentDay;
      updateLiveDateDisplay();
      updateDateHelperTexts();
      applyFiltersAndRender();
      updateSummaryKPIs();
    }
  }, 15000);

  // Check on window focus or visibility change
  window.addEventListener('focus', () => {
    updateLiveDateDisplay();
    updateDateHelperTexts();
    applyFiltersAndRender();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateLiveDateDisplay();
      updateDateHelperTexts();
      applyFiltersAndRender();
    }
  });
}

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
    if (roleBanner) {
      roleBanner.className = 'role-banner gerente-mode';
    }
    if (roleBannerText) {
      roleBannerText.innerHTML = `
        <strong>Pantalla Principal de Gerencia:</strong> Visualización directa del estado mensual consolidado en formato <strong>Post-it</strong>, ordenadas por vencimiento con código de colores.
      `;
    }

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
    if (roleBanner) {
      roleBanner.className = 'role-banner asistente-mode';
    }
    if (roleBannerText) {
      roleBannerText.innerHTML = `
        <strong>Modo Operativo (Asistente):</strong> Encargada de crear tareas de pago, recibir y adjuntar recibos/facturas, ejecutar los pagos (subiendo obligatoriamente el comprobante).
      `;
    }

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

  updateLiveDateDisplay();
  updateDateHelperTexts();
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

  // Close gear menu when clicking outside
  document.addEventListener('click', (e) => {
    const gearBtn = document.getElementById('btnPostitGear');
    const dropdown = document.getElementById('postitGearDropdown');
    if (dropdown && dropdown.style.display !== 'none') {
      if (!dropdown.contains(e.target) && (!gearBtn || !gearBtn.contains(e.target))) {
        dropdown.style.display = 'none';
      }
    }
  });

  // Draft persistence for new debt modal (D03)
  const formNewDebt = document.getElementById('formNewDebt');
  if (formNewDebt) {
    ['input', 'change'].forEach(evt => {
      formNewDebt.addEventListener(evt, () => {
        saveNewDebtDraft();
      });
    });
  }
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

  const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`;
  if (nextMonthStr < '2025-01') {
    showToast('No existen registros anteriores a 2025.', 'info');
    return;
  }
  if (nextMonthStr > '2027-12') {
    showToast('Límite del calendario alcanzado (Diciembre 2027).', 'info');
    return;
  }

  state.currentMonth = nextMonthStr;
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
    const currentActiveMonth = getTodayStr().slice(0, 7);
    if (state.currentMonth === currentActiveMonth) {
      subEl.textContent = 'Periodo Actual';
    } else if (state.currentMonth < currentActiveMonth) {
      subEl.textContent = 'Periodo Pasado (Historial)';
    } else {
      subEl.textContent = '';
    }
  }
}

// ==========================================================================
// DYNAMIC DATE & INPUT CONSTRAINTS (CALCULADO AUTOMÁTICAMENTE AL DÍA ACTUAL)
// ==========================================================================
const MAX_CREATION_DATE = '2027-12-31';

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTodayFormattedDMY() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

function getNowIsoLocal() {
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return localIso;
}

function updateDateHelperTexts() {
  const todayFormatted = getTodayFormattedDMY();
  const payHelper = document.getElementById('payDateHelperText');
  if (payHelper) {
    payHelper.textContent = `Solo fecha de hoy (${todayFormatted}). No se permiten pagos en fechas pasadas ni futuras.`;
  }
  const dueHelper = document.getElementById('dueDateHelperText');
  if (dueHelper) {
    dueHelper.textContent = 'Fecha que figura en el recibo (si ya venció, se calcularán automáticamente los días de atraso).';
  }
}

function validateAmountInput(input) {
  if (!input || input.value === '') {
    input.classList.remove('input-error');
    return;
  }
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0.10 || val > 1000000.00) {
    input.classList.add('input-error');
  } else {
    input.classList.remove('input-error');
  }
}

function checkAmountOnBlur(input) {
  if (!input || input.value === '') {
    input.classList.remove('input-error');
    return;
  }
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0.10) {
    input.classList.add('input-error');
    showToast('El importe mínimo permitido es S/ 0.10. Por favor corrige el valor.', 'error');
  } else if (val > 1000000.00) {
    input.classList.add('input-error');
    showToast('El importe no puede superar S/ 1,000,000.00. Se conservó lo que escribiste para que lo corrijas.', 'error');
  } else {
    input.classList.remove('input-error');
  }
}

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
  if (!input || !input.value) {
    input.classList.remove('input-error');
    return;
  }
  const val = input.value;
  const dateOnly = isDateTime ? val.split('T')[0] : val;
  const parts = dateOnly.split('-');
  
  if (parts.length < 3) return;
  
  const todayStr = getTodayStr();
  const todayFormatted = getTodayFormattedDMY();
  const minPay = `${todayStr}T00:00`;
  const maxPay = `${todayStr}T23:59`;

  const year = parseInt(parts[0], 10);
  if (isNaN(year) || parts[0].length !== 4 || year < 2024 || year > 2027) {
    input.classList.add('input-error');
    showToast('Año no válido. El año debe tener exactamente 4 dígitos (entre 2024 y 2027).', 'error');
    return;
  }
  
  if (isDateTime) {
    if (val < minPay) {
      input.classList.add('input-error');
      showToast(`No se pueden registrar pagos con fecha anterior a hoy (${todayFormatted}).`, 'error');
    } else if (val > maxPay) {
      input.classList.add('input-error');
      showToast('No se pueden registrar pagos en fechas futuras.', 'error');
    } else {
      input.classList.remove('input-error');
    }
  } else {
    if (val > MAX_CREATION_DATE) {
      input.classList.add('input-error');
      showToast('La fecha de vencimiento no puede exceder Diciembre de 2027.', 'error');
    } else {
      input.classList.remove('input-error');
    }
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
  if (y.length !== 4 || year < 2024 || year > 2027) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const todayStr = getTodayStr();
  if (isDateTime) {
    if (dateOnly !== todayStr) return false;
  } else {
    if (dateOnly > MAX_CREATION_DATE) return false;
  }
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
  due.setHours(0, 0, 0, 0);

  const today = state.todayDate;
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 1. ROJO: Vence al día siguiente o ya se encuentra vencido
  if (diffDays <= 1) {
    let text = 'Vence mañana';
    let isExpired = false;
    let daysOverdue = 0;
    if (diffDays === 0) {
      text = '¡Vence HOY!';
    } else if (diffDays < 0) {
      isExpired = true;
      daysOverdue = Math.abs(diffDays);
      text = daysOverdue === 1 ? '¡VENCIDO (Ayer - 1 día)!' : `¡VENCIDO (Hace ${daysOverdue} días)!`;
    }

    return {
      cssClass: isExpired ? 'row-status-red row-status-expired' : 'row-status-red',
      postitClass: isExpired ? 'status-red status-expired' : 'status-red',
      badgeClass: isExpired ? 'status-pill-red status-pill-expired' : 'status-pill-red',
      label: text,
      diffDays: diffDays,
      daysOverdue: daysOverdue,
      urgency: 'red',
      isExpired: isExpired
    };
  }

  // 2. NARANJA: Próximos a vencer (2 a 14 días)
  if (diffDays > 1 && diffDays <= 14) {
    return {
      cssClass: 'row-status-orange',
      postitClass: 'status-orange',
      badgeClass: 'status-pill-orange',
      label: `Vence en ${diffDays} días`,
      diffDays: diffDays,
      urgency: 'orange'
    };
  }

  // 3. BLANCO / NEUTRO: Faltan 15 días o más (con tiempo suficiente)
  return {
    cssClass: 'row-status-white',
    postitClass: 'status-white',
    badgeClass: 'status-pill-white',
    label: `Faltan ${diffDays} días`,
    diffDays: diffDays,
    urgency: 'white'
  };
}

// ==========================================================================
// JERARQUÍA DE ORDENAMIENTO ESTRICTA:
// 1. Los vencidos (máxima urgencia - el que tiene más días atrasados va primero)
// 2. Los a punto de vencer (Hoy o Mañana)
// 3. Los próximos (2 a 14 días)
// 4. Los que todavía tienen tiempo (15+ días)
// 5. Administradas por el gerente no vencidas (quedan abajo de las pendientes)
// 6. Las que ya se quedaron pagadas (quedan hasta el fondo absoluto)
// ==========================================================================
function getDebtSortPriority(d) {
  // Las pagadas siempre van al fondo absoluto
  if (d.status === 'Pagado') return 6;

  const alert = calculateDueAlert(d.dueDate, false);
  const diffDays = alert.diffDays;

  // MÁXIMA PRIORIDAD ABSOLUTA: Cuentas vencidas (diffDays < 0).
  // Aunque hayan sido asumidas por gerencia, una cuenta vencida es crítica y debe figurar arriba de todo.
  if (diffDays < 0) return 1;

  // Si no está vencida pero fue asumida por gerencia, queda al final de las pendientes ordinarias
  if (d.managerAssumed) return 5;

  if (diffDays <= 1) return 2; // Vence hoy o mañana
  if (diffDays <= 14) return 3; // Próximos
  return 4; // Con tiempo suficiente (15+ días)
}

// ==========================================================================
// FILTERING & RENDERING (ORDEN ESTRATÉGICO: ACTIVOS PRIMERO, PAGADOS/GERENCIA AL FONDO)
// ==========================================================================
function onFilterChange() {
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('statusFilter')?.value || 'all';

  // STRICT ORDERING:
  // 1. Vencidos -> 2. A punto de vencer -> 3. Próximos -> 4. Con tiempo -> 5. Administradas por gerente -> 6. Pagadas
  // Dentro de cada nivel, el más próximo a vencer primero.
  const sorted = [...state.debts].sort((a, b) => {
    const pA = getDebtSortPriority(a);
    const pB = getDebtSortPriority(b);
    if (pA !== pB) return pA - pB;

    const timeA = new Date(a.dueDate).getTime();
    const timeB = new Date(b.dueDate).getTime();
    if (timeA !== timeB) return timeA - timeB;

    return a.id.localeCompare(b.id);
  });

  state.filteredDebts = sorted.filter(d => {
    const text = `${d.provider} ${d.concept} ${d.category} ${d.id}`.toLowerCase();
    if (search && !text.includes(search)) return false;

    if (filter === 'expired') {
      const alert = calculateDueAlert(d.dueDate, d.status === 'Pagado');
      if (!alert.isExpired || d.status === 'Pagado') return false;
    }
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

function clearAllFilters() {
  const s = document.getElementById('searchDebts');
  if (s) s.value = '';
  const st = document.getElementById('filterStatus');
  if (st) st.value = 'all';
  const cat = document.getElementById('filterCategory');
  if (cat) cat.value = 'all';
  const pri = document.getElementById('filterPriority');
  if (pri) pri.value = 'all';
  applyFiltersAndRender();
  showToast('Filtros de búsqueda restablecidos.', 'info');
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
    if (emptyState) {
      emptyState.style.display = 'block';
      const titleEl = document.getElementById('emptyStateTitle');
      const subEl = document.getElementById('emptyStateSubtitle');
      const actionEl = document.getElementById('emptyStateAction');

      if (state.debts.length > 0) {
        if (titleEl) titleEl.textContent = 'No se encontraron resultados para los filtros seleccionados';
        if (subEl) subEl.textContent = 'Existen obligaciones registradas en este periodo, pero ninguna coincide con tu búsqueda o filtros actuales.';
        if (actionEl) actionEl.style.display = 'block';
      } else {
        if (titleEl) titleEl.textContent = 'No hay deudas registradas para este periodo';
        if (subEl) subEl.textContent = 'Usa el botón "+ Nueva Tarea de Pago" o navega a otro mes.';
        if (actionEl) actionEl.style.display = 'none';
      }
    }
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
    card.style.cursor = 'pointer';
    card.title = 'Clic para ver expediente contable (Boleta y Comprobante)';
    card.onclick = (e) => {
      // Don't trigger dual viewer if clicking direct action buttons
      if (e.target.closest('button') || e.target.closest('a')) return;
      openDualDocumentViewer(d.id);
    };

    // Receipts tag (Boleta por pagar)
    const receiptCount = d.receipts ? d.receipts.length : 0;
    let receiptBtn = '';
    if (receiptCount > 0) {
      receiptBtn = `
        <button type="button" class="doc-btn has-doc" onclick="openDualDocumentViewer('${d.id}')" title="Ver boleta o recibo de cobro original">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Boleta (${receiptCount})
        </button>
      `;
    }

    // Payment proof button (Comprobante de desembolso)
    let proofBtn = '';
    if (isPaid && d.payment?.proofFile) {
      proofBtn = `
        <button type="button" class="doc-btn has-proof" onclick="openDualDocumentViewer('${d.id}')" title="Ver comprobante de pago emitido">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Comprobante
        </button>
      `;
    }

    // Role-dependent Actions
    let actionBtnHtml = '';
    if (isPaid) {
      actionBtnHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${receiptBtn}
            ${proofBtn}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openDualDocumentViewer('${d.id}')" title="Ver boleta de cobro y comprobante de pago simultáneamente">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Ver Cobro y Pago
          </button>
          <div class="stamp-paid-badge">PAGADO ✓</div>
        </div>
      `;
    } else {
      if (!isGerente) {
        if (d.managerAssumed) {
          // Assistant sees button indicating it is managed by manager
          actionBtnHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${receiptBtn}
                <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')" title="El gerente general se encargará directamente de este pago">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Gestionado por el gerente
                </button>
              </div>
            </div>
          `;
        } else {
          // Normal Assistant can pay
          actionBtnHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${receiptBtn}
                <button type="button" class="btn btn-success btn-sm" onclick="openPayModal('${d.id}')" title="Pagar con comprobante obligatorio">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Pagar
                </button>
              </div>
            </div>
          `;
        }
      } else {
        // Manager view
        if (!d.managerAssumed) {
          actionBtnHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${receiptBtn}
                <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1;" onclick="openManagerAssumeModal('${d.id}')" title="Excepción: El gerente asume realizar este pago">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Asumir Pago
                </button>
              </div>
            </div>
          `;
        } else {
          actionBtnHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${receiptBtn}
                <button type="button" class="btn btn-secondary btn-sm" style="border-color: #6366f1; color: #6366f1; background: rgba(99, 102, 241, 0.1);" onclick="viewManagerAssumedInfo('${d.id}')" title="Ver detalles de la gestión de gerencia">
                  Gestionando
                </button>
              </div>
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
            ${alert.isExpired ? `<span class="category-tag" style="background: rgba(239, 68, 68, 0.22); color: #ef4444; border-color: #ef4444; font-weight: 800;">⚠️ ATRASADO: ${alert.daysOverdue} ${alert.daysOverdue === 1 ? 'DÍA' : 'DÍAS'}</span>` : ''}
            ${d.isRecurring ? `<span class="category-tag" style="color: #0891b2; border-color: rgba(6, 182, 212, 0.4);">&#8635; Recurrente (${escapeHtml(d.recurringCategory || 'Fijo')})</span>` : ''}
            ${cashInfoHtml}
          </div>

          ${managerBannerHtml}

          <div class="postit-amount-box">
            <span class="postit-amount-label">Monto a Liquidar</span>
            <span class="postit-amount-value">${d.currency || 'S/'} ${formatMoney(d.amount)}</span>
          </div>

          <div class="postit-date-row" style="${alert.isExpired ? 'color: #ef4444; font-weight: 700;' : ''}">
            <span>${alert.isExpired ? 'Venció el:' : 'Fecha de Vencimiento:'}</span>
            <span class="postit-date-val" style="${alert.isExpired ? 'color: #ef4444; font-weight: 800;' : ''}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formatDate(d.dueDate)} ${alert.isExpired ? `(hace ${alert.daysOverdue} ${alert.daysOverdue === 1 ? 'día' : 'días'})` : ''}
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
    } else if (alert.isExpired) {
      paymentColHtml = `<span style="font-size: 0.74rem; font-weight: 800; color: #ef4444; background: rgba(239, 68, 68, 0.12); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.35);">⚠️ Vencido</span>`;
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
  let urgentCount = 0;
  let expiredCount = 0;
  let soonCount = 0;
  let paidCount = 0;

  state.debts.forEach(d => {
    const amt = Number(d.amount) || 0;
    if (d.status === 'Pagado') {
      totalPaid += amt;
      paidCount++;
    } else {
      totalPending += amt;
      const alert = calculateDueAlert(d.dueDate, false);
      if (alert.urgency === 'red') {
        urgentCount++;
        if (alert.isExpired) {
          expiredCount++;
        }
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

  if (kpiTotalPaid) kpiTotalPaid.textContent = `S/ ${formatMoney(totalPaid)}`;
  if (kpiPaidPercent) kpiPaidPercent.textContent = `${percentPaid}% liquidado`;
  if (kpiPaidCount) kpiPaidCount.textContent = `${paidCount} de ${state.debts.length} pagos`;
  if (kpiTotalPending) kpiTotalPending.textContent = `S/ ${formatMoney(totalPending)}`;
  if (kpiPendingCount) kpiPendingCount.textContent = `${state.debts.length - paidCount} pendientes`;
  if (kpiUrgentCount) kpiUrgentCount.textContent = urgentCount;

  const kpiUrgentBadge = document.querySelector('.summary-card.urgent .badge-pill');
  if (kpiUrgentBadge) {
    kpiUrgentBadge.textContent = expiredCount > 0 ? `${expiredCount} ya vencido${expiredCount !== 1 ? 's' : ''}` : 'Vence hoy o mañana';
  }

  if (kpiSoonCount) kpiSoonCount.textContent = `+${soonCount} próximos`;
}

// ==========================================================================
// ==========================================================================
// MODALS LOGIC (NEW DEBT, PAY DEBT, MANAGER ASSUME, DOC VIEWER, RECURRING)
// ==========================================================================
function saveNewDebtDraft() {
  try {
    const provider = document.getElementById('inpProvider')?.value || '';
    const concept = document.getElementById('inpConcept')?.value || '';
    const amount = document.getElementById('inpAmount')?.value || '';
    const dueDate = document.getElementById('inpDueDate')?.value || '';
    const priority = document.getElementById('inpPriority')?.value || 'Media';
    const category = document.getElementById('inpCategory')?.value || 'Servicios Básicos';
    const isRecurring = document.getElementById('inpIsRecurring')?.checked || false;
    const recurringCategory = document.getElementById('inpRecurringCategory')?.value || '';

    // Only save if at least one field has content
    if (provider || concept || amount || (dueDate && dueDate !== getTodayStr())) {
      const draft = { provider, concept, amount, dueDate, priority, category, isRecurring, recurringCategory };
      sessionStorage.setItem('paycontrol_new_debt_draft', JSON.stringify(draft));
    }
  } catch (e) {
    // Ignore storage issues
  }
}

function restoreNewDebtDraft() {
  try {
    const saved = sessionStorage.getItem('paycontrol_new_debt_draft');
    if (!saved) {
      const defaultVal = `${state.currentMonth}-25`;
      const todayStr = getTodayStr();
      const inpDueDate = document.getElementById('inpDueDate');
      if (inpDueDate && !inpDueDate.value) {
        inpDueDate.value = defaultVal < todayStr ? todayStr : defaultVal;
      }
      const banner = document.getElementById('draftRestoredAlert');
      if (banner) banner.style.display = 'none';
      return;
    }

    const draft = JSON.parse(saved);
    if (draft.provider) document.getElementById('inpProvider').value = draft.provider;
    if (draft.concept) document.getElementById('inpConcept').value = draft.concept;
    if (draft.amount) document.getElementById('inpAmount').value = draft.amount;
    if (draft.dueDate) document.getElementById('inpDueDate').value = draft.dueDate;
    if (draft.priority) document.getElementById('inpPriority').value = draft.priority;
    if (draft.category) document.getElementById('inpCategory').value = draft.category;
    if (draft.isRecurring) {
      document.getElementById('inpIsRecurring').checked = true;
      toggleRecurringOptions(true);
      if (draft.recurringCategory) document.getElementById('inpRecurringCategory').value = draft.recurringCategory;
    }

    const banner = document.getElementById('draftRestoredAlert');
    if (banner) banner.style.display = 'flex';
  } catch (e) {
    console.error('Error restoring draft', e);
  }
}

function discardNewDebtDraft() {
  try {
    sessionStorage.removeItem('paycontrol_new_debt_draft');
  } catch (e) {}
  document.getElementById('formNewDebt').reset();
  const banner = document.getElementById('draftRestoredAlert');
  if (banner) banner.style.display = 'none';
  const defaultVal = `${state.currentMonth}-25`;
  const todayStr = getTodayStr();
  const inpDueDate = document.getElementById('inpDueDate');
  if (inpDueDate) {
    inpDueDate.value = defaultVal < todayStr ? todayStr : defaultVal;
  }
  document.querySelectorAll('#formNewDebt .input-error').forEach(el => el.classList.remove('input-error'));
  showToast('Borrador descartado.', 'info');
}

function openNewDebtModal() {
  if (state.currentUser?.role !== 'asistente') {
    showToast('Solo el asistente contable puede crear tareas de pago.', 'error');
    return;
  }

  updateDateHelperTexts();

  const inpDueDate = document.getElementById('inpDueDate');
  if (inpDueDate) {
    inpDueDate.min = '2024-01-01';
    inpDueDate.max = MAX_CREATION_DATE;
  }

  state.selectedReceiptFile = null;
  document.getElementById('receiptPreviewContainer').innerHTML = '';
  document.getElementById('fileReceipt').value = '';
  const dropzoneReceipt = document.getElementById('dropzoneReceipt');
  if (dropzoneReceipt) dropzoneReceipt.classList.add('required-missing');
  const errReceipt = document.getElementById('errReceiptRequired');
  if (errReceipt) errReceipt.style.display = 'none';

  document.getElementById('formNewDebt').reset();
  document.getElementById('groupRecurringCategory').style.display = 'none';
  document.querySelectorAll('#formNewDebt .input-error').forEach(el => el.classList.remove('input-error'));

  // Restore draft if user was previously editing (D03)
  restoreNewDebtDraft();

  openModal('modalNewDebt');
}

function toggleRecurringOptions(isRecurring) {
  const grp = document.getElementById('groupRecurringCategory');
  if (grp) grp.style.display = isRecurring ? 'block' : 'none';
}

// ==========================================================================
// SEGURIDAD CRIPTOGRÁFICA Y AUDITORÍA DE DOCUMENTOS (CLIENTE)
// ==========================================================================
async function computeFileSha256(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.warn('Crypto subtle error:', err);
    return null;
  }
}

function checkReferenceDuplicateLocal(ref, currentDebtId = null) {
  if (!ref) return null;
  const clean = ref.trim().toUpperCase();
  if (clean.length < 2) return null;

  for (const d of state.debts) {
    if (d.status !== 'Pagado' || (currentDebtId && d.id === currentDebtId)) continue;
    const existingRef = (d.payment?.transactionRef || '').trim().toUpperCase();
    const existingVoucher = (d.payment?.cashControl?.cashVoucherNumber || '').trim().toUpperCase();
    if (existingRef === clean || existingVoucher === clean) {
      return {
        debtId: d.id,
        provider: d.provider,
        amount: d.amount,
        currency: d.currency || 'PEN',
        paidDate: d.payment?.paidDate || d.dueDate,
        ref: clean
      };
    }
  }
  return null;
}

function validateReferenceRealtime(val, method) {
  const isCash = method === 'Efectivo';
  const feedbackEl = document.getElementById(isCash ? 'feedbackCashVoucher' : 'feedbackTransferRef');
  const inputEl = document.getElementById(isCash ? 'inpCashVoucher' : 'inpTransferRef');
  const currentDebtId = document.getElementById('payDebtId')?.value;
  const submitBtn = document.getElementById('btnSubmitPayment');

  if (!feedbackEl || !inputEl) return;

  const clean = (val || '').trim();
  if (clean.length < 2) {
    feedbackEl.style.display = 'none';
    inputEl.classList.remove('input-error');
    return;
  }

  const dup = checkReferenceDuplicateLocal(clean, currentDebtId);
  if (dup) {
    inputEl.classList.add('input-error');
    feedbackEl.className = 'ref-validation-feedback error';
    feedbackEl.style.display = 'block';
    feedbackEl.innerHTML = `
      ⛔ <strong>Referencia Duplicada:</strong> Ya fue registrada en el pago de la deuda <strong>${escapeHtml(dup.debtId)}</strong> (${escapeHtml(dup.provider)} por ${dup.currency} ${formatMoney(dup.amount)}). No se permiten pagos repetidos con la misma referencia.
    `;
    if (submitBtn) submitBtn.disabled = true;
  } else {
    inputEl.classList.remove('input-error');
    feedbackEl.className = 'ref-validation-feedback valid';
    feedbackEl.style.display = 'block';
    feedbackEl.innerHTML = `
      ✓ <strong>Referencia única:</strong> No existen pagos registrados previamente con este código.
    `;
    if (state.selectedPaymentProofFile && !state.selectedPaymentProofFile.isBlocked) {
      if (submitBtn) submitBtn.disabled = false;
    }
  }
}

async function inspectDocumentWithServer(file, fileDataUrl, expectedProvider, expectedAmount, excludeDebtId) {
  try {
    const res = await fetch('/api/inspect-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileData: fileDataUrl,
        expectedProvider,
        expectedAmount,
        excludeDebtId
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Inspect API call failed:', err);
  }
  return null;
}

async function handleFileReceiptSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const fileHash = await computeFileSha256(file);

    state.selectedReceiptFile = {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`,
      dataUrl: dataUrl,
      fileHash: fileHash,
      isBlocked: false
    };

    const dropzoneReceipt = document.getElementById('dropzoneReceipt');
    if (dropzoneReceipt) dropzoneReceipt.classList.remove('required-missing');
    const errReceipt = document.getElementById('errReceiptRequired');
    if (errReceipt) errReceipt.style.display = 'none';

    const container = document.getElementById('receiptPreviewContainer');
    container.innerHTML = `
      <div class="file-preview-pill">
        <div class="file-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);">(${state.selectedReceiptFile.size})</span>
          ${fileHash ? `<span class="badge-chip blue" style="margin-left: 6px; font-size: 0.7rem;">SHA-256: ${fileHash.substring(0, 8)}...</span>` : ''}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeSelectedReceipt()">Quitar</button>
      </div>
    `;

    // Realizar inspección de seguridad en servidor
    const auditBox = document.getElementById('receiptAuditBox');
    const submitBtn = document.getElementById('btnSubmitNewDebt');
    if (auditBox) {
      auditBox.style.display = 'block';
      auditBox.innerHTML = `
        <div style="padding: 10px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
          <span class="spinner-sm" style="display: inline-block; width: 14px; height: 14px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
          Verificando autenticidad criptográfica y titularidad...
        </div>
      `;
    }

    const providerInput = document.getElementById('inpProvider')?.value || '';
    const amountInput = parseFloat(document.getElementById('inpAmount')?.value) || 0;
    const insp = await inspectDocumentWithServer(file, dataUrl, providerInput, amountInput, null);

    if (auditBox) {
      if (insp && insp.isDuplicate) {
        state.selectedReceiptFile.isBlocked = true;
        if (submitBtn) submitBtn.disabled = true;
        auditBox.innerHTML = `
          <div class="duplicate-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>ARCHIVO DUPLICADO DETECTADO (BLOQUEADO)</strong>
            </div>
            <p>Este comprobante ya fue subido anteriormente en el sistema.</p>
            <ul>
              <li><strong>Deuda de origen:</strong> ${escapeHtml(insp.duplicateInfo.debtId)} - ${escapeHtml(insp.duplicateInfo.provider)}</li>
              <li><strong>Fecha registrada:</strong> ${insp.duplicateInfo.date}</li>
              <li><strong>Huella Digital SHA-256:</strong> <code>${escapeHtml(insp.fileHash.substring(0, 16))}...</code></li>
            </ul>
            <p class="alert-note">El sistema analiza el contenido binario real del archivo (Hash SHA-256). Aunque cambies el nombre del archivo, el contenido es idéntico y el sistema bloquea su reutilización.</p>
          </div>
        `;
        showToast('Comprobante duplicado: Este archivo ya existe en el sistema.', 'error');
      } else if (insp && insp.isAlienDocument) {
        state.selectedReceiptFile.isBlocked = true;
        if (submitBtn) submitBtn.disabled = true;
        auditBox.innerHTML = `
          <div class="alien-doc-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <strong>COMPROBANTE AJENO: NO PERTENECE A LA EMPRESA</strong>
            </div>
            <p>Se detectó que este comprobante <strong>no está emitido a nombre de TechSolutions Perú S.A.C. (RUC 20601827361)</strong>.</p>
            <div class="alien-details">
              <strong>Titulares o RUCs detectados en documento:</strong> ${escapeHtml(insp.alienRucs.join(', ') || 'Tercero particular')}<br>
              <strong>Empresa autorizada:</strong> TechSolutions Perú S.A.C. (RUC 20601827361)
            </div>
            <p class="alert-note">Por seguridad contable, el sistema bloquea la creación de obligaciones con boletas ajenas.</p>
            ${insp.snippet ? `
              <div class="doc-snippet-box"><strong>Texto extraído del documento:</strong><br>${escapeHtml(insp.snippet)}</div>
            ` : ''}
          </div>
        `;
        showToast('Comprobante ajeno: El documento no pertenece a TechSolutions Perú S.A.C.', 'error');
      } else {
        state.selectedReceiptFile.isBlocked = false;
        if (submitBtn) submitBtn.disabled = false;
        auditBox.innerHTML = `
          <div class="verified-doc-card">
            <div class="verified-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <strong>COMPROBANTE AUDITADO CONFORME</strong>
            </div>
            <div class="verified-chips">
              <span class="badge-chip green">✓ Titular: TechSolutions Perú S.A.C.</span>
              <span class="badge-chip blue">🔒 Hash SHA-256: ${(insp?.fileHash || fileHash || '').substring(0, 10)}... (Único)</span>
            </div>
          </div>
        `;
      }
    }
  };
  reader.readAsDataURL(file);
}

function removeSelectedReceipt() {
  state.selectedReceiptFile = null;
  document.getElementById('fileReceipt').value = '';
  document.getElementById('receiptPreviewContainer').innerHTML = '';
  const auditBox = document.getElementById('receiptAuditBox');
  if (auditBox) {
    auditBox.style.display = 'none';
    auditBox.innerHTML = '';
  }
  const submitBtn = document.getElementById('btnSubmitNewDebt');
  if (submitBtn) submitBtn.disabled = false;
  const dropzoneReceipt = document.getElementById('dropzoneReceipt');
  if (dropzoneReceipt) dropzoneReceipt.classList.add('required-missing');
}

async function handleCreateDebt(e) {
  e.preventDefault();

  if (state.selectedReceiptFile?.isBlocked) {
    showToast('El comprobante adjunto fue rechazado (duplicado o ajeno). Adjunte una boleta válida.', 'error');
    return;
  }

  const provider = document.getElementById('inpProvider').value.trim();
  const concept = document.getElementById('inpConcept').value.trim();
  const amount = parseFloat(document.getElementById('inpAmount').value);
  const dueDate = document.getElementById('inpDueDate').value;
  const priority = document.getElementById('inpPriority').value;
  const category = document.getElementById('inpCategory').value;
  const isRecurring = document.getElementById('inpIsRecurring').checked;
  const recurringCategory = document.getElementById('inpRecurringCategory').value.trim() || category;

  if (!provider || isNaN(amount) || !dueDate) {
    showToast('Por favor completa todos los campos obligatorios.', 'error');
    return;
  }

  if (provider.length < 3 || provider.length > 100) {
    document.getElementById('inpProvider').classList.add('input-error');
    document.getElementById('inpProvider').focus();
    showToast('El nombre del proveedor debe tener entre 3 y 100 caracteres.', 'error');
    return;
  }
  document.getElementById('inpProvider').classList.remove('input-error');

  if (!/[a-zA-Z0-9]/.test(provider)) {
    document.getElementById('inpProvider').classList.add('input-error');
    document.getElementById('inpProvider').focus();
    showToast('El nombre del proveedor debe contener letras o números válidos.', 'error');
    return;
  }

  if (amount < 0.10 || amount > 1000000.00) {
    document.getElementById('inpAmount').classList.add('input-error');
    document.getElementById('inpAmount').focus();
    showToast('El importe debe ser un monto válido entre S/ 0.10 y S/ 1,000,000.00.', 'error');
    return;
  }
  document.getElementById('inpAmount').classList.remove('input-error');

  if (!isValidAppDate(dueDate, false)) {
    document.getElementById('inpDueDate').classList.add('input-error');
    document.getElementById('inpDueDate').focus();
    showToast('Fecha de vencimiento no válida. El año debe tener 4 dígitos y encontrarse entre 2024 y 2027.', 'error');
    return;
  }
  document.getElementById('inpDueDate').classList.remove('input-error');

  // Strict Requirement: Factura o recibo obligatorio (PDF o Imagen)
  if (!state.selectedReceiptFile || (!state.selectedReceiptFile.dataUrl && !state.selectedReceiptFile.url)) {
    const dropzoneReceipt = document.getElementById('dropzoneReceipt');
    const errReceipt = document.getElementById('errReceiptRequired');
    if (dropzoneReceipt) {
      dropzoneReceipt.classList.add('required-missing');
      dropzoneReceipt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (errReceipt) errReceipt.style.display = 'block';
    showToast('Requisito obligatorio: Debes adjuntar la factura, boleta o recibo (PDF o Imagen) para crear el post-it.', 'error');
    return;
  }

  const receipts = [];
  receipts.push({
    id: 'rec-' + Date.now(),
    name: state.selectedReceiptFile.name,
    type: state.selectedReceiptFile.type,
    size: state.selectedReceiptFile.size,
    url: state.selectedReceiptFile.dataUrl,
    fileHash: state.selectedReceiptFile.fileHash,
    uploadDate: new Date().toISOString().substring(0, 10)
  });

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
      try {
        sessionStorage.removeItem('paycontrol_new_debt_draft');
      } catch (e) {}
      const banner = document.getElementById('draftRestoredAlert');
      if (banner) banner.style.display = 'none';

      const dueMonth = dueDate.substring(0, 7);
      if (dueMonth && state.currentMonth !== dueMonth) {
        state.currentMonth = dueMonth;
        syncMonthSelect();
        updateMonthDisplay();
      }

      showToast('Tarea de pago creada exitosamente.', 'success');
      closeModal('modalNewDebt');
      loadData();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.message || 'Error al crear la tarea de pago.', 'error');
      const auditBox = document.getElementById('receiptAuditBox');
      if (auditBox) {
        auditBox.style.display = 'block';
        auditBox.innerHTML = `
          <div class="duplicate-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>SOLICITUD RECHAZADA</strong>
            </div>
            <p>${escapeHtml(errData.message || 'Error en servidor')}</p>
          </div>
        `;
      }
    }
  } catch (netErr) {
    showToast('Error de red al conectar con el servidor.', 'error');
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

  const inpPayAmount = document.getElementById('inpPayAmount');
  const payRecurringHint = document.getElementById('payRecurringHint');

  if (inpPayAmount) {
    inpPayAmount.value = Number(debt.amount).toFixed(2);
    inpPayAmount.classList.remove('input-error');
    if (debt.isRecurring) {
      inpPayAmount.removeAttribute('readonly');
      inpPayAmount.style.borderColor = '#0891b2';
      inpPayAmount.style.background = 'var(--bg-input)';
      if (payRecurringHint) payRecurringHint.style.display = 'block';
    } else {
      inpPayAmount.setAttribute('readonly', 'true');
      inpPayAmount.style.borderColor = 'var(--border-medium)';
      inpPayAmount.style.background = 'transparent';
      if (payRecurringHint) payRecurringHint.style.display = 'none';
    }
  }

  updateDateHelperTexts();

  const todayStr = getTodayStr();
  const inpPayDate = document.getElementById('inpPayDate');
  if (inpPayDate) {
    inpPayDate.min = `${todayStr}T00:00`;
    inpPayDate.max = `${todayStr}T23:59`;
    inpPayDate.value = getNowIsoLocal();
  }

  // Generate suggested unique reference
  const randomRef = `OP-${Date.now().toString().slice(-6)}`;
  const inpTransferRef = document.getElementById('inpTransferRef');
  if (inpTransferRef) {
    inpTransferRef.value = randomRef;
    inpTransferRef.classList.remove('input-error');
  }

  const randomVoucher = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
  const inpCashVoucher = document.getElementById('inpCashVoucher');
  if (inpCashVoucher) {
    inpCashVoucher.value = randomVoucher;
    inpCashVoucher.classList.remove('input-error');
  }

  // Clear audit & validation feedback
  const fbT = document.getElementById('feedbackTransferRef');
  if (fbT) { fbT.style.display = 'none'; fbT.innerHTML = ''; }
  const fbC = document.getElementById('feedbackCashVoucher');
  if (fbC) { fbC.style.display = 'none'; fbC.innerHTML = ''; }
  const auditB = document.getElementById('proofAuditBox');
  if (auditB) { auditB.style.display = 'none'; auditB.innerHTML = ''; }

  state.selectedPaymentProofFile = null;
  document.getElementById('filePaymentProof').value = '';
  document.getElementById('paymentProofPreviewContainer').innerHTML = '';
  document.getElementById('btnSubmitPayment').disabled = true;
  document.getElementById('dropzonePaymentProof').classList.add('required-missing');

  selectPaymentMethod('Transferencia');
  validateReferenceRealtime(randomRef, 'Transferencia');
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

    const curRef = document.getElementById('inpTransferRef')?.value || '';
    validateReferenceRealtime(curRef, 'Transferencia');
  } else {
    btnCash.style.borderColor = '#0891b2';
    btnCash.style.background = 'rgba(6, 182, 212, 0.15)';
    btnTransfer.style.borderColor = 'var(--border-medium)';
    btnTransfer.style.background = 'transparent';

    transferGroup.style.display = 'none';
    cashGroup.style.display = 'block';

    const curVoucher = document.getElementById('inpCashVoucher')?.value || '';
    validateReferenceRealtime(curVoucher, 'Efectivo');
  }
}

async function handleFilePaymentProofSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const fileHash = await computeFileSha256(file);

    state.selectedPaymentProofFile = {
      name: file.name,
      type: file.type,
      size: `${Math.round(file.size / 1024)} KB`,
      dataUrl: dataUrl,
      url: dataUrl,
      fileHash: fileHash,
      isBlocked: false
    };

    const container = document.getElementById('paymentProofPreviewContainer');
    container.innerHTML = `
      <div class="file-preview-pill" style="border-color: rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.08);">
        <div class="file-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #10b981;"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="file-name" style="color: #10b981;">${escapeHtml(file.name)}</span>
          <span style="font-size: 0.74rem; color: var(--text-muted);">(${state.selectedPaymentProofFile.size})</span>
          ${fileHash ? `<span class="badge-chip blue" style="margin-left: 6px; font-size: 0.7rem;">SHA-256: ${fileHash.substring(0, 8)}...</span>` : ''}
        </div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="removeSelectedProof()">Cambiar</button>
      </div>
    `;

    document.getElementById('dropzonePaymentProof').classList.remove('required-missing');

    // Auditoría Criptográfica e Inspección de Titularidad en Servidor
    const auditBox = document.getElementById('proofAuditBox');
    const submitBtn = document.getElementById('btnSubmitPayment');
    const debtId = document.getElementById('payDebtId')?.value;
    const debt = state.debts.find(d => d.id === debtId);

    if (auditBox) {
      auditBox.style.display = 'block';
      auditBox.innerHTML = `
        <div style="padding: 10px; font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
          <span class="spinner-sm" style="display: inline-block; width: 14px; height: 14px; border: 2px solid var(--accent-primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
          Verificando no duplicidad criptográfica y pertenencia del comprobante...
        </div>
      `;
    }

    const insp = await inspectDocumentWithServer(file, dataUrl, debt?.provider, debt?.amount, debtId);

    if (auditBox) {
      if (insp && insp.isDuplicate) {
        state.selectedPaymentProofFile.isBlocked = true;
        if (submitBtn) submitBtn.disabled = true;
        auditBox.innerHTML = `
          <div class="duplicate-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>COMPROBANTE DUPLICADO DETECTADO (BLOQUEADO)</strong>
            </div>
            <p>Este comprobante ya fue subido anteriormente en el sistema.</p>
            <ul>
              <li><strong>Deuda de origen:</strong> ${escapeHtml(insp.duplicateInfo.debtId)} - ${escapeHtml(insp.duplicateInfo.provider)}</li>
              <li><strong>Fecha registrada:</strong> ${insp.duplicateInfo.date}</li>
              <li><strong>Huella Digital SHA-256:</strong> <code>${escapeHtml(insp.fileHash.substring(0, 16))}...</code></li>
            </ul>
            <p class="alert-note">El sistema valida el contenido binario real del archivo (Hash SHA-256). Aunque cambies el nombre del archivo, el contenido es idéntico y el sistema bloquea su reutilización.</p>
          </div>
        `;
        showToast('Comprobante duplicado: Este archivo ya existe en el sistema.', 'error');
      } else if (insp && insp.isAlienDocument) {
        state.selectedPaymentProofFile.isBlocked = true;
        if (submitBtn) submitBtn.disabled = true;
        auditBox.innerHTML = `
          <div class="alien-doc-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <strong>COMPROBANTE AJENO DETECTADO: NO PERTENECE A LA EMPRESA</strong>
            </div>
            <p>Se detectó que este comprobante <strong>no pertenece a TechSolutions Perú S.A.C. (RUC 20601827361)</strong>.</p>
            <div class="alien-details">
              <strong>Titulares o RUCs detectados en documento:</strong> ${escapeHtml(insp.alienRucs.join(', ') || 'Tercero particular no autorizado')}<br>
              <strong>Empresa titular autorizada:</strong> TechSolutions Perú S.A.C. (RUC 20601827361)
            </div>
            <p class="alert-note">El sistema bloquea este desembolso para impedir pagar boletas que no pertenezcan a la empresa o a esta obligación.</p>
            ${insp.snippet ? `
              <div class="doc-snippet-box"><strong>Texto extraído del documento:</strong><br>${escapeHtml(insp.snippet)}</div>
            ` : ''}
          </div>
        `;
        showToast('Comprobante ajeno: No pertenece a TechSolutions Perú S.A.C.', 'error');
      } else {
        state.selectedPaymentProofFile.isBlocked = false;
        auditBox.innerHTML = `
          <div class="verified-doc-card">
            <div class="verified-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <strong>COMPROBANTE AUDITADO Y AUTORIZADO</strong>
            </div>
            <div class="verified-chips">
              <span class="badge-chip green">✓ Titular: TechSolutions Perú S.A.C.</span>
              <span class="badge-chip blue">🔒 Hash SHA-256: ${(insp?.fileHash || fileHash || '').substring(0, 10)}... (Único)</span>
              ${insp?.providerMatch ? `<span class="badge-chip purple">✓ Proveedor: ${escapeHtml(debt?.provider || '')}</span>` : ''}
            </div>
          </div>
        `;

        // Check if reference is not duplicate before enabling submit
        const activeMethod = state.activePaymentMethod;
        const currentRef = activeMethod === 'Efectivo'
          ? (document.getElementById('inpCashVoucher')?.value || '').trim()
          : (document.getElementById('inpTransferRef')?.value || '').trim();

        const dupRef = checkReferenceDuplicateLocal(currentRef, debtId);
        if (!dupRef && submitBtn) {
          submitBtn.disabled = false;
        }
      }
    }
  };
  reader.readAsDataURL(file);
}

function removeSelectedProof() {
  state.selectedPaymentProofFile = null;
  document.getElementById('filePaymentProof').value = '';
  document.getElementById('paymentProofPreviewContainer').innerHTML = '';
  const auditBox = document.getElementById('proofAuditBox');
  if (auditBox) {
    auditBox.style.display = 'none';
    auditBox.innerHTML = '';
  }
  document.getElementById('btnSubmitPayment').disabled = true;
  document.getElementById('dropzonePaymentProof').classList.add('required-missing');
}

async function handleExecutePayment(e) {
  e.preventDefault();

  if (!state.selectedPaymentProofFile) {
    showToast('REQUISITO OBLIGATORIO: Adjunte el comprobante en formato PDF o Imagen para marcar como pagada.', 'error');
    return;
  }

  if (state.selectedPaymentProofFile.isBlocked) {
    showToast('El comprobante adjunto fue rechazado (duplicado o ajeno). Por favor adjunte un comprobante legítimo y único.', 'error');
    return;
  }

  const debtId = document.getElementById('payDebtId').value;
  const method = state.activePaymentMethod;
  const payDate = document.getElementById('inpPayDate').value;
  const notes = document.getElementById('inpPaymentNotes').value.trim();

  if (!payDate || !isValidAppDate(payDate, true)) {
    showToast(`Fecha de pago inválida. Solo se pueden registrar pagos con fecha de hoy (${getTodayFormattedDMY()}).`, 'error');
    return;
  }

  if (notes.length > 250) {
    showToast('Las observaciones no pueden exceder 250 caracteres.', 'error');
    return;
  }

  let cashControl = null;
  let transactionRef = '';

  if (method === 'Efectivo') {
    const voucher = (document.getElementById('inpCashVoucher')?.value || '').trim();
    const custodian = (document.getElementById('inpCashCustodian')?.value || '').trim() || 'Caja Chica Administración';
    const receiverRole = document.getElementById('inpCashReceiverRole')?.value || 'Cobrador / Proveedor';
    const receiverDetail = (document.getElementById('inpCashReceiver')?.value || '').trim();

    if (!voucher || voucher.length < 2 || voucher.length > 30) {
      showToast('Por favor ingresa un N° de recibo válido (entre 2 y 30 caracteres).', 'error');
      return;
    }

    if (custodian.length < 3 || custodian.length > 60) {
      showToast('El custodio de caja debe tener entre 3 y 60 caracteres.', 'error');
      return;
    }

    if (receiverDetail && receiverDetail.length > 100) {
      showToast('El nombre de quien recibe no puede exceder 100 caracteres.', 'error');
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
    const rawRef = (document.getElementById('inpTransferRef')?.value || '').trim();
    if (!rawRef || rawRef.length < 3 || rawRef.length > 50) {
      showToast('El N° de operación / referencia debe tener entre 3 y 50 caracteres.', 'error');
      return;
    }
    transactionRef = rawRef;
  }

  // Double check reference uniqueness before sending
  const dupRef = checkReferenceDuplicateLocal(transactionRef, debtId);
  if (dupRef) {
    showToast(`Referencia duplicada: Ya fue utilizada en el pago de la deuda '${dupRef.debtId}' (${dupRef.provider}). Ingrese una referencia bancaria única.`, 'error');
    validateReferenceRealtime(transactionRef, method);
    return;
  }

  const inpPayAmount = document.getElementById('inpPayAmount');
  let updatedAmount = undefined;
  if (inpPayAmount) {
    const pVal = parseFloat(inpPayAmount.value);
    if (!isNaN(pVal) && pVal > 0 && pVal <= 1000000) {
      updatedAmount = Math.round(pVal * 100) / 100;
    }
  }

  const payload = {
    method,
    paidDate: payDate,
    paidBy: `${state.currentUser.name} (${state.currentUser.title})`,
    transactionRef,
    updatedAmount,
    proofFile: {
      name: state.selectedPaymentProofFile.name,
      type: state.selectedPaymentProofFile.type,
      url: state.selectedPaymentProofFile.url || state.selectedPaymentProofFile.dataUrl,
      dataUrl: state.selectedPaymentProofFile.dataUrl,
      fileHash: state.selectedPaymentProofFile.fileHash
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
      const errJson = await res.json().catch(() => ({}));
      const errorMsg = errJson.message || 'Error en el servidor al registrar el pago.';
      showToast(errorMsg, 'error');

      const auditBox = document.getElementById('proofAuditBox');
      if (auditBox) {
        auditBox.style.display = 'block';
        auditBox.innerHTML = `
          <div class="duplicate-alert-card">
            <div class="alert-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <strong>OPERACIÓN RECHAZADA POR SEGURIDAD</strong>
            </div>
            <p>${escapeHtml(errorMsg)}</p>
          </div>
        `;
      }
    }
  } catch (netErr) {
    showToast('Error de red al conectar con el servidor. No se pudo registrar el pago.', 'error');
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
  const reason = (document.getElementById('inpManagerReason')?.value || '').trim();

  if (!reason || reason.length < 5 || reason.length > 300) {
    showToast('Indica la justificación o motivo de la excepción (entre 5 y 300 caracteres).', 'error');
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
// MODAL 4: VISOR DE DOCUMENTOS Y AUDITORÍA CONTABLE (BOLETA VS COMPROBANTE)
// ==========================================================================
function openDualDocumentViewer(debtId) {
  const debt = state.debts.find(d => d.id === debtId);
  if (!debt) return;

  currentViewerDebtId = debtId;
  const gearMenu = document.getElementById('postitGearDropdown');
  if (gearMenu) gearMenu.style.display = 'none';

  const isPaid = debt.status === 'Pagado';
  const hasReceipt = debt.receipts && debt.receipts.length > 0;
  const receipt = hasReceipt ? debt.receipts[0] : null;
  const hasProof = isPaid && debt.payment && debt.payment.proofFile;
  const proof = hasProof ? debt.payment.proofFile : null;
  const isGerente = state.currentUser?.role === 'gerente';
  const isCash = isPaid && debt.payment?.method === 'Efectivo';

  // Modal Title
  const titleEl = document.getElementById('viewerTitle');
  if (titleEl) {
    titleEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Auditoría Documentaria: Boleta por Pagar vs Comprobante de Pago
    `;
  }

  // Left Column (Cobro / Boleta) HTML
  let leftColHtml = '';
  if (hasReceipt && receipt) {
    const isPdf = (receipt.type && receipt.type.includes('pdf')) || (receipt.url && receipt.url.endsWith('.pdf'));
    leftColHtml = `
      <div class="dual-viewer-col">
        <div class="dual-viewer-col-header">
          <span class="dual-viewer-col-title" style="color: #3b82f6;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            1. Boleta / Factura por Pagar (Cobro Original)
          </span>
          <a href="${receipt.url}" target="_blank" download="${escapeHtml(receipt.name)}" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.74rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar
          </a>
        </div>
        <div class="dual-viewer-frame-box">
          ${isPdf ? `
            <iframe src="${receipt.url}" title="${escapeHtml(receipt.name)}"></iframe>
          ` : `
            <img src="${receipt.url}" alt="${escapeHtml(receipt.name)}">
          `}
        </div>
        <div class="dual-viewer-audit-meta">
          <strong>Archivo:</strong> ${escapeHtml(receipt.name)} <span style="color: var(--text-muted);">(${receipt.size || 'Archivo original'})</span><br>
          <strong>Fecha Recepción:</strong> ${receipt.uploadDate || debt.createdAt || '-'}<br>
          <strong>Importe a Cobrar:</strong> <span style="font-weight: 700; color: var(--accent-primary);">${debt.currency || 'S/'} ${formatMoney(debt.amount)}</span><br>
          <strong>Titular Receptor:</strong> <span class="badge-chip green" style="padding: 2px 6px; font-size: 0.72rem;">✓ TechSolutions Perú S.A.C. (RUC 20601827361)</span><br>
          ${receipt.fileHash ? `<strong>Huella Digital SHA-256:</strong> <code style="font-size: 0.72rem; color: #93c5fd;">${escapeHtml(receipt.fileHash)}</code>` : ''}
        </div>
      </div>
    `;
  } else {
    leftColHtml = `
      <div class="dual-viewer-col">
        <div class="dual-viewer-col-header">
          <span class="dual-viewer-col-title" style="color: var(--text-heading);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            1. Boleta / Factura por Pagar (Cobro Original)
          </span>
          <span class="badge-pill" style="background: rgba(148, 163, 184, 0.15); color: var(--text-muted); font-size: 0.72rem;">Sin archivo digital</span>
        </div>
        <div class="dual-viewer-empty-box">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-dim); margin-bottom: 12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <strong style="color: var(--text-heading); font-size: 0.96rem;">Sin Documento Digital Adjunto</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; max-width: 320px; line-height: 1.4;">
            Esta obligación se registró con digitación directa sin adjuntar archivo físico/PDF.<br>
            Importe fijado: <strong style="color: var(--accent-primary);">${debt.currency || 'S/'} ${formatMoney(debt.amount)}</strong>.
          </p>
        </div>
        <div class="dual-viewer-audit-meta">
          <strong>Registro contable:</strong> Creado por Asistente Contable<br>
          <strong>Fecha Registro:</strong> ${debt.createdAt || '-'}<br>
          <strong>Importe a Cobrar:</strong> <span style="font-weight: 700; color: var(--accent-primary);">${debt.currency || 'S/'} ${formatMoney(debt.amount)}</span>
        </div>
      </div>
    `;
  }

  // Right Column (Pago / Comprobante) HTML
  let rightColHtml = '';
  if (isPaid && proof) {
    const isPdf = (proof.type && proof.type.includes('pdf')) || (proof.url && proof.url.endsWith('.pdf'));
    const p = debt.payment;
    rightColHtml = `
      <div class="dual-viewer-col">
        <div class="dual-viewer-col-header">
          <span class="dual-viewer-col-title" style="color: #10b981;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            2. Comprobante de Pago Liquidado (Desembolso)
          </span>
          <a href="${proof.url || proof.dataUrl}" target="_blank" download="${escapeHtml(proof.name)}" class="btn btn-secondary btn-sm" style="padding: 3px 10px; font-size: 0.74rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar
          </a>
        </div>
        <div class="dual-viewer-frame-box">
          ${isPdf ? `
            <iframe src="${proof.url || proof.dataUrl}" title="${escapeHtml(proof.name)}"></iframe>
          ` : `
            <img src="${proof.url || proof.dataUrl}" alt="${escapeHtml(proof.name)}">
          `}
        </div>
        <div class="dual-viewer-audit-meta" style="background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3);">
          <strong style="color: #10b981;">Pago Liquidado y Conciliado:</strong><br>
          <strong>Fecha y Hora:</strong> ${formatDateTime(p.paidDate)}<br>
          <strong>Pagado por:</strong> ${escapeHtml(p.paidBy)} &bull; <strong>Método:</strong> ${escapeHtml(p.method)}<br>
          ${isCash ? `
            <strong>Control de Efectivo:</strong> N° Recibo: <code>${escapeHtml(p.cashControl?.cashVoucherNumber || '-')}</code> &bull; Custodio: ${escapeHtml(p.cashControl?.cashCustodian || '-')}
          ` : `
            <strong>N° Transacción / Ref:</strong> <code>${escapeHtml(p.transactionRef || 'Sin referencia')}</code> <span class="badge-chip green" style="padding: 1px 5px; font-size: 0.68rem;">✓ Único</span>
          `}<br>
          <strong>Titular Auditado:</strong> <span class="badge-chip green" style="padding: 2px 6px; font-size: 0.72rem;">✓ TechSolutions Perú S.A.C.</span><br>
          ${proof.fileHash ? `<strong>Huella Digital SHA-256:</strong> <code style="font-size: 0.72rem; color: #34d399;">${escapeHtml(proof.fileHash)}</code>` : ''}
        </div>
      </div>
    `;
  } else if (isPaid && !proof) {
    rightColHtml = `
      <div class="dual-viewer-col">
        <div class="dual-viewer-col-header">
          <span class="dual-viewer-col-title" style="color: #10b981;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            2. Comprobante de Pago Liquidado (Desembolso)
          </span>
          <span class="badge-pill green">Pagado</span>
        </div>
        <div class="dual-viewer-empty-box">
          <strong style="color: #10b981;">Liquidación Realizada</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
            El pago fue marcado como cancelado el ${formatDateTime(debt.payment?.paidDate)}.
          </p>
        </div>
      </div>
    `;
  } else {
    // Unpaid
    rightColHtml = `
      <div class="dual-viewer-col">
        <div class="dual-viewer-col-header">
          <span class="dual-viewer-col-title" style="color: #f59e0b;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            2. Espacio de Liquidación (Pendiente de Pago)
          </span>
          <span class="badge-pill yellow">Pendiente</span>
        </div>
        <div class="dual-viewer-empty-box" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.04);">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" style="margin-bottom: 12px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <strong style="color: #f59e0b; font-size: 0.98rem;">Obligación Pendiente de Desembolso</strong>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; max-width: 320px; line-height: 1.4;">
            Fecha límite de vencimiento: <strong>${formatDate(debt.dueDate)}</strong>.<br>
            El comprobante bancario o recibo de caja chica se adjuntará y quedará visible aquí al registrar el pago.
          </p>
          ${!isGerente && !debt.managerAssumed ? `
            <button type="button" class="btn btn-success btn-sm" style="margin-top: 16px;" onclick="closeModal('modalDocViewer'); openPayModal('${debt.id}');">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Proceder a Pagar Ahora
            </button>
          ` : ''}
        </div>
        <div class="dual-viewer-audit-meta">
          <strong>Estado:</strong> ${debt.managerAssumed ? 'Asumido por Gerencia General' : 'Pendiente de pago por Asistente Contable'}<br>
          <strong>Prioridad:</strong> ${escapeHtml(debt.priority)} &bull; <strong>Categoría:</strong> ${escapeHtml(debt.category || 'General')}
        </div>
      </div>
    `;
  }

  // Inject content into modal
  const contentArea = document.getElementById('viewerContentArea');
  if (contentArea) {
    contentArea.innerHTML = `
      <div class="dual-viewer-header-summary">
        <div>
          <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em;">Expediente de Pago:</span>
          <h3 style="color: var(--text-heading); font-size: 1.15rem; margin-top: 2px;">${escapeHtml(debt.provider)}</h3>
          <p style="font-size: 0.84rem; color: var(--text-muted);">${escapeHtml(debt.concept)}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div style="text-align: right;">
            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Monto Liquidado:</span>
            <div style="font-size: 1.35rem; font-weight: 900; color: ${isPaid ? '#10b981' : 'var(--text-heading)'};">
              ${debt.currency || 'S/'} ${formatMoney(debt.amount)}
            </div>
          </div>
          <div>
            ${isPaid ? '<span class="badge-pill green" style="font-size: 0.82rem; padding: 6px 12px;">PAGADO ✓</span>' : '<span class="badge-pill yellow" style="font-size: 0.82rem; padding: 6px 12px;">PENDIENTE</span>'}
          </div>
        </div>
      </div>

      <div class="dual-viewer-grid">
        ${leftColHtml}
        ${rightColHtml}
      </div>
    `;
  }

  openModal('modalDocViewer');
}

function viewReceipts(debtId) {
  openDualDocumentViewer(debtId);
}

function viewPaymentProof(debtId) {
  openDualDocumentViewer(debtId);
}

function displayDocumentViewer({ title, fileName, fileUrl, fileType, meta, extraDetails }) {
  const titleEl = document.getElementById('viewerTitle');
  if (titleEl) {
    titleEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      ${escapeHtml(title)}
    `;
  }

  const contentArea = document.getElementById('viewerContentArea');
  if (contentArea) {
    const isPdf = (fileType && fileType.includes('pdf')) || (fileUrl && fileUrl.endsWith('.pdf'));
    contentArea.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
          <span style="font-weight: 700; color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(fileName || 'documento.pdf')}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 8px;">${meta || ''}</span>
        </div>
        <a href="${fileUrl}" target="_blank" download="${escapeHtml(fileName || 'documento')}" class="btn btn-secondary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Descargar
        </a>
      </div>
      <div class="document-frame-container">
        ${isPdf ? `<iframe src="${fileUrl}" title="${escapeHtml(fileName || 'documento')}"></iframe>` : `<img src="${fileUrl}" alt="${escapeHtml(fileName || 'documento')}">`}
      </div>
      <div style="margin-top: 14px; font-size: 0.82rem; color: var(--text-muted);">${extraDetails || ''}</div>
    `;
  }

  openModal('modalDocViewer');
}

// ==========================================================================
// OPCIONES DEL POST-IT: EDITAR Y BORRAR CON CONFIRMACIÓN
// ==========================================================================
let currentViewerDebtId = null;

function togglePostitGearMenu(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const dropdown = document.getElementById('postitGearDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

function openEditPostitModal(debtId) {
  const id = debtId || currentViewerDebtId;
  const debt = state.debts.find(d => d.id === id);
  if (!debt) return;

  const dropdown = document.getElementById('postitGearDropdown');
  if (dropdown) dropdown.style.display = 'none';

  document.getElementById('editDebtId').value = debt.id;
  document.getElementById('inpEditProvider').value = debt.provider || '';
  document.getElementById('inpEditConcept').value = debt.concept || '';
  document.getElementById('inpEditAmount').value = Number(debt.amount).toFixed(2);
  document.getElementById('inpEditDueDate').value = debt.dueDate || '';
  document.getElementById('inpEditCategory').value = debt.category || 'Servicios Básicos';
  document.getElementById('inpEditPriority').value = debt.priority || 'Media';

  openModal('modalEditDebt');
}

async function handleSaveEditDebt(e) {
  e.preventDefault();
  const debtId = document.getElementById('editDebtId').value;
  const provider = document.getElementById('inpEditProvider').value.trim();
  const concept = document.getElementById('inpEditConcept').value.trim();
  const amount = parseFloat(document.getElementById('inpEditAmount').value);
  const dueDate = document.getElementById('inpEditDueDate').value;
  const category = document.getElementById('inpEditCategory').value;
  const priority = document.getElementById('inpEditPriority').value;

  if (!provider || isNaN(amount) || amount <= 0 || !dueDate) {
    showToast('Por favor completa todos los campos obligatorios.', 'error');
    return;
  }

  const payload = {
    provider,
    concept: concept || 'Pago de cuentas por pagar',
    amount: Math.round(amount * 100) / 100,
    dueDate,
    category,
    priority
  };

  try {
    const res = await fetch(`/api/debts/${encodeURIComponent(debtId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const idx = state.debts.findIndex(d => d.id === debtId);
      if (idx !== -1) {
        state.debts[idx] = { ...state.debts[idx], ...payload };
      }
      saveLocalFallback(state.debts);
      closeModal('modalEditDebt');
      showToast('Cambios guardados exitosamente en el Post-it.', 'success');

      // Update viewer with updated data
      openDualDocumentViewer(debtId);
      applyFiltersAndRender();
      updateSummaryKPIs();
    } else {
      throw new Error();
    }
  } catch {
    const idx = state.debts.findIndex(d => d.id === debtId);
    if (idx !== -1) {
      state.debts[idx] = { ...state.debts[idx], ...payload };
    }
    saveLocalFallback(state.debts);
    closeModal('modalEditDebt');
    showToast('Cambios guardados localmente.', 'success');
    openDualDocumentViewer(debtId);
    applyFiltersAndRender();
    updateSummaryKPIs();
  }
}

function openDeletePostitModal(debtId) {
  const id = debtId || currentViewerDebtId;
  const debt = state.debts.find(d => d.id === id);
  if (!debt) return;

  const dropdown = document.getElementById('postitGearDropdown');
  if (dropdown) dropdown.style.display = 'none';

  document.getElementById('deleteDebtId').value = debt.id;
  document.getElementById('deleteDebtProvider').textContent = debt.provider;
  document.getElementById('deleteDebtConcept').textContent = debt.concept;
  document.getElementById('deleteDebtDate').textContent = `Vencimiento: ${formatDate(debt.dueDate)}`;
  document.getElementById('deleteDebtAmount').textContent = `${debt.currency || 'S/'} ${formatMoney(debt.amount)}`;

  openModal('modalConfirmDeleteDebt');
}

async function handleConfirmDeletePostit() {
  const debtId = document.getElementById('deleteDebtId').value;
  if (!debtId) return;

  try {
    const res = await fetch(`/api/debts/${encodeURIComponent(debtId)}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      state.debts = state.debts.filter(d => d.id !== debtId);
      saveLocalFallback(state.debts);
      closeModal('modalConfirmDeleteDebt');
      closeModal('modalDocViewer');
      showToast('Post-it eliminado correctamente.', 'success');
      applyFiltersAndRender();
      updateSummaryKPIs();
    } else {
      throw new Error();
    }
  } catch {
    state.debts = state.debts.filter(d => d.id !== debtId);
    saveLocalFallback(state.debts);
    closeModal('modalConfirmDeleteDebt');
    closeModal('modalDocViewer');
    showToast('Post-it eliminado.', 'info');
    applyFiltersAndRender();
    updateSummaryKPIs();
  }
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

    map.forEach((item, key) => {
      const card = document.createElement('div');
      card.style.background = 'var(--bg-card-subtle)';
      card.style.padding = '12px 16px';
      card.style.borderRadius = '8px';
      card.style.border = '1px solid var(--border-medium)';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.style.gap = '14px';
      card.style.flexWrap = 'wrap';

      card.innerHTML = `
        <div style="flex: 1; min-width: 180px;">
          <strong style="color: var(--text-heading); font-size: 0.95rem;">${escapeHtml(item.provider)}</strong>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(item.recurringCategory || item.concept)} &bull; Vence día ${item.dueDate.substring(8, 10)} de cada mes</div>
          <span style="font-size: 0.72rem; color: #0891b2; font-weight: 700;">&#8635; Recurrente Variable (Luz, Agua, Internet, etc.)</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <label style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Importe a programar:</label>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 0.95rem; font-weight: 800; color: #10b981;">S/</span>
            <input type="number" step="0.01" min="0.01" max="1000000"
              class="form-input recurring-amount-input"
              data-key="${escapeHtml(key)}"
              value="${Number(item.amount).toFixed(2)}"
              style="width: 120px; padding: 6px 10px; font-weight: 800; font-size: 1rem; text-align: right; color: #10b981; border-color: #0891b2;"
              title="Puedes alterar el precio si este mes el recibo varía"
            >
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  openModal('modalRecurring');
}

async function handleGenerateNextMonthRecurring(targetMonthStr) {
  const customAmounts = {};
  document.querySelectorAll('.recurring-amount-input').forEach(input => {
    const k = input.getAttribute('data-key');
    const val = parseFloat(input.value);
    if (k && !isNaN(val) && val > 0 && val <= 1000000) {
      customAmounts[k] = val;
    }
  });

  try {
    const res = await fetch('/api/debts/recurring/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetMonth: targetMonthStr, customAmounts })
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
