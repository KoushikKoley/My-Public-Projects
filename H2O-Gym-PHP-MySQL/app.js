/* ============================================================
   FLEXCORE GYM MANAGEMENT SYSTEM - APPLICATION LOGIC
   ============================================================
   Comprehensive JavaScript handling all client-side logic,
   data management, PDF/Excel generation, theme customizer,
   and integration hooks.

   ★ MYSQL / PHP VERSION ★
   All data is now stored in a live MySQL database through a
   PHP REST API (api/index.php) so it can be managed from
   phpMyAdmin and accessed online from any device.
   localStorage is still used ONLY as an offline mirror/cache.
   ============================================================ */

// ============================================================
// SECTION 1: APPLICATION STATE & CONFIGURATION
// ============================================================

/**
 * Master Application State
 * Holds all runtime data, loaded from/saved to localStorage.
 */
const APP_STATE = {
  clients: [],
  enquiries: [],
  invoices: [],
  templates: [],
  notifications: [],
  backups: [],
  trainers: [],
  attendance: [],
  dietPlans: [],
  exercisePlans: [],
  classes: [],
  expenses: [],
  bodyMeasurements: [],
  feedback: [],
  referrals: [],
  loyaltyPoints: [],
  selfRegistrations: [],
  freezes: [],
  campaigns: [],
  currentUser: null,
  currentEditClientId: null,
  currentEditTrainerId: null,
  currentAttendanceClientId: null,
  currentAttendancePeriod: "week",
  currentAttendanceView: "graph",
  currentStarRating: 0,
  passwordVerifyCallback: null,
  charts: {},
};

/**
 * Application Configuration
 * Holds settings including which form fields are required/optional.
 * Change "required" to "optional" or "hidden" to modify form behavior.
 */
const APP_CONFIG = {
  autoBackup: true,
  gymName: "H2O Singur Fitness Gym",
  gymPhone: "+91 98765 43210",
  gymAddress: "123 Fitness Street, Mumbai, India",
  gstNumber: "",
  currency: "₹",
  darkMode: true,
  accent: "emerald",
  selfRegApproval: true,
  /**
   * Plan Prices used for invoice auto-fill, ID card & reports
   */
  planPrices: {
    Monthly: 3000,
    Quarterly: 8000,
    "Half-Yearly": 15000,
    Annual: 25000,
  },
  loyaltyConfig: {
    pointsPerVisit: 10,
    pointsPerRenewal: 100,
    pointsPerReferral: 200,
    perPointValue: 0.5,
  },
  /**
   * Form Field Definitions
   * status: "required" | "optional" | "hidden"
   * Modify status to change form validation and visibility dynamically.
   */
  fieldSettings: {
    firstName: { label: "First Name", status: "required" },
    lastName: { label: "Last Name", status: "required" },
    dob: { label: "Date of Birth", status: "required" },
    anniversary: { label: "Anniversary Date", status: "optional" },
    gender: { label: "Gender", status: "required" },
    bloodGroup: { label: "Blood Group", status: "optional" },
    aadhaar: { label: "Aadhaar Number", status: "required" },
    occupation: { label: "Occupation", status: "optional" },
    mobile: { label: "Mobile Number", status: "required" },
    whatsapp: { label: "WhatsApp Number", status: "optional" },
    email: { label: "Email Address", status: "optional" },
    address: { label: "Address", status: "optional" },
    city: { label: "City", status: "optional" },
    state: { label: "State", status: "optional" },
    pincode: { label: "Pincode", status: "optional" },
    emergencyName: { label: "Emergency Contact Name", status: "optional" },
    emergencyPhone: { label: "Emergency Contact Number", status: "optional" },
    goal: { label: "Fitness Goal", status: "required" },
    weight: { label: "Weight", status: "optional" },
    height: { label: "Height", status: "optional" },
    disease: { label: "Any Disease", status: "optional" },
    surgery: { label: "Previous Surgery", status: "optional" },
    medications: { label: "Current Medications", status: "optional" },
    plan: { label: "Membership Plan", status: "required" },
    joinDate: { label: "Joining Date", status: "required" },
    fees: { label: "Total Fees", status: "required" },
    discount: { label: "Discount", status: "optional" },
    paymentMode: { label: "Payment Mode", status: "required" },
    notes: { label: "Notes", status: "optional" },
  },
};

// ============================================================
// SECTION 2: INITIALIZATION & DATA PERSISTENCE (MySQL API)
// ============================================================

/**
 * REST API endpoint (relative path — works on any domain/subfolder)
 */
const API_URL = "api/index.php";

/**
 * Entities managed through the API (mirrors PHP entity registry)
 */
const SYNC_ENTITIES = [
  "clients",
  "enquiries",
  "invoices",
  "templates",
  "trainers",
  "attendance",
  "dietPlans",
  "exercisePlans",
  "classes",
  "expenses",
  "bodyMeasurements",
  "feedback",
  "referrals",
  "loyaltyPoints",
  "selfRegistrations",
  "freezes",
  "campaigns",
];

/**
 * Internal sync state — tracks dirty entities and the last
 * known server copy of every collection (for fast diffing).
 */
const SYNC_STATE = {
  timers: {},
  pending: {},
  lastSynced: {},
  online: true,
  warnedOffline: {},
};

/**
 * Low-level API call helper.
 * @param {string} action - API action name
 * @param {object|undefined} payload - JSON body (POST when provided)
 * @param {string} method - optional explicit HTTP method
 */
async function apiCall(action, payload, method) {
  const opts = {
    method: method || (payload !== undefined ? "POST" : "GET"),
    credentials: "same-origin",
    headers: {},
  };
  if (payload !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(payload);
  }
  const res = await fetch(API_URL + "?action=" + encodeURIComponent(action), opts);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    throw new Error("Server returned an invalid response (is api/index.php reachable?)");
  }
  if (res.status === 401 && action !== "session" && action !== "login") {
    // PHP session expired — force re-login
    APP_STATE.currentUser = null;
    sessionStorage.removeItem("h2o_user");
    showLogin();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!json.ok) throw new Error(json.message || json.error || "API request failed");
  return json;
}

/**
 * Initialize the application on page load
 */
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

/**
 * Async application bootstrap: session check -> data load -> UI
 */
async function initApp() {
  setupSidebarResize();
  await checkAuthState();
  setupAutoBackup();
}

/**
 * Load all data from the MySQL database (via bootstrap endpoint).
 * Falls back to the localStorage mirror when the server is unreachable.
 */
async function loadAppData() {
  try {
    const res = await apiCall("bootstrap");
    SYNC_STATE.online = true;
    const data = res.data || {};
    SYNC_ENTITIES.forEach((k) => {
      if (Array.isArray(data[k])) {
        APP_STATE[k] = data[k];
        // Remember the server copy for diff-syncing
        try {
          SYNC_STATE.lastSynced[k] = JSON.parse(JSON.stringify(data[k]));
        } catch (e) {
          SYNC_STATE.lastSynced[k] = [];
        }
      }
    });
    if (Array.isArray(data.backups)) APP_STATE.backups = data.backups;
    if (res.config && typeof res.config === "object") {
      Object.assign(APP_CONFIG, res.config);
    }
    // Mirror to localStorage for offline fallback
    mirrorToLocalStorage();
    applyConfigToDOM();
    return true;
  } catch (e) {
    console.error("Bootstrap from MySQL failed, using offline cache:", e);
    loadOfflineCache();
    showToast(
      "error",
      "Connection Problem",
      "Could not reach the server database. Showing last cached data — changes will sync when back online.",
      6000,
    );
    return false;
  }
}

/**
 * Mirror current state to localStorage (offline cache only)
 */
function mirrorToLocalStorage() {
  try {
    SYNC_ENTITIES.forEach((k) => {
      localStorage.setItem("h2o_" + k, JSON.stringify(APP_STATE[k]));
    });
    localStorage.setItem("h2o_config", JSON.stringify(APP_CONFIG));
    localStorage.setItem("h2o_backups", JSON.stringify(APP_STATE.backups));
  } catch (e) {
    console.warn("Offline mirror failed (quota?):", e);
  }
}

/**
 * Load the offline cache (fallback when server unreachable)
 */
function loadOfflineCache() {
  try {
    SYNC_ENTITIES.forEach((k) => {
      const v = localStorage.getItem("h2o_" + k);
      if (v) {
        try {
          APP_STATE[k] = JSON.parse(v);
        } catch (e) {
          console.warn("Bad " + k + " cache, skipping");
        }
      }
    });
    const savedConfig = localStorage.getItem("h2o_config");
    if (savedConfig) {
      Object.assign(APP_CONFIG, JSON.parse(savedConfig));
      applyConfigToDOM();
    }
    const savedBackups = localStorage.getItem("h2o_backups");
    if (savedBackups) APP_STATE.backups = JSON.parse(savedBackups);
  } catch (e) {
    console.error("Error loading offline cache:", e);
  }
}

/**
 * Save specific data key — mirrors to localStorage instantly and
 * queues a diff-sync to the MySQL database (debounced per entity).
 * @param {string} key - The data type to save
 */
function saveAppData(key) {
  if (key === "backups") return; // backups are pushed explicitly via saveBackupToServer()
  if (!SYNC_ENTITIES.includes(key)) return;
  // 1) instant offline mirror
  try {
    localStorage.setItem("h2o_" + key, JSON.stringify(APP_STATE[key]));
  } catch (e) {
    console.warn("Mirror quota exceeded for " + key);
  }
  // 2) queue server sync
  SYNC_STATE.pending[key] = true;
  clearTimeout(SYNC_STATE.timers[key]);
  SYNC_STATE.timers[key] = setTimeout(() => flushSync(key), 700);
}

/**
 * Compute the diff between local state and last-synced server copy,
 * then push it to the API. Full-collection sync is used for
 * attendance (records have no client-side ids).
 */
async function flushSync(key) {
  if (!SYNC_STATE.pending[key]) return;
  const current = APP_STATE[key] || [];
  const last = SYNC_STATE.lastSynced[key] || [];

  const payload = { entity: key };
  if (key === "attendance") {
    payload.full = current;
  } else {
    const upserts = [];
    const deletes = [];
    const lastMap = new Map();
    last.forEach((r) => {
      if (r && r.id !== undefined) lastMap.set(String(r.id), JSON.stringify(r));
    });
    const currentIds = new Set();
    current.forEach((r) => {
      if (r && r.id !== undefined) currentIds.add(String(r.id));
      const k = String(r.id);
      if (!lastMap.has(k) || lastMap.get(k) !== JSON.stringify(r)) upserts.push(r);
    });
    lastMap.forEach((_, id) => {
      if (!currentIds.has(id)) deletes.push(isNaN(id) ? id : Number(id));
    });
    payload.upserts = upserts;
    payload.deletes = deletes;
    if (upserts.length === 0 && deletes.length === 0) {
      SYNC_STATE.pending[key] = false;
      return; // nothing changed
    }
  }

  try {
    await apiCall("sync", payload);
    SYNC_STATE.lastSynced[key] = JSON.parse(JSON.stringify(current));
    SYNC_STATE.pending[key] = false;
    if (!SYNC_STATE.online) {
      SYNC_STATE.online = true;
      showToast("success", "Back Online", "Server connection restored — all data synced.");
    }
  } catch (e) {
    console.error("Sync failed for " + key + ":", e.message);
    // Stay pending — retried on the next change for this entity
    if (SYNC_STATE.online) {
      SYNC_STATE.online = false;
      showToast("error", "Sync Failed", "Changes are saved locally and will retry automatically.", 6000);
    }
  }
}

/**
 * Best-effort flush of pending changes when the tab is hidden/closed
 * (uses sendBeacon so it survives page unload)
 */
window.addEventListener("pagehide", () => {
  Object.keys(SYNC_STATE.pending).forEach((key) => {
    if (!SYNC_STATE.pending[key] || key === "attendance") return;
    const current = APP_STATE[key] || [];
    const last = SYNC_STATE.lastSynced[key] || [];
    const lastMap = new Map();
    last.forEach((r) => {
      if (r && r.id !== undefined) lastMap.set(String(r.id), JSON.stringify(r));
    });
    const currentIds = new Set();
    const upserts = [];
    const deletes = [];
    current.forEach((r) => {
      if (r && r.id !== undefined) currentIds.add(String(r.id));
      const k = String(r.id);
      if (!lastMap.has(k) || lastMap.get(k) !== JSON.stringify(r)) upserts.push(r);
    });
    lastMap.forEach((_, id) => {
      if (!currentIds.has(id)) deletes.push(isNaN(id) ? id : Number(id));
    });
    if (upserts.length || deletes.length) {
      const payload = JSON.stringify({ entity: key, upserts, deletes });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          API_URL + "?action=sync",
          new Blob([payload], { type: "text/plain" }),
        );
      }
    }
  });
});

/**
 * Save app configuration — to MySQL (debounced) + localStorage mirror
 */
let _configSaveTimer = null;
function saveConfig() {
  // Offline mirror first (instant)
  try {
    localStorage.setItem("h2o_config", JSON.stringify(APP_CONFIG));
  } catch (e) {
    console.warn("Config mirror failed");
  }
  // Debounced server write
  clearTimeout(_configSaveTimer);
  _configSaveTimer = setTimeout(async () => {
    try {
      await apiCall("save_config", { config: APP_CONFIG });
    } catch (e) {
      console.error("Config save failed:", e.message);
    }
  }, 600);
}

/* ------------------------------------------------------------------
   OLD OFFLINE-ONLY IMPLEMENTATION (kept commented for reference)
   ------------------------------------------------------------------
function loadAppData() {
  try {
    const keys = [
      "clients", "enquiries", "invoices", "templates", "trainers",
      "attendance", "dietPlans", "exercisePlans", "classes", "expenses",
      "bodyMeasurements", "feedback", "referrals", "loyaltyPoints",
      "selfRegistrations", "freezes", "campaigns",
    ];
    keys.forEach((k) => {
      const v = localStorage.getItem("h2o_" + k);
      if (v) {
        try {
          APP_STATE[k] = JSON.parse(v);
        } catch (e) {
          console.warn("Bad " + k + " data, skipping");
        }
      }
    });
    const savedBackups = localStorage.getItem("h2o_backups");
    if (savedBackups) APP_STATE.backups = JSON.parse(savedBackups);

    const savedConfig = localStorage.getItem("h2o_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      Object.assign(APP_CONFIG, parsed);
      applyConfigToDOM();
    }
  } catch (e) {
    console.error("Error loading data from localStorage:", e);
    showToast("error", "Data Error", "Failed to load saved data.");
  }
}

function saveAppData(key) {
  const map = {
    clients: { state: APP_STATE.clients, storage: "h2o_clients" },
    enquiries: { state: APP_STATE.enquiries, storage: "h2o_enquiries" },
    invoices: { state: APP_STATE.invoices, storage: "h2o_invoices" },
    templates: { state: APP_STATE.templates, storage: "h2o_templates" },
    trainers: { state: APP_STATE.trainers, storage: "h2o_trainers" },
    attendance: { state: APP_STATE.attendance, storage: "h2o_attendance" },
    dietPlans: { state: APP_STATE.dietPlans, storage: "h2o_dietPlans" },
    exercisePlans: {
      state: APP_STATE.exercisePlans,
      storage: "h2o_exercisePlans",
    },
    classes: { state: APP_STATE.classes, storage: "h2o_classes" },
    expenses: { state: APP_STATE.expenses, storage: "h2o_expenses" },
    bodyMeasurements: {
      state: APP_STATE.bodyMeasurements,
      storage: "h2o_bodyMeasurements",
    },
    feedback: { state: APP_STATE.feedback, storage: "h2o_feedback" },
    referrals: { state: APP_STATE.referrals, storage: "h2o_referrals" },
    loyaltyPoints: {
      state: APP_STATE.loyaltyPoints,
      storage: "h2o_loyaltyPoints",
    },
    selfRegistrations: {
      state: APP_STATE.selfRegistrations,
      storage: "h2o_selfRegistrations",
    },
    freezes: { state: APP_STATE.freezes, storage: "h2o_freezes" },
    campaigns: { state: APP_STATE.campaigns, storage: "h2o_campaigns" },
  };
  if (map[key]) {
    try {
      localStorage.setItem(map[key].storage, JSON.stringify(map[key].state));
    } catch (e) {
      console.error("Storage quota exceeded for " + key, e);
      showToast(
        "error",
        "Storage Full",
        "Browser storage limit reached. Please export a backup and clear old data.",
      );
    }
  }
}

function saveConfig() {
  localStorage.setItem("h2o_config", JSON.stringify(APP_CONFIG));
}
   ------------------------------------------------------------------ */

/**
 * Apply loaded configuration to DOM (theme, etc.)
 */
function applyConfigToDOM() {
  const html = document.documentElement;
  html.setAttribute("data-theme", APP_CONFIG.darkMode ? "dark" : "light");
  html.setAttribute("data-accent", APP_CONFIG.accent);

  const darkToggle = document.getElementById("settingDarkMode");
  if (darkToggle) darkToggle.checked = APP_CONFIG.darkMode;
}

// ============================================================
// SECTION 3: AUTHENTICATION (Google Sheets + Local Fallback)
// ============================================================

/**
 * The system verifies login against a Google Sheet.
 * Sheet ID: 1gt3aie2afXzpzo1Qbiy6FffBKgeYlfqqJmbpN6FPO-w
 *
 * FALLBACK: If the Google Sheet is unreachable (CORS, not published,
 * no internet), the system uses the LOCAL_CREDENTIALS object below.
 *
 * ★★★ DEMO / DEFAULT CREDENTIALS ★★★
 *
 *   ADMIN:
 *     Username: admin
 *     Password: admin123
 *
 *   STAFF:
 *     Username: staff
 *     Password: staff123
 *
 * To add more users, edit the LOCAL_CREDENTIALS object below.
 * You can also add them in the Google Sheet — columns: Role, Username, Password
 * Make sure the Sheet is published (File → Share → Publish to Web).
 */
const SHEET_ID = "1gt3aie2afXzpzo1Qbiy6FffBKgeYlfqqJmbpN6FPO-w";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

/**
 * Local credential store — used as fallback when Google Sheet
 * is not reachable. Change or add entries as needed.
 * Each entry: { role, username, password }
 */
const LOCAL_CREDENTIALS = [
  { role: "admin", username: "admin", password: "admin123" },
  { role: "admin", username: "owner", password: "owner123" },
  { role: "staff", username: "staff", password: "staff123" },
  { role: "staff", username: "trainer", password: "trainer123" },
];

/**
 * Check if user is already logged in — verifies the PHP session
 * against the MySQL `users` table via the API.
 */
async function checkAuthState() {
  try {
    const res = await apiCall("session");
    if (res.user) {
      APP_STATE.currentUser = res.user;
      sessionStorage.setItem("h2o_user", JSON.stringify(res.user));
    } else {
      APP_STATE.currentUser = null;
      sessionStorage.removeItem("h2o_user");
    }
  } catch (e) {
    console.warn("Session check failed:", e.message);
  }

  if (APP_STATE.currentUser) {
    const loaded = await loadAppData();
    setupDefaultTemplates();
    populateFieldSettings();
    loadSettingsUI();
    checkDailyBackup();
    if (loaded) {
      showApp();
    } else {
      // Server unreachable but we have cached data — still allow working
      showApp();
    }
  } else {
    showLogin();
  }
  checkSelfRegPortal();
}

/* ------------------------------------------------------------------
   OLD SESSION CHECK (offline-only, kept commented for reference)
   ------------------------------------------------------------------
function checkAuthState() {
  const user = sessionStorage.getItem("h2o_user");
  if (user) {
    APP_STATE.currentUser = JSON.parse(user);
    showApp();
  } else {
    showLogin();
  }
}
   ------------------------------------------------------------------ */

/**
 * Switch between Admin / Staff login tabs
 */
function switchLoginTab(tab) {
  // Deactivate all tabs and forms
  document
    .querySelectorAll(".login-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".login-form")
    .forEach((f) => f.classList.remove("active"));

  // Activate selected tab and corresponding form
  const tabBtn = document.querySelector(`.login-tab[data-login-tab="${tab}"]`);
  const formEl = document.getElementById(`${tab}LoginForm`);

  if (tabBtn) tabBtn.classList.add("active");
  if (formEl) formEl.classList.add("active");
}

/**
 * Handle Admin Login — verifies credentials against the MySQL
 * `users` table through the PHP API.
 */
async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!username || !password) {
    showLoginError("admin", "Please enter both username and password.");
    return;
  }

  const btn = document.getElementById("adminLoginBtn");
  btn.innerHTML =
    '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Verifying...';
  btn.disabled = true;

  let authenticatedUser = null;

  // STEP 1: Verify against MySQL database (users table)
  try {
    const res = await apiCall("login", {
      username,
      password,
      role: "admin",
    });
    if (res.user) authenticatedUser = res.user;
  } catch (e) {
    showLoginError("admin", e.message || "Login failed.");
  }

  // STEP 2: Resolve login
  if (authenticatedUser) {
    APP_STATE.currentUser = authenticatedUser;
    sessionStorage.setItem("h2o_user", JSON.stringify(authenticatedUser));
    await loadAppData();
    setupDefaultTemplates();
    populateFieldSettings();
    loadSettingsUI();
    checkDailyBackup();
    showApp();
    showToast(
      "success",
      "Welcome Back!",
      `Logged in as ${authenticatedUser.name} (Admin)`,
    );
  } else if (
    !document.getElementById("adminLoginError").classList.contains("show")
  ) {
    showLoginError(
      "admin",
      "Invalid username or password. Try admin / admin123",
    );
  }

  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Admin';
  btn.disabled = false;
}

/* ------------------------------------------------------------------
   OLD GOOGLE-SHEET LOGIN (kept commented for reference)
   ------------------------------------------------------------------
async function handleAdminLogin(event) {
  event.preventDefault();
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!username || !password) {
    showLoginError("admin", "Please enter both username and password.");
    return;
  }

  const btn = document.getElementById("adminLoginBtn");
  btn.innerHTML =
    '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Verifying...';
  btn.disabled = true;

  let authenticatedUser = null;

  // STEP 1: Try Google Sheet verification
  try {
    const response = await fetch(SHEET_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const csvText = await response.text();
      const sheetUsers = parseCSV(csvText);
      const match = sheetUsers.find(
        (u) =>
          u.role &&
          u.role.toLowerCase() === "admin" &&
          u.username === username &&
          u.password === password,
      );
      if (match) {
        authenticatedUser = {
          username: match.username,
          role: "admin",
          name: match.username,
        };
      }
    }
  } catch (err) {
    console.warn(
      "Google Sheet unreachable, using local credentials:",
      err.message,
    );
  }

  // STEP 2: Fallback to local credentials if Sheet didn't authenticate
  if (!authenticatedUser) {
    const localMatch = LOCAL_CREDENTIALS.find(
      (c) =>
        c.role === "admin" &&
        c.username === username &&
        c.password === password,
    );
    if (localMatch) {
      authenticatedUser = {
        username: localMatch.username,
        role: "admin",
        name: localMatch.username,
      };
    }
  }

  // STEP 3: Resolve login
  if (authenticatedUser) {
    APP_STATE.currentUser = authenticatedUser;
    sessionStorage.setItem("h2o_user", JSON.stringify(authenticatedUser));
    showApp();
    showToast(
      "success",
      "Welcome Back!",
      `Logged in as ${authenticatedUser.name} (Admin)`,
    );
  } else {
    showLoginError(
      "admin",
      "Invalid username or password. Try admin / admin123",
    );
  }

  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Admin';
  btn.disabled = false;
}
   ------------------------------------------------------------------ */

/**
 * Handle Staff Login — verifies credentials against the MySQL
 * `users` table through the PHP API (role: staff or trainer).
 */
async function handleStaffLogin(event) {
  event.preventDefault();
  const username = document.getElementById("staffUsername").value.trim();
  const password = document.getElementById("staffPassword").value;

  if (!username || !password) {
    showLoginError("staff", "Please enter both staff ID and password.");
    return;
  }

  const btn = document.getElementById("staffLoginBtn");
  btn.innerHTML =
    '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Verifying...';
  btn.disabled = true;

  let authenticatedUser = null;

  // STEP 1: Verify against MySQL database (users table)
  try {
    const res = await apiCall("login", {
      username,
      password,
      role: "staff",
    });
    if (res.user) authenticatedUser = res.user;
  } catch (e) {
    showLoginError("staff", e.message || "Login failed.");
  }

  // STEP 2: Resolve login
  if (authenticatedUser) {
    APP_STATE.currentUser = authenticatedUser;
    sessionStorage.setItem("h2o_user", JSON.stringify(authenticatedUser));
    await loadAppData();
    setupDefaultTemplates();
    populateFieldSettings();
    loadSettingsUI();
    checkDailyBackup();
    showApp();
    showToast(
      "success",
      "Welcome!",
      `Logged in as ${authenticatedUser.name} (Staff)`,
    );
  } else if (
    !document.getElementById("staffLoginError").classList.contains("show")
  ) {
    showLoginError(
      "staff",
      "Invalid staff ID or password. Try staff / staff123",
    );
  }

  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Staff';
  btn.disabled = false;
}

/* ------------------------------------------------------------------
   OLD GOOGLE-SHEET STAFF LOGIN (kept commented for reference)
   ------------------------------------------------------------------
async function handleStaffLogin(event) {
  event.preventDefault();
  const username = document.getElementById("staffUsername").value.trim();
  const password = document.getElementById("staffPassword").value;

  if (!username || !password) {
    showLoginError("staff", "Please enter both staff ID and password.");
    return;
  }

  const btn = document.getElementById("staffLoginBtn");
  btn.innerHTML =
    '<div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> Verifying...';
  btn.disabled = true;

  let authenticatedUser = null;

  // STEP 1: Try Google Sheet verification
  try {
    const response = await fetch(SHEET_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const csvText = await response.text();
      const sheetUsers = parseCSV(csvText);
      const match = sheetUsers.find(
        (u) =>
          u.role &&
          u.role.toLowerCase() === "staff" &&
          u.username === username &&
          u.password === password,
      );
      if (match) {
        authenticatedUser = {
          username: match.username,
          role: "staff",
          name: match.username,
        };
      }
    }
  } catch (err) {
    console.warn(
      "Google Sheet unreachable, using local credentials:",
      err.message,
    );
  }

  // STEP 2: Fallback to local credentials
  if (!authenticatedUser) {
    const localMatch = LOCAL_CREDENTIALS.find(
      (c) =>
        c.role === "staff" &&
        c.username === username &&
        c.password === password,
    );
    if (localMatch) {
      authenticatedUser = {
        username: localMatch.username,
        role: "staff",
        name: localMatch.username,
      };
    }
  }

  // STEP 3: Resolve login
  if (authenticatedUser) {
    APP_STATE.currentUser = authenticatedUser;
    sessionStorage.setItem("h2o_user", JSON.stringify(authenticatedUser));
    showApp();
    showToast(
      "success",
      "Welcome!",
      `Logged in as ${authenticatedUser.name} (Staff)`,
    );
  } else {
    showLoginError(
      "staff",
      "Invalid staff ID or password. Try staff / staff123",
    );
  }

  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In as Staff';
  btn.disabled = false;
}
   ------------------------------------------------------------------ */

/**
 * Show login error message on the correct form
 * @param {string} type - 'admin' or 'staff'
 * @param {string} message - Error text to display
 */
function showLoginError(type, message) {
  const errorEl = document.getElementById(`${type}LoginError`);
  if (errorEl) {
    errorEl.querySelector("span").textContent = message;
    errorEl.classList.add("show");
    setTimeout(() => errorEl.classList.remove("show"), 5000);
  }
}

/**
 * Simple CSV Parser
 * Handles basic comma-separated values with headers
 */
function parseCSV(csv) {
  const lines = csv.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentline = lines[i].split(",");
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j] ? currentline[j].trim() : "";
    }
    result.push(obj);
  }
  return result;
}

/**
 * Show Login Page
 */
function showLogin() {
  document.getElementById("loginPage").style.display = "flex";
  document.getElementById("appLayout").style.display = "none";
}

/**
 * Show Main App after successful login
 */
function showApp() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("appLayout").style.display = "flex";

  const user = APP_STATE.currentUser;
  document.getElementById("sidebarUserName").textContent = user.name;
  document.getElementById("sidebarUserRole").textContent =
    user.role === "admin" ? "Administrator" : "Staff";
  document.getElementById("sidebarUserAvatar").textContent = user.name
    .charAt(0)
    .toUpperCase();

  // Staff cannot access settings
  const settingsBtn = document.querySelector(
    '.sidebar-item[data-page="settings"]',
  );
  if (settingsBtn) {
    settingsBtn.style.display = user.role === "admin" ? "flex" : "none";
  }

  navigateTo("dashboard");
  refreshAllData();
}

/**
 * Logout
 */
function showLogoutConfirm() {
  openModal("logoutConfirmModal");
}

/**
 * Logout — destroy the PHP session server-side too
 */
async function performLogout() {
  try {
    await apiCall("logout", {});
  } catch (e) {
    console.warn("Logout API call failed:", e.message);
  }
  sessionStorage.removeItem("h2o_user");
  APP_STATE.currentUser = null;
  closeModal("logoutConfirmModal");
  showLogin();
  document.getElementById("adminUsername").value = "";
  document.getElementById("adminPassword").value = "";
  document.getElementById("staffUsername").value = "";
  document.getElementById("staffPassword").value = "";
}

/* OLD LOGOUT (offline-only, kept commented for reference)
function performLogout() {
  sessionStorage.removeItem("h2o_user");
  APP_STATE.currentUser = null;
  closeModal("logoutConfirmModal");
  showLogin();
  document.getElementById("adminUsername").value = "";
  document.getElementById("adminPassword").value = "";
  document.getElementById("staffUsername").value = "";
  document.getElementById("staffPassword").value = "";
}
*/

// ============================================================
// SECTION 4: NAVIGATION & LAYOUT
// ============================================================

/**
 * Navigate to a specific page/section
 * @param {string} pageName - The ID of the page to navigate to
 */
function navigateTo(pageName) {
  // Hide all pages
  document.querySelectorAll(".page-content").forEach((page) => {
    page.style.display = "none";
  });

  // Show target page
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.style.display = "block";
    targetPage.classList.add("animate-fadeIn");
    setTimeout(() => targetPage.classList.remove("animate-fadeIn"), 600);
  }

  // Update sidebar active state
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.classList.remove("active");
  });
  const activeItem = document.querySelector(
    `.sidebar-item[data-page="${pageName}"]`,
  );
  if (activeItem) activeItem.classList.add("active");

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Page-specific refresh logic
  switch (pageName) {
    case "dashboard":
      renderDashboard();
      break;
    case "clients":
      renderClientTable();
      break;
    case "registration":
      setupRegistrationForm();
      break;
    case "trainerRegistration":
      setupTrainerForm();
      break;
    case "trainers":
      renderTrainerTable();
      break;
    case "invoices":
      populateInvoiceClientDropdown();
      renderInvoicesList();
      break;
    case "messages":
      renderMessageTemplates();
      break;
    case "notifications":
      renderNotificationsPage();
      break;
    case "backup":
      renderBackupHistory();
      break;
    case "enquiry":
      renderEnquiryTable();
      break;
    case "attendance":
      renderAttendanceTable();
      renderAttendanceChart();
      renderPeakHoursHeatmap();
      break;
    case "idcards":
      populateIDCardClientDropdown();
      renderIDCardPreview();
      break;
    case "dietplans":
      renderDietPlans();
      break;
    case "exerciseplans":
      renderExercisePlans();
      break;
    case "classes":
      renderClasses();
      break;
    case "expenses":
      renderExpenses();
      break;
    case "reports":
      renderReports();
      break;
    case "settings":
      loadSettingsUI();
      renderUsersManagement();
      break;
    case "selfregister":
      renderSelfRegPortal();
      break;
  }
}

/**
 * Toggle Sidebar Collapse (Desktop)
 */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("appMain");
  sidebar.classList.toggle("collapsed");
  main.classList.toggle("sidebar-collapsed");
}

/**
 * Toggle Mobile Sidebar
 */
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  sidebar.classList.toggle("mobile-open");
  overlay.classList.toggle("show");
}

function closeMobileSidebar() {
  document.getElementById("sidebar").classList.remove("mobile-open");
  document.getElementById("sidebarOverlay").classList.remove("show");
}

/**
 * Toggle Fullscreen
 */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

// ============================================================
// SECTION 5: MODAL MANAGEMENT
// ============================================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("show");
  document.body.style.overflow = "";
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("modal-overlay") &&
    e.target.classList.contains("show")
  ) {
    e.target.classList.remove("show");
    document.body.style.overflow = "";
  }
});

// ============================================================
// SECTION 6: TOAST NOTIFICATIONS
// ============================================================

function showToast(type, title, message, duration = 4000) {
  const container = document.getElementById("toastContainer");
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  };

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
        <div class="toast-icon ${type}"><i class="${icons[type]}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300);">
            <i class="fas fa-times"></i>
        </button>
    `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("removing");
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ============================================================
// SECTION 7: CLIENT REGISTRATION & CRUD
// ============================================================

/**
 * Setup the registration form based on field settings
 */
function setupRegistrationForm(editId = null) {
  const form = document.getElementById("registrationForm");
  if (!editId) {
    form.reset();
    document.getElementById("regEditId").value = "";
    document.getElementById("regJoinDate").value = new Date()
      .toISOString()
      .split("T")[0];
    document.getElementById("registrationPageTitle").textContent =
      "New Member Registration";
    document.getElementById("regSubmitBtn").innerHTML =
      '<i class="fas fa-check"></i> Register Member';
    document.getElementById("imagePlaceholder").innerHTML =
      '<i class="fas fa-camera"></i><span>Upload Photo</span>';
    document
      .getElementById("profileImageUpload")
      .querySelector("img")
      ?.remove();
  } else {
    document.getElementById("registrationPageTitle").textContent =
      "Edit Member Details";
    document.getElementById("regSubmitBtn").innerHTML =
      '<i class="fas fa-save"></i> Update Member';
  }

  // Apply field settings (required/optional/hidden)
  Object.entries(APP_CONFIG.fieldSettings).forEach(([field, config]) => {
    const inputMap = {
      firstName: "regFirstName",
      lastName: "regLastName",
      dob: "regDOB",
      anniversary: "regAnniversary",
      gender: "regGender",
      bloodGroup: "regBloodGroup",
      aadhaar: "regAadhaar",
      occupation: "regOccupation",
      mobile: "regMobile",
      whatsapp: "regWhatsApp",
      email: "regEmail",
      address: "regAddress",
      city: "regCity",
      state: "regState",
      pincode: "regPincode",
      emergencyName: "regEmergencyName",
      emergencyPhone: "regEmergencyPhone",
      goal: "regGoal",
      weight: "regWeight",
      height: "regHeight",
      disease: "regDisease",
      surgery: "regSurgery",
      medications: "regMedications",
      plan: "regPlan",
      joinDate: "regJoinDate",
      fees: "regFees",
      discount: "regDiscount",
      paymentMode: "regPaymentMode",
      notes: "regNotes",
    };

    const inputId = inputMap[field];
    if (inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        const formGroup = input.closest(".form-group");
        if (formGroup) {
          if (config.status === "hidden") {
            formGroup.style.display = "none";
          } else {
            formGroup.style.display = "";
            const label = formGroup.querySelector(".form-label");
            const reqSpan = label?.querySelector(".required");
            const optSpan = label?.querySelector(".optional");

            if (config.status === "required") {
              input.required = true;
              if (reqSpan) reqSpan.style.display = "";
              if (optSpan) optSpan.style.display = "none";
            } else {
              input.required = false;
              if (reqSpan) reqSpan.style.display = "none";
              if (optSpan) optSpan.style.display = "";
            }
          }
        }
      }
    }
  });
}

/**
 * Handle image upload for registration
 */
function handleImageUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const uploadDiv = document.getElementById("profileImageUpload");
      let img = uploadDiv.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        uploadDiv.appendChild(img);
      }
      img.src = e.target.result;
      document.getElementById("imagePlaceholder").style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/**
 * Update renewal date based on plan and join date
 */
function updatePlanDates() {
  const plan = document.getElementById("regPlan").value;
  const joinDate = document.getElementById("regJoinDate").value;

  if (plan && joinDate) {
    const date = new Date(joinDate);
    switch (plan) {
      case "Monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "Quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "Half-Yearly":
        date.setMonth(date.getMonth() + 6);
        break;
      case "Annual":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    document.getElementById("regRenewalDate").value = date
      .toISOString()
      .split("T")[0];
  }
}

/**
 * Handle Client Registration Form Submission
 */
function handleClientRegistration(event) {
  event.preventDefault();

  const editId = document.getElementById("regEditId").value;
  const uploadDiv = document.getElementById("profileImageUpload");
  const img = uploadDiv.querySelector("img");
  const photoData = img ? img.src : "";

  const clientData = {
    id: editId || "CLT" + Date.now(),
    firstName: document.getElementById("regFirstName").value.trim(),
    lastName: document.getElementById("regLastName").value.trim(),
    dob: document.getElementById("regDOB").value,
    anniversary: document.getElementById("regAnniversary").value,
    gender: document.getElementById("regGender").value,
    bloodGroup: document.getElementById("regBloodGroup").value,
    aadhaar: document.getElementById("regAadhaar").value.trim(),
    occupation: document.getElementById("regOccupation").value.trim(),
    mobile: document.getElementById("regMobile").value.trim(),
    whatsapp:
      document.getElementById("regWhatsApp").value.trim() ||
      document.getElementById("regMobile").value.trim(),
    email: document.getElementById("regEmail").value.trim(),
    address: document.getElementById("regAddress").value.trim(),
    city: document.getElementById("regCity").value.trim(),
    state: document.getElementById("regState").value.trim(),
    pincode: document.getElementById("regPincode").value.trim(),
    emergencyName: document.getElementById("regEmergencyName").value.trim(),
    emergencyPhone: document.getElementById("regEmergencyPhone").value.trim(),
    goal: document.getElementById("regGoal").value,
    weight: document.getElementById("regWeight").value,
    height: document.getElementById("regHeight").value,
    disease: document.getElementById("regDisease").value.trim(),
    surgery: document.getElementById("regSurgery").value.trim(),
    medications: document.getElementById("regMedications").value.trim(),
    plan: document.getElementById("regPlan").value,
    joinDate: document.getElementById("regJoinDate").value,
    renewalDate: document.getElementById("regRenewalDate").value,
    fees: parseFloat(document.getElementById("regFees").value) || 0,
    discount: parseFloat(document.getElementById("regDiscount").value) || 0,
    paymentMode: document.getElementById("regPaymentMode").value,
    notes: document.getElementById("regNotes").value.trim(),
    photo: photoData,
    status: "active",
    createdAt: editId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editId) {
    // Update existing
    const index = APP_STATE.clients.findIndex((c) => c.id === editId);
    if (index !== -1) {
      clientData.createdAt = APP_STATE.clients[index].createdAt;
      APP_STATE.clients[index] = clientData;
    }
    showToast(
      "success",
      "Member Updated",
      `${clientData.firstName} ${clientData.lastName} updated successfully.`,
    );
  } else {
    // Create new
    APP_STATE.clients.push(clientData);
    generateClientFolder(clientData);
    showToast(
      "success",
      "Member Registered",
      `${clientData.firstName} ${clientData.lastName} added successfully!`,
    );
  }

  saveAppData("clients");
  resetRegistrationForm();
  navigateTo("clients");
  checkNotifications();
}

/**
 * Generate a virtual folder (ZIP) for the client containing their data and photo
 */
async function generateClientFolder(client) {
  try {
    const zip = new JSZip();
    const folderName = `${client.firstName} ${client.lastName} ${formatDate(client.joinDate)}`;
    const clientFolder = zip.folder(folderName);

    // Save JSON data
    const dataCopy = { ...client };
    delete dataCopy.photo; // Photo saved separately
    clientFolder.file("data.json", JSON.stringify(dataCopy, null, 2));

    // Save Photo if exists
    if (client.photo) {
      const base64Data = client.photo.split(",")[1];
      const extension = client.photo.includes("image/png") ? "png" : "jpg";
      clientFolder.file(`photo.${extension}`, base64Data, { base64: true });
    }

    // Generate Excel for client
    const ws = XLSX.utils.json_to_sheet([dataCopy]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Member Data");
    const excelBase64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    clientFolder.file("data.xlsx", excelBase64, { base64: true });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${folderName}.zip`);
  } catch (e) {
    console.error("Folder generation error:", e);
  }
}

/**
 * Reset registration form
 */
function resetRegistrationForm() {
  document.getElementById("registrationForm").reset();
  document.getElementById("regEditId").value = "";
  document.getElementById("regRenewalDate").value = "";
  const uploadDiv = document.getElementById("profileImageUpload");
  const img = uploadDiv.querySelector("img");
  if (img) img.remove();
  document.getElementById("imagePlaceholder").style.display = "";
  setupRegistrationForm();
}

/**
 * Edit Client - Triggers password verification for admin
 */
function editClient(clientId) {
  if (APP_STATE.currentUser.role === "admin") {
    startEditClient(clientId);
  } else {
    // Staff must verify admin password
    requestPasswordVerify(() => startEditClient(clientId));
  }
}

function startEditClient(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;

  navigateTo("registration");

  // Fill form with client data
  document.getElementById("regEditId").value = client.id;
  document.getElementById("regFirstName").value = client.firstName;
  document.getElementById("regLastName").value = client.lastName;
  document.getElementById("regDOB").value = client.dob;
  document.getElementById("regAnniversary").value = client.anniversary || "";
  document.getElementById("regGender").value = client.gender;
  document.getElementById("regBloodGroup").value = client.bloodGroup || "";
  document.getElementById("regAadhaar").value = client.aadhaar;
  document.getElementById("regOccupation").value = client.occupation || "";
  document.getElementById("regMobile").value = client.mobile;
  document.getElementById("regWhatsApp").value = client.whatsapp || "";
  document.getElementById("regEmail").value = client.email || "";
  document.getElementById("regAddress").value = client.address || "";
  document.getElementById("regCity").value = client.city || "";
  document.getElementById("regState").value = client.state || "";
  document.getElementById("regPincode").value = client.pincode || "";
  document.getElementById("regEmergencyName").value =
    client.emergencyName || "";
  document.getElementById("regEmergencyPhone").value =
    client.emergencyPhone || "";
  document.getElementById("regGoal").value = client.goal;
  document.getElementById("regWeight").value = client.weight || "";
  document.getElementById("regHeight").value = client.height || "";
  document.getElementById("regDisease").value = client.disease || "";
  document.getElementById("regSurgery").value = client.surgery || "";
  document.getElementById("regMedications").value = client.medications || "";
  document.getElementById("regPlan").value = client.plan;
  document.getElementById("regJoinDate").value = client.joinDate;
  document.getElementById("regRenewalDate").value = client.renewalDate || "";
  document.getElementById("regFees").value = client.fees;
  document.getElementById("regDiscount").value = client.discount || "";
  document.getElementById("regPaymentMode").value = client.paymentMode;
  document.getElementById("regNotes").value = client.notes || "";

  if (client.photo) {
    const uploadDiv = document.getElementById("profileImageUpload");
    let img = uploadDiv.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      uploadDiv.appendChild(img);
    }
    img.src = client.photo;
    document.getElementById("imagePlaceholder").style.display = "none";
  }

  document.getElementById("registrationPageTitle").textContent =
    `Edit: ${client.firstName} ${client.lastName}`;
  document.getElementById("regSubmitBtn").innerHTML =
    '<i class="fas fa-save"></i> Update Member';
}

/**
 * Delete Client
 */
function deleteClient(clientId) {
  if (
    !confirm(
      "Are you sure you want to delete this member? This action cannot be undone.",
    )
  )
    return;

  APP_STATE.clients = APP_STATE.clients.filter((c) => c.id !== clientId);
  saveAppData("clients");
  renderClientTable();
  renderDashboard();
  showToast("info", "Member Deleted", "The member record has been removed.");
}

/**
 * View Client Profile
 */
function viewClientProfile(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;

  const status = getClientStatus(client);
  const bmi = calculateBMI(client.weight, client.height);
  const loyalty = getClientLoyalty(clientId);
  const attRecords = APP_STATE.attendance.filter(
    (a) => a.clientId === clientId,
  );
  const presentDays = attRecords.filter((a) => a.status === "present").length;
  const totalDays = attRecords.length || 1;
  const attRate = ((presentDays / totalDays) * 100).toFixed(0);

  // Find assigned diet & exercise plans
  const dietPlan = APP_STATE.dietPlans.find((p) => p.assignedTo === clientId);
  const exPlan = APP_STATE.exercisePlans.find((p) => p.assignedTo === clientId);
  const assignedTrainer = APP_STATE.trainers.find(
    (t) => t.assignedClients && t.assignedClients.includes(clientId),
  );

  const profileContent = document.getElementById("clientProfileContent");
  profileContent.innerHTML = `
        <div class="profile-header">
            ${
              client.photo
                ? `<img src="${client.photo}" class="profile-avatar clickable" alt="${client.firstName}" onclick="openImageZoom('${client.id}')" style="cursor:zoom-in;">`
                : `<div class="profile-avatar-placeholder">${client.firstName.charAt(0)}${client.lastName.charAt(0)}</div>`
            }
            <div class="profile-info">
                <h2 class="profile-name">${client.firstName} ${client.lastName}</h2>
                <div class="profile-meta">
                    <span class="profile-meta-item"><i class="fas fa-phone"></i> ${client.mobile}</span>
                    <span class="profile-meta-item"><i class="fas fa-envelope"></i> ${client.email || "N/A"}</span>
                    <span class="profile-meta-item"><i class="fas fa-id-card"></i> ${client.plan} Member</span>
                    <span class="badge badge-${status.class}">${status.text}</span>
                    ${bmi ? `<span class="badge badge-info">BMI: ${bmi.value} (${bmi.category})</span>` : ""}
                    ${loyalty.points > 0 ? `<span class="badge badge-accent loyalty-feature"><i class="fas fa-award"></i> ${loyalty.points} pts</span>` : ""}
                </div>
                ${assignedTrainer ? `<div style="margin-top:8px;"><span class="badge badge-primary"><i class="fas fa-user-tie"></i> Trainer: ${assignedTrainer.firstName} ${assignedTrainer.lastName}</span></div>` : ""}
            </div>
            <div class="profile-actions">
                <button class="btn btn-sm btn-ghost quick-send-btn whatsapp" onclick="sendWhatsApp('${client.whatsapp || client.mobile}', '')" data-tooltip="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                <button class="btn btn-sm btn-ghost quick-send-btn call" onclick="makeCall('${client.mobile}')" data-tooltip="Call"><i class="fas fa-phone"></i></button>
                <button class="btn btn-sm btn-ghost quick-send-btn email" onclick="sendEmail('${client.email}', '', '')" data-tooltip="Email"><i class="fas fa-envelope"></i></button>
                <button class="btn btn-sm btn-ghost" onclick="openAttendanceTracker('${client.id}')" data-tooltip="Attendance"><i class="fas fa-clipboard-check"></i></button>
                <button class="btn btn-sm btn-ghost" onclick="openBodyMeasurement('${client.id}')" data-tooltip="Body Track"><i class="fas fa-ruler"></i></button>
                <button class="btn btn-sm btn-ghost loyalty-feature" onclick="openLoyaltyPoints('${client.id}')" data-tooltip="Loyalty"><i class="fas fa-award"></i></button>
            </div>
        </div>
        <div class="profile-details-grid">
            <div class="profile-detail-card">
                <h4><i class="fas fa-user"></i> Personal</h4>
                <div class="profile-detail-item"><span class="profile-detail-label">DOB</span><span class="profile-detail-value">${formatDate(client.dob)}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Anniversary</span><span class="profile-detail-value">${client.anniversary ? formatDate(client.anniversary) : "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Gender</span><span class="profile-detail-value">${client.gender}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Blood Group</span><span class="profile-detail-value">${client.bloodGroup || "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Aadhaar</span><span class="profile-detail-value">${client.aadhaar || "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Occupation</span><span class="profile-detail-value">${client.occupation || "N/A"}</span></div>
            </div>
            <div class="profile-detail-card">
                <h4><i class="fas fa-heartbeat"></i> Fitness</h4>
                <div class="profile-detail-item"><span class="profile-detail-label">Goal</span><span class="profile-detail-value">${client.goal}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Weight</span><span class="profile-detail-value">${client.weight ? client.weight + " kg" : "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Height</span><span class="profile-detail-value">${client.height ? client.height + " cm" : "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">BMI</span><span class="profile-detail-value">${bmi ? bmi.value + " (" + bmi.category + ")" : "N/A"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Disease</span><span class="profile-detail-value">${client.disease || "None"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Surgery</span><span class="profile-detail-value">${client.surgery || "None"}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Medications</span><span class="profile-detail-value">${client.medications || "None"}</span></div>
            </div>
            <div class="profile-detail-card">
                <h4><i class="fas fa-id-card"></i> Membership</h4>
                <div class="profile-detail-item"><span class="profile-detail-label">Plan</span><span class="profile-detail-value">${client.plan}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Join Date</span><span class="profile-detail-value">${formatDate(client.joinDate)}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Renewal Date</span><span class="profile-detail-value">${formatDate(client.renewalDate)}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Fees</span><span class="profile-detail-value">${APP_CONFIG.currency}${client.fees}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Discount</span><span class="profile-detail-value">${APP_CONFIG.currency}${client.discount || 0}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Paid Via</span><span class="profile-detail-value">${client.paymentMode}</span></div>
                <div class="profile-detail-item"><span class="profile-detail-label">Attendance</span><span class="profile-detail-value">${attRate}% (${presentDays}/${totalDays})</span></div>
            </div>
        </div>
        ${dietPlan ? renderDietPlanCard(dietPlan) : ""}
        ${exPlan ? renderExercisePlanCard(exPlan) : ""}
        ${renderRecentAttendanceChart(clientId)}
    `;

  document.getElementById("profileEditBtn").onclick = () => {
    closeModal("clientProfileModal");
    editClient(clientId);
  };

  openModal("clientProfileModal");
  // Re-render charts inside modal
  setTimeout(() => {
    if (attRecords.length > 0) renderProfileAttendanceChart(clientId);
  }, 200);
}

/**
 * Open image zoom modal
 */
function openImageZoom(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client || !client.photo) return;
  document.getElementById("imageZoomContent").src = client.photo;
  openModal("imageZoomModal");
}

/**
 * Calculate BMI
 */
function calculateBMI(weight, height) {
  if (!weight || !height) return null;
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h) return null;
  const bmi = (w / (h * h)).toFixed(1);
  let category = "Normal";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";
  return { value: bmi, category };
}

/**
 * Get client loyalty points
 */
function getClientLoyalty(clientId) {
  const points = APP_STATE.loyaltyPoints.filter((p) => p.clientId === clientId);
  const total = points.reduce((sum, p) => sum + p.points, 0);
  const redeemed = points
    .filter((p) => p.type === "redeem")
    .reduce((sum, p) => sum + Math.abs(p.points), 0);
  return { points: total - redeemed, history: points };
}

/**
 * Render diet plan card (inline in profile)
 */
function renderDietPlanCard(plan) {
  const meals = (plan.meals || "")
    .split("\n")
    .filter((m) => m.trim())
    .map((m) => {
      const parts = m.split("|").map((s) => s.trim());
      return `<div class="diet-meal-row"><strong>${parts[0] || "Meal"}</strong>: ${parts[1] || ""} <span class="text-muted text-xs">(${parts[2] || ""} cal)</span></div>`;
    })
    .join("");
  return `<div class="card profile-detail-card" style="margin-top:var(--space-4);">
    <h4><i class="fas fa-utensils"></i> Diet Plan: ${plan.name}</h4>
    <div class="profile-detail-item"><span class="profile-detail-label">Goal</span><span class="profile-detail-value">${plan.goal}</span></div>
    <div class="profile-detail-item"><span class="profile-detail-label">Daily Calories</span><span class="profile-detail-value">${plan.calories || "N/A"}</span></div>
    ${plan.description ? `<p class="text-sm text-muted" style="margin-top:var(--space-2);">${plan.description}</p>` : ""}
    <div style="margin-top:var(--space-3);">${meals || "<p class='text-muted text-sm'>No meals defined</p>"}</div>
  </div>`;
}

/**
 * Render exercise plan card (inline in profile)
 */
function renderExercisePlanCard(plan) {
  const workouts = (plan.workouts || "")
    .split("\n")
    .filter((w) => w.trim())
    .map((w) => {
      const parts = w.split("|").map((s) => s.trim());
      return `<div class="ex-workout-row"><strong>${parts[0] || "Day"}</strong>: ${parts[1] || ""} <span class="text-muted text-xs">(${parts[2] || ""})</span></div>`;
    })
    .join("");
  return `<div class="card profile-detail-card" style="margin-top:var(--space-4);">
    <h4><i class="fas fa-dumbbell"></i> Exercise Plan: ${plan.name}</h4>
    <div class="profile-detail-item"><span class="profile-detail-label">Goal</span><span class="profile-detail-value">${plan.goal}</span></div>
    <div class="profile-detail-item"><span class="profile-detail-label">Duration</span><span class="profile-detail-value">${plan.duration || "N/A"} weeks</span></div>
    ${plan.description ? `<p class="text-sm text-muted" style="margin-top:var(--space-2);">${plan.description}</p>` : ""}
    <div style="margin-top:var(--space-3);">${workouts || "<p class='text-muted text-sm'>No workouts defined</p>"}</div>
  </div>`;
}

/**
 * Render recent attendance chart in profile
 */
function renderRecentAttendanceChart(clientId) {
  return `<div class="card profile-detail-card" style="margin-top:var(--space-4);">
    <h4><i class="fas fa-chart-line"></i> Last 14 Days Attendance</h4>
    <div class="chart-container" style="height:200px;"><canvas id="profileAttendanceChart"></canvas></div>
  </div>`;
}

/**
 * Render the profile attendance mini chart
 */
function renderProfileAttendanceChart(clientId) {
  const canvas = document.getElementById("profileAttendanceChart");
  if (!canvas) return;
  if (APP_STATE.charts.profileAttendance)
    APP_STATE.charts.profileAttendance.destroy();
  const today = new Date();
  const labels = [];
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    labels.push(
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    );
    const rec = APP_STATE.attendance.find(
      (a) => a.clientId === clientId && a.date === dateStr,
    );
    data.push(rec && rec.status === "present" ? 1 : 0);
  }
  APP_STATE.charts.profileAttendance = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Present",
          data,
          backgroundColor: data.map((v) => (v ? "#10b981" : "#ef4444")),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: {
            stepSize: 1,
            callback: (v) => (v === 1 ? "Present" : "Absent"),
          },
        },
      },
    },
  });
}

/**
 * Navigate to clients page with a special filter applied
 */
function navigateToClientsWithFilter(filterType) {
  navigateTo("clients");
  const specialSelect = document.getElementById("filterSpecial");
  const statusSelect = document.getElementById("filterStatus");
  // Clear other filters
  if (statusSelect) statusSelect.value = "";
  if (specialSelect) {
    if (filterType === "all") {
      specialSelect.value = "";
    } else if (filterType === "joinedThisMonth") {
      specialSelect.value = "joinedThisMonth";
    } else if (filterType === "renewal") {
      specialSelect.value = "renewal";
    } else if (filterType === "birthday") {
      specialSelect.value = "birthday";
    }
  }
  renderClientTable();
  showToast(
    "info",
    "Filter Applied",
    `Showing members matching: ${filterType}`,
  );
}

// ============================================================
// SECTION 8: CLIENT TABLE & FILTERS
// ============================================================

/**
 * Render the Client Table with current filters applied
 */
function renderClientTable() {
  const tbody = document.getElementById("clientTableBody");
  const filteredClients = getFilteredClients();

  if (filteredClients.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:40px;">
                    <div class="empty-state" style="padding:var(--space-8);">
                        <div class="empty-state-icon"><i class="fas fa-users"></i></div>
                        <h3 class="empty-state-title">No Members Found</h3>
                        <p class="empty-state-desc">Try adjusting your filters or register a new member.</p>
                    </div>
                </td>
            </tr>
        `;
  } else {
    tbody.innerHTML = filteredClients
      .map((client) => {
        const status = getClientStatus(client);
        const initials = client.firstName.charAt(0) + client.lastName.charAt(0);
        return `
                <tr>
                    <td><input type="checkbox" class="client-checkbox" data-id="${client.id}"></td>
                    <td>
                        <div class="flex items-center gap-3">
                            ${
                              client.photo
                                ? `<img src="${client.photo}" class="client-avatar-sm" alt="">`
                                : `<div class="client-avatar-placeholder-sm">${initials}</div>`
                            }
                            <div>
                                <div class="font-semibold text-sm" style="color:var(--text-primary);">${client.firstName} ${client.lastName}</div>
                                <div class="text-xs" style="color:var(--text-tertiary);">${client.goal || "N/A"}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="text-sm">${client.mobile}</div>
                        <div class="text-xs" style="color:var(--text-tertiary);">${client.email || ""}</div>
                    </td>
                    <td><span class="badge badge-primary">${client.plan}</span></td>
                    <td>${formatDate(client.joinDate)}</td>
                    <td>${formatDate(client.renewalDate)}</td>
                    <td><span class="badge badge-${status.class}"><span class="status-dot ${status.class}"></span> ${status.text}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="table-action-btn whatsapp" onclick="sendWhatsApp('${client.whatsapp || client.mobile}', '')" data-tooltip="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                            <button class="table-action-btn call" onclick="makeCall('${client.mobile}')" data-tooltip="Call"><i class="fas fa-phone"></i></button>
                            <button class="table-action-btn email" onclick="sendEmail('${client.email}', '', '')" data-tooltip="Email"><i class="fas fa-envelope"></i></button>
                            <button class="table-action-btn" onclick="viewClientProfile('${client.id}')" data-tooltip="View"><i class="fas fa-eye"></i></button>
                            <button class="table-action-btn attendance" onclick="openAttendanceTracker('${client.id}')" data-tooltip="Attendance"><i class="fas fa-clipboard-check"></i></button>
                            <button class="table-action-btn idcard" onclick="generateSingleIDCard('${client.id}')" data-tooltip="ID Card"><i class="fas fa-id-card"></i></button>
                            <button class="table-action-btn measurement" onclick="openBodyMeasurement('${client.id}')" data-tooltip="Body Track"><i class="fas fa-ruler"></i></button>
                            <button class="table-action-btn loyalty" onclick="openLoyaltyPoints('${client.id}')" data-tooltip="Loyalty"><i class="fas fa-award"></i></button>
                            <button class="table-action-btn referral" onclick="openReferral('${client.id}')" data-tooltip="Referral"><i class="fas fa-share-from-bracket"></i></button>
                            <button class="table-action-btn feedback" onclick="openFeedback('${client.id}')" data-tooltip="Feedback"><i class="fas fa-comment-dots"></i></button>
                            <button class="table-action-btn freeze" onclick="openFreeze('${client.id}')" data-tooltip="Freeze"><i class="fas fa-snowflake"></i></button>
                            <button class="table-action-btn edit" onclick="editClient('${client.id}')" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
                            <button class="table-action-btn delete" onclick="deleteClient('${client.id}')" data-tooltip="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  document.getElementById("paginationInfo").textContent =
    `Showing ${filteredClients.length} of ${APP_STATE.clients.length} members`;
  document.getElementById("clientCountBadge").textContent =
    APP_STATE.clients.length;
}

/**
 * Get filtered clients based on current filter selections
 */
function getFilteredClients() {
  let clients = [...APP_STATE.clients];

  const searchText =
    document.getElementById("clientSearchInput")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";
  const planFilter = document.getElementById("filterPlan")?.value || "";
  const genderFilter = document.getElementById("filterGender")?.value || "";
  const specialFilter = document.getElementById("filterSpecial")?.value || "";

  // Text search
  if (searchText) {
    clients = clients.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchText) ||
        c.mobile.includes(searchText) ||
        (c.email && c.email.toLowerCase().includes(searchText)) ||
        (c.aadhaar && c.aadhaar.includes(searchText)),
    );
  }

  // Status filter
  if (statusFilter) {
    clients = clients.filter((c) => {
      const status = getClientStatus(c);
      return status.key === statusFilter;
    });
  }

  // Plan filter
  if (planFilter) {
    clients = clients.filter((c) => c.plan === planFilter);
  }

  // Gender filter
  if (genderFilter) {
    clients = clients.filter((c) => c.gender === genderFilter);
  }

  // Special filters
  if (specialFilter) {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisDate = today.getDate();

    switch (specialFilter) {
      case "birthday":
        clients = clients.filter((c) => {
          if (!c.dob) return false;
          const dob = new Date(c.dob);
          return dob.getMonth() === thisMonth && dob.getDate() >= thisDate;
        });
        break;
      case "anniversary":
        clients = clients.filter((c) => {
          if (!c.anniversary) return false;
          const ann = new Date(c.anniversary);
          return ann.getMonth() === thisMonth && ann.getDate() >= thisDate;
        });
        break;
      case "renewal":
        clients = clients.filter((c) => {
          if (!c.renewalDate) return false;
          const renew = new Date(c.renewalDate);
          const diffDays = Math.ceil((renew - today) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 7;
        });
        break;
      case "joinedThisMonth":
        clients = clients.filter((c) => {
          const join = new Date(c.joinDate);
          return (
            join.getMonth() === thisMonth &&
            join.getFullYear() === today.getFullYear()
          );
        });
        break;
      case "expiredThisMonth":
        clients = clients.filter((c) => {
          if (!c.renewalDate) return false;
          const renew = new Date(c.renewalDate);
          return (
            renew.getMonth() === thisMonth &&
            renew.getFullYear() === today.getFullYear() &&
            renew < today
          );
        });
        break;
    }
  }

  return clients;
}

/**
 * Triggered when any filter input changes
 */
function filterClients() {
  renderClientTable();
}

/**
 * Clear all client filters
 */
function clearClientFilters() {
  document.getElementById("clientSearchInput").value = "";
  document.getElementById("filterStatus").value = "";
  document.getElementById("filterPlan").value = "";
  document.getElementById("filterGender").value = "";
  document.getElementById("filterSpecial").value = "";
  renderClientTable();
}

/**
 * Get client status based on renewal date
 */
function getClientStatus(client) {
  if (!client.renewalDate)
    return { key: "active", text: "Active", class: "success" };

  const today = new Date();
  const renewal = new Date(client.renewalDate);
  const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { key: "expired", text: "Expired", class: "danger" };
  if (diffDays <= 7)
    return { key: "expiring", text: "Expiring Soon", class: "warning" };
  return { key: "active", text: "Active", class: "success" };
}

/**
 * Select/Deselect all clients in the table
 */
function toggleSelectAllClients(checkbox) {
  document.querySelectorAll(".client-checkbox").forEach((cb) => {
    cb.checked = checkbox.checked;
  });
}

// ============================================================
// SECTION 9: ENQUIRY MANAGEMENT
// ============================================================

/**
 * Handle Enquiry Form Submission
 */
function handleEnquirySubmit(event) {
  event.preventDefault();

  const enquiry = {
    id: "ENQ" + Date.now(),
    name: document.getElementById("enqName").value.trim(),
    phone: document.getElementById("enqPhone").value.trim(),
    email: document.getElementById("enqEmail").value.trim(),
    date: document.getElementById("enqDate").value,
    time: document.getElementById("enqTime").value,
    interest: document.getElementById("enqInterest").value,
    message: document.getElementById("enqMessage").value.trim(),
    status: "New",
    createdAt: new Date().toISOString(),
  };

  APP_STATE.enquiries.push(enquiry);
  saveAppData("enquiries");

  // Auto-export to JSON, Excel, PDF
  exportEnquiries("json");
  exportEnquiries("excel");

  document.getElementById("enquiryForm").reset();
  renderEnquiryTable();
  showToast(
    "success",
    "Enquiry Submitted",
    `${enquiry.name}'s enquiry has been saved.`,
  );
}

/**
 * Render Enquiry Table
 */
function renderEnquiryTable() {
  const tbody = document.getElementById("enquiryTableBody");
  if (APP_STATE.enquiries.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No enquiries yet.</td></tr>';
    return;
  }

  tbody.innerHTML = APP_STATE.enquiries
    .map(
      (enq) => `
        <tr>
            <td class="font-semibold">${enq.name}</td>
            <td>${enq.phone}</td>
            <td>${formatDate(enq.date)}</td>
            <td><span class="badge badge-info">${enq.interest}</span></td>
            <td>
                <select class="form-select form-select-sm" style="width:auto;height:30px;font-size:12px;" onchange="updateEnquiryStatus('${enq.id}', this.value)">
                    <option value="New" ${enq.status === "New" ? "selected" : ""}>New</option>
                    <option value="Contacted" ${enq.status === "Contacted" ? "selected" : ""}>Contacted</option>
                    <option value="Converted" ${enq.status === "Converted" ? "selected" : ""}>Converted</option>
                    <option value="Lost" ${enq.status === "Lost" ? "selected" : ""}>Lost</option>
                </select>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn whatsapp" onclick="sendWhatsApp('${enq.phone}', 'Hi ${enq.name}, regarding your gym enquiry...')" data-tooltip="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                    <button class="table-action-btn call" onclick="makeCall('${enq.phone}')" data-tooltip="Call"><i class="fas fa-phone"></i></button>
                    <button class="table-action-btn email" onclick="sendEmail('${enq.email}', 'H2O Singur Fitness Gym Enquiry', 'Hi ${enq.name}, thanks for your enquiry. We would love to discuss your fitness goals!')" data-tooltip="Email"><i class="fas fa-envelope"></i></button>
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn convert" onclick="convertEnquiryToClient('${enq.id}')" data-tooltip="Convert to Member"><i class="fas fa-user-check"></i></button>
                    <button class="table-action-btn delete" onclick="deleteEnquiry('${enq.id}')" data-tooltip="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("");
}

function updateEnquiryStatus(id, status) {
  const enq = APP_STATE.enquiries.find((e) => e.id === id);
  if (enq) {
    enq.status = status;
    saveAppData("enquiries");
    showToast("info", "Status Updated", `Enquiry marked as ${status}.`);
  }
}

function deleteEnquiry(id) {
  APP_STATE.enquiries = APP_STATE.enquiries.filter((e) => e.id !== id);
  saveAppData("enquiries");
  renderEnquiryTable();
}

// ============================================================
// SECTION 10: INVOICE GENERATION
// ============================================================

let currentInvoiceColor = "#10b981";
let currentInvoiceData = null;

/**
 * Populate Invoice Client Dropdown
 */
function populateInvoiceClientDropdown() {
  const select = document.getElementById("invoiceClient");
  if (!select) return;
  select.innerHTML = '<option value="">Choose client...</option>';
  APP_STATE.clients.forEach((c) => {
    select.innerHTML += `<option value="${c.id}">${c.firstName} ${c.lastName} (${c.mobile})</option>`;
  });

  document.getElementById("invoiceDate").value = new Date()
    .toISOString()
    .split("T")[0];

  // Populate other client dropdowns across pages
  const otherSelects = ["dietPlanClient", "exPlanClient", "idcardClientSelect"];
  otherSelects.forEach((id) => {
    const s = document.getElementById(id);
    if (s) {
      const currentValue = s.value;
      s.innerHTML = '<option value="">None / Choose...</option>';
      APP_STATE.clients.forEach((c) => {
        s.innerHTML += `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`;
      });
      s.value = currentValue;
    }
  });

  // Populate trainer selects
  const trainerSelects = ["exPlanTrainer", "classTrainer"];
  trainerSelects.forEach((id) => {
    const s = document.getElementById(id);
    if (s) {
      const currentValue = s.value;
      s.innerHTML = '<option value="">None</option>';
      APP_STATE.trainers.forEach((t) => {
        s.innerHTML += `<option value="${t.id}">${t.firstName} ${t.lastName}</option>`;
      });
      s.value = currentValue;
    }
  });

  // Update sidebar badges
  updateSidebarBadges();
}

/**
 * Update sidebar notification badges
 */
function updateSidebarBadges() {
  const setText = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  setText("clientCountBadge", APP_STATE.clients.length);
  setText("trainerCountBadge", APP_STATE.trainers.length);
  setText("enquiryCountBadge", APP_STATE.enquiries.length);
  setText("invoiceCountBadge", APP_STATE.invoices.length);
}

/**
 * Plan selection changed in invoice - auto-fill price
 */
function onInvoicePlanChange() {
  const plan = document.getElementById("invoicePlan").value;
  const planRow = document.getElementById("invoicePlanRow");
  if (!plan) {
    if (planRow) planRow.style.display = "none";
    return;
  }
  if (!planRow) {
    // Create plan row at top of items container
    const container = document.getElementById("invoiceItemsContainer");
    const row = document.createElement("div");
    row.className = "form-row invoice-item-row invoice-plan-row";
    row.id = "invoicePlanRow";
    row.style.marginBottom = "8px";
    row.style.background = "rgba(var(--color-primary-rgb), 0.06)";
    row.style.padding = "8px";
    row.style.borderRadius = "var(--border-radius-sm)";
    row.innerHTML = `
      <input type="text" class="form-input" placeholder="Plan Description" style="flex:2;" value="${plan} Membership">
      <input type="number" class="form-input" placeholder="Amount" style="flex:1;" value="${APP_CONFIG.planPrices[plan] || 0}">
      <button class="btn btn-sm btn-ghost" onclick="document.getElementById('invoicePlan').value=''; onInvoicePlanChange(); this.parentElement.remove();"><i class="fas fa-times"></i></button>
    `;
    container.insertBefore(row, container.firstChild);
  } else {
    planRow.style.display = "flex";
    planRow.querySelectorAll("input")[0].value = plan + " Membership";
    planRow.querySelectorAll("input")[1].value =
      APP_CONFIG.planPrices[plan] || 0;
  }
}

/**
 * Invoice client changed - sync plan with client's existing plan
 */
function onInvoiceClientChange() {
  const clientId = document.getElementById("invoiceClient").value;
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (client && client.plan) {
    const planSelect = document.getElementById("invoicePlan");
    if (planSelect) {
      planSelect.value = client.plan;
      onInvoicePlanChange();
    }
  }
}

/**
 * Show edit option for invoice (admin only)
 * FIXED: fully resets the form first, restores the invoice color,
 * matches the plan safely and restores every line item exactly.
 */
function editInvoice(id) {
  if (APP_STATE.currentUser.role !== "admin") {
    showToast("warning", "Access Denied", "Only admins can edit invoices.");
    return;
  }
  const inv = APP_STATE.invoices.find((i) => i.id === id);
  if (!inv) return;

  // Navigate to invoice page and populate form
  navigateTo("invoices");

  // ---- Reset the invoice form completely first ----
  resetInvoiceForm();

  // ---- Client & date ----
  const clientSelect = document.getElementById("invoiceClient");
  clientSelect.value = inv.client && inv.client.id ? inv.client.id : "";
  if (!clientSelect.value) {
    // Client was deleted — rebuild a temporary option so editing still works
    const opt = document.createElement("option");
    opt.value = inv.client.id;
    opt.textContent = `${inv.client.firstName || ""} ${inv.client.lastName || ""} (archived)`;
    clientSelect.appendChild(opt);
    clientSelect.value = inv.client.id;
  }
  document.getElementById("invoiceDate").value = inv.date ||
    new Date().toISOString().split("T")[0];

  // ---- Restore invoice color ----
  if (inv.color) {
    currentInvoiceColor = inv.color;
    const matched = document.querySelector(
      `.invoice-color-option[data-color="${inv.color}"]`,
    );
    document
      .querySelectorAll(".invoice-color-option")
      .forEach((o) => o.classList.remove("active"));
    if (matched) {
      matched.classList.add("active");
    } else {
      selectCustomInvoiceColor(inv.color);
    }
  }

  // ---- Plan row (only when the first item is the membership plan
  //      AND the plan exists in the dropdown) ----
  const planSelect = document.getElementById("invoicePlan");
  const validPlans = Array.from(planSelect.options).map((o) => o.value);
  let planConsumed = false;
  if (inv.items && inv.items.length > 0) {
    const first = inv.items[0];
    if (first && first.description && first.description.includes("Membership")) {
      const planMatch =
        validPlans.find(
          (p) =>
            first.description.toLowerCase().includes(p.toLowerCase()) ||
            (inv.client && inv.client.plan === p),
        ) || "";
      if (planMatch) {
        planSelect.value = planMatch;
        onInvoicePlanChange();
        // Restore the exact description/amount of that first item
        const planRow = document.getElementById("invoicePlanRow");
        if (planRow) {
          planRow.querySelectorAll("input")[0].value = first.description;
          planRow.querySelectorAll("input")[1].value = first.amount;
        }
        planConsumed = true;
      }
    }
  }

  // ---- Restore remaining line items ----
  const container = document.getElementById("invoiceItemsContainer");
  const restItems = inv.items
    ? inv.items.slice(planConsumed ? 1 : 0)
    : [];
  restItems.forEach((item) => {
    addInvoiceItemRow();
    const rows = container.querySelectorAll(
      ".invoice-item-row:not(.invoice-plan-row)",
    );
    const lastRow = rows[rows.length - 1];
    lastRow.querySelectorAll("input")[0].value = item.description;
    lastRow.querySelectorAll("input")[1].value = item.amount;
  });

  // ---- Discount & tax ----
  document.getElementById("invoiceDiscount").value = inv.discount || 0;
  document.getElementById("invoiceTax").value = inv.taxRate || 0;

  // ---- Mark for update ----
  currentInvoiceEditId = inv.id;
  setInvoiceEditMode(true);
  showToast(
    "info",
    "Edit Mode",
    `Invoice ${inv.number} loaded. Change values and click "Generate Invoice" to save.`,
  );
}

/**
 * Reset the invoice form to a clean state
 */
function resetInvoiceForm() {
  const form = document.getElementById("invoiceClient");
  if (!form) return;
  document.getElementById("invoiceClient").value = "";
  document.getElementById("invoiceDate").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("invoicePlan").value = "";
  const planRow = document.getElementById("invoicePlanRow");
  if (planRow) planRow.remove();
  const container = document.getElementById("invoiceItemsContainer");
  container
    .querySelectorAll(".invoice-item-row:not(.invoice-plan-row)")
    .forEach((r) => r.remove());
  document.getElementById("invoiceDiscount").value = "";
  document.getElementById("invoiceTax").value = 18;
  currentInvoiceEditId = null;
  setInvoiceEditMode(false);
}

/**
 * Toggle the visual edit-mode indicator on the invoice form
 */
function setInvoiceEditMode(on) {
  const header = document.querySelector("#page-invoices .card h3");
  const btn = document.querySelector(
    '#page-invoices button[onclick="generateInvoice()"]',
  );
  if (header) {
    header.innerHTML = on
      ? 'Create Invoice <span class="badge badge-warning" style="margin-left:8px;">EDITING ' +
        (currentInvoiceEditId || "") +
        " — will update existing invoice</span>"
      : "Create Invoice";
  }
  if (btn) {
    btn.innerHTML = on
      ? '<i class="fas fa-save"></i> Update Invoice'
      : '<i class="fas fa-file-invoice-dollar"></i> Generate Invoice';
  }
}

let currentInvoiceEditId = null;

/**
 * Select Invoice Color
 */
function selectInvoiceColor(el) {
  document
    .querySelectorAll(".invoice-color-option")
    .forEach((o) => o.classList.remove("active"));
  el.classList.add("active");
  currentInvoiceColor = el.dataset.color;
}

function selectCustomInvoiceColor(color) {
  document
    .querySelectorAll(".invoice-color-option")
    .forEach((o) => o.classList.remove("active"));
  currentInvoiceColor = color;
}

/**
 * Add row to invoice items
 */
function addInvoiceItemRow() {
  const container = document.getElementById("invoiceItemsContainer");
  const row = document.createElement("div");
  row.className = "form-row invoice-item-row";
  row.style.marginBottom = "8px";
  row.innerHTML = `
        <input type="text" class="form-input" placeholder="Description" style="flex:2;">
        <input type="number" class="form-input" placeholder="Amount" style="flex:1;">
        <button class="btn btn-sm btn-ghost" onclick="this.parentElement.remove(); updateInvoicePreview();"><i class="fas fa-times"></i></button>
    `;
  container.appendChild(row);
}

/**
 * Generate Invoice Object
 */
function buildInvoiceObject() {
  const clientId = document.getElementById("invoiceClient").value;
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) {
    showToast(
      "warning",
      "Select Client",
      "Please select a client to generate invoice.",
    );
    return null;
  }

  const items = [];
  // Add plan as first item if selected
  const planName = document.getElementById("invoicePlan")?.value;
  if (planName) {
    const planRow = document.getElementById("invoicePlanRow");
    if (planRow) {
      const desc =
        planRow.querySelectorAll("input")[0].value.trim() ||
        planName + " Membership";
      const amt = parseFloat(planRow.querySelectorAll("input")[1].value) || 0;
      if (amt > 0) items.push({ description: desc, amount: amt });
    }
  }
  // Add additional items (exclude the plan row so the plan is NOT
  // double-counted — it is already added from the plan block above)
  document
    .querySelectorAll(".invoice-item-row:not(.invoice-plan-row)")
    .forEach((row) => {
      const desc = row.querySelectorAll("input")[0].value.trim();
      const amt = parseFloat(row.querySelectorAll("input")[1].value) || 0;
      if (desc && amt) items.push({ description: desc, amount: amt });
    });

  if (items.length === 0) {
    showToast(
      "warning",
      "Add Items",
      "Please add at least one item or select a plan.",
    );
    return null;
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount =
    parseFloat(document.getElementById("invoiceDiscount").value) || 0;
  const taxRate = parseFloat(document.getElementById("invoiceTax").value) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  return {
    id: currentInvoiceEditId || "INV" + Date.now(),
    number: "INV-" + String(APP_STATE.invoices.length + 1).padStart(4, "0"),
    date: document.getElementById("invoiceDate").value,
    client: client,
    items: items,
    subtotal: subtotal,
    discount: discount,
    taxRate: taxRate,
    taxAmount: taxAmount,
    total: total,
    color: currentInvoiceColor,
    gymName: APP_CONFIG.gymName,
    gymPhone: APP_CONFIG.gymPhone,
    gymAddress: APP_CONFIG.gymAddress,
    gstNumber: APP_CONFIG.gstNumber,
  };
}

/**
 * Preview Invoice
 */
function previewInvoice() {
  const invoice = buildInvoiceObject();
  if (!invoice) return;

  currentInvoiceData = invoice;
  renderInvoiceHTML(invoice);
  openModal("invoicePreviewModal");
}

/**
 * Render Invoice HTML
 */
function renderInvoiceHTML(invoice) {
  document.documentElement.style.setProperty("--invoice-color", invoice.color);
  const content = document.getElementById("invoicePreviewContent");
  content.innerHTML = `
        <div class="invoice-preview-header">
            <div class="invoice-preview-brand">
                <div class="invoice-preview-brand-icon" style="background:${invoice.color};"><i class="fas fa-dumbbell"></i></div>
                <div>
                    <h2>${invoice.gymName}</h2>
                    <p>${invoice.gymAddress}<br>${invoice.gymPhone}</p>
                </div>
            </div>
            <div class="invoice-preview-meta">
                <h3 style="color:${invoice.color};">INVOICE</h3>
                <p>${invoice.number}<br>${formatDate(invoice.date)}${invoice.gstNumber ? "<br>GSTIN: " + invoice.gstNumber : ""}</p>
            </div>
        </div>
        <div class="invoice-preview-parties">
            <div class="invoice-preview-party">
                <h4>Bill To</h4>
                <p class="name">${invoice.client.firstName} ${invoice.client.lastName}</p>
                <p>${invoice.client.address || "N/A"}<br>${invoice.client.city || ""}, ${invoice.client.state || ""}<br>${invoice.client.mobile}</p>
            </div>
            <div class="invoice-preview-party" style="text-align:right;">
                <h4>Membership</h4>
                <p class="name">${invoice.client.plan}</p>
                <p>Joined: ${formatDate(invoice.client.joinDate)}<br>Renewal: ${formatDate(invoice.client.renewalDate)}</p>
            </div>
        </div>
        <table class="invoice-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th style="text-align:right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items
                  .map(
                    (item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${item.description}</td>
                        <td style="text-align:right;">${APP_CONFIG.currency}${item.amount.toFixed(2)}</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
            <tfoot>
                <tr><td colspan="2">Subtotal</td><td style="text-align:right;">${APP_CONFIG.currency}${invoice.subtotal.toFixed(2)}</td></tr>
                ${invoice.discount > 0 ? `<tr><td colspan="2">Discount</td><td style="text-align:right;">-${APP_CONFIG.currency}${invoice.discount.toFixed(2)}</td></tr>` : ""}
                ${invoice.taxRate > 0 ? `<tr><td colspan="2">Tax (${invoice.taxRate}%)</td><td style="text-align:right;">${APP_CONFIG.currency}${invoice.taxAmount.toFixed(2)}</td></tr>` : ""}
                <tr class="invoice-total-row"><td colspan="2" style="font-size:16px;">Total</td><td style="text-align:right;">${APP_CONFIG.currency}${invoice.total.toFixed(2)}</td></tr>
            </tfoot>
        </table>
        <div class="invoice-preview-footer">
            <p>Thank you for your business!</p>
        </div>
    `;
}

/**
 * Generate and Save Invoice (create new or update existing)
 */
function generateInvoice() {
  const invoice = buildInvoiceObject();
  if (!invoice) return;

  currentInvoiceData = invoice;
  if (currentInvoiceEditId) {
    const idx = APP_STATE.invoices.findIndex(
      (i) => i.id === currentInvoiceEditId,
    );
    if (idx !== -1) {
      invoice.id = currentInvoiceEditId;
      invoice.number = APP_STATE.invoices[idx].number;
      APP_STATE.invoices[idx] = invoice;
      showToast(
        "success",
        "Invoice Updated",
        `Invoice ${invoice.number} updated.`,
      );
    }
    currentInvoiceEditId = null;
    setInvoiceEditMode(false);
  } else {
    APP_STATE.invoices.push(invoice);
    showToast(
      "success",
      "Invoice Generated",
      `Invoice ${invoice.number} created.`,
    );
  }
  saveAppData("invoices");
  updateSidebarBadges();

  renderInvoiceHTML(invoice);
  openModal("invoicePreviewModal");
  renderInvoicesList();
}

/**
 * Download Invoice as PDF
 */
function downloadInvoicePDF() {
  if (!currentInvoiceData) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const inv = currentInvoiceData;

  // Header
  doc.setFillColor(inv.color);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.text(inv.gymName, 20, 22);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`${inv.gymAddress} | ${inv.gymPhone}`, 20, 32);

  // Invoice Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(20);
  doc.setFont(undefined, "bold");
  doc.text("INVOICE", 150, 55);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Invoice #: ${inv.number}`, 150, 63);
  doc.text(`Date: ${formatDate(inv.date)}`, 150, 69);

  // Bill To
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text("BILL TO", 20, 60);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text(`${inv.client.firstName} ${inv.client.lastName}`, 20, 68);
  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  doc.text(`${inv.client.address || ""}, ${inv.client.city || ""}`, 20, 75);
  doc.text(`Mobile: ${inv.client.mobile}`, 20, 81);

  // Table
  const tableBody = inv.items.map((item, i) => [
    i + 1,
    item.description,
    `${APP_CONFIG.currency}${item.amount.toFixed(2)}`,
  ]);

  doc.autoTable({
    startY: 90,
    head: [["#", "Description", "Amount"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: inv.color, textColor: 255 },
    foot: [
      ["", "Subtotal", `${APP_CONFIG.currency}${inv.subtotal.toFixed(2)}`],
      ...(inv.discount > 0
        ? [
            [
              "",
              "Discount",
              `-${APP_CONFIG.currency}${inv.discount.toFixed(2)}`,
            ],
          ]
        : []),
      ...(inv.taxRate > 0
        ? [
            [
              "",
              `Tax (${inv.taxRate}%)`,
              `${APP_CONFIG.currency}${inv.taxAmount.toFixed(2)}`,
            ],
          ]
        : []),
      ["", "Total", `${APP_CONFIG.currency}${inv.total.toFixed(2)}`],
    ],
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", 105, 280, { align: "center" });
  }

  doc.save(`${inv.number}_${inv.client.firstName}_${inv.client.lastName}.pdf`);
  showToast("success", "PDF Downloaded", "Invoice PDF has been saved.");
}

/**
 * Send Invoice via WhatsApp
 */
function sendInvoiceWhatsApp() {
  if (!currentInvoiceData) return;
  const inv = currentInvoiceData;
  const phone = (inv.client.whatsapp || inv.client.mobile).replace(/\D/g, "");
  const message = `Hi ${inv.client.firstName}, here is your invoice ${inv.number} for ${APP_CONFIG.currency}${inv.total.toFixed(2)}. Thank you for choosing ${inv.gymName}!`;
  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank",
  );
}

/**
 * Send Invoice via Email
 */
function sendInvoiceEmail() {
  if (!currentInvoiceData) return;
  const inv = currentInvoiceData;
  const subject = `Invoice ${inv.number} from ${inv.gymName}`;
  const body = `Dear ${inv.client.firstName},\n\nPlease find your invoice details below:\n\nInvoice #: ${inv.number}\nDate: ${formatDate(inv.date)}\nTotal: ${APP_CONFIG.currency}${inv.total.toFixed(2)}\n\nThank you for your business!\n\nRegards,\n${inv.gymName}`;
  window.open(
    `mailto:${inv.client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    "_blank",
  );
}

/**
 * Render list of generated invoices
 */
function renderInvoicesList() {
  const container = document.getElementById("invoicesListContainer");
  if (APP_STATE.invoices.length === 0) {
    container.innerHTML =
      '<div class="empty-state" style="padding:var(--space-8);"><div class="empty-state-icon"><i class="fas fa-file-invoice-dollar"></i></div><p class="text-muted">No invoices generated yet.</p></div>';
    return;
  }

  container.innerHTML = APP_STATE.invoices
    .slice()
    .reverse()
    .map(
      (inv) => `
        <div class="backup-item invoice-list-card" style="margin-bottom:8px;">
            <div class="backup-item-info">
                <div class="backup-item-icon" style="color:${inv.color};"><i class="fas fa-file-invoice"></i></div>
                <div>
                    <div class="backup-item-name">${inv.number} - ${inv.client.firstName} ${inv.client.lastName}</div>
                    <div class="backup-item-date">${formatDate(inv.date)} | ${APP_CONFIG.currency}${inv.total.toFixed(2)}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-sm btn-ghost" onclick="viewInvoice('${inv.id}')" data-tooltip="View"><i class="fas fa-eye"></i></button>
                ${APP_STATE.currentUser.role === "admin" ? `<button class="btn btn-sm btn-ghost" onclick="editInvoice('${inv.id}')" data-tooltip="Edit"><i class="fas fa-edit"></i></button>` : ""}
                <button class="btn btn-sm btn-ghost quick-send-btn whatsapp" onclick="currentInvoiceData=APP_STATE.invoices.find(i=>i.id==='${inv.id}'); sendInvoiceWhatsApp();" data-tooltip="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
                <button class="btn btn-sm btn-ghost quick-send-btn email" onclick="currentInvoiceData=APP_STATE.invoices.find(i=>i.id==='${inv.id}'); sendInvoiceEmail();" data-tooltip="Email"><i class="fas fa-envelope"></i></button>
            </div>
        </div>
    `,
    )
    .join("");
}

function viewInvoice(id) {
  const inv = APP_STATE.invoices.find((i) => i.id === id);
  if (inv) {
    currentInvoiceData = inv;
    renderInvoiceHTML(inv);
    openModal("invoicePreviewModal");
  }
}

// ============================================================
// SECTION 11: MESSAGING & TEMPLATES
// ============================================================

/**
 * Setup default message templates if none exist
 */
function setupDefaultTemplates() {
  if (APP_STATE.templates.length === 0) {
    APP_STATE.templates = [
      {
        id: "tpl_bday",
        name: "Birthday Wish",
        category: "birthday",
        content: `Happy Birthday {name}! 🎂🎉 Wishing you a fantastic day filled with joy and health from all of us at {gym}! May this year bring you closer to your fitness goals!`,
      },
      {
        id: "tpl_anniv",
        name: "Anniversary Wish",
        category: "anniversary",
        content: `Happy Anniversary {name}! 💐 Congratulations on another wonderful year! Enjoy your special day from the {gym} family!`,
      },
      {
        id: "tpl_renew",
        name: "Renewal Reminder",
        category: "renewal",
        content: `Hi {name}, your {gym} membership is expiring on {date}. Renew now to keep crushing your fitness goals without interruption! 💪`,
      },
      {
        id: "tpl_welcome",
        name: "Welcome Message",
        category: "welcome",
        content: `Welcome to {gym}, {name}! 🏋️‍♂️ We are thrilled to have you on board. Your fitness journey starts now. Let's make it happen!`,
      },
      {
        id: "tpl_absent",
        name: "Absence Check-in",
        category: "custom",
        content: `Hi {name}, we noticed you haven't visited {gym} in a while. We miss you! Everything okay? Let us know if you need any help getting back on track. 💪`,
      },
    ];
    saveAppData("templates");
  }
}

/**
 * Render Message Templates Page
 */
function renderMessageTemplates() {
  const grid = document.getElementById("templateGrid");
  const clients = APP_STATE.clients;

  grid.innerHTML = APP_STATE.templates
    .map((tpl) => {
      const iconMap = {
        birthday: "fa-cake-candles",
        anniversary: "fa-heart",
        renewal: "fa-clock",
        welcome: "fa-hands-clapping",
        custom: "fa-message",
      };
      const colorMap = {
        birthday: "accent",
        anniversary: "danger",
        renewal: "info",
        welcome: "success",
        custom: "primary",
      };

      return `
            <div class="template-card">
                <div class="template-card-header">
                    <span class="template-type-badge badge-${colorMap[tpl.category]}"><i class="fas ${iconMap[tpl.category]}"></i> ${tpl.category}</span>
                    <button class="btn btn-sm btn-ghost" onclick="deleteTemplate('${tpl.id}')"><i class="fas fa-trash"></i></button>
                </div>
                <h4 style="margin-bottom:var(--space-2);">${tpl.name}</h4>
                <div class="template-card-body">${tpl.content}</div>
                <div class="template-card-actions">
                    <select class="form-select form-select-sm" id="tplClient_${tpl.id}" style="flex:1;height:32px;font-size:12px;">
                        <option value="">Select client...</option>
                        ${clients.map((c) => `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`).join("")}
                    </select>
                    <button class="btn btn-sm quick-send-btn whatsapp" onclick="sendTemplate('${tpl.id}', 'whatsapp')"><i class="fa-brands fa-whatsapp"></i></button>
                    <button class="btn btn-sm quick-send-btn email" onclick="sendTemplate('${tpl.id}', 'email')"><i class="fas fa-envelope"></i></button>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * Send Template via WhatsApp or Email
 */
function sendTemplate(tplId, method) {
  const tpl = APP_STATE.templates.find((t) => t.id === tplId);
  const selectEl = document.getElementById(`tplClient_${tplId}`);
  const clientId = selectEl?.value;
  const client = APP_STATE.clients.find((c) => c.id === clientId);

  if (!client) {
    showToast(
      "warning",
      "Select Client",
      "Please select a client to send the message to.",
    );
    return;
  }

  let message = tpl.content
    .replace(/{name}/g, client.firstName)
    .replace(/{gym}/g, APP_CONFIG.gymName)
    .replace(
      /{date}/g,
      client.renewalDate ? formatDate(client.renewalDate) : "N/A",
    );

  if (method === "whatsapp") {
    sendWhatsApp(client.whatsapp || client.mobile, message);
  } else {
    sendEmail(client.email, `Message from ${APP_CONFIG.gymName}`, message);
  }
}

/**
 * Open Add Template Modal
 */
function openAddTemplateModal() {
  openModal("addTemplateModal");
}

/**
 * Save New Template
 */
function saveNewTemplate() {
  const name = document.getElementById("templateName").value.trim();
  const category = document.getElementById("templateCategory").value;
  const content = document.getElementById("templateContent").value.trim();

  if (!name || !content) {
    showToast(
      "warning",
      "Missing Fields",
      "Please fill in template name and content.",
    );
    return;
  }

  APP_STATE.templates.push({
    id: "tpl_" + Date.now(),
    name,
    category,
    content,
  });
  saveAppData("templates");
  closeModal("addTemplateModal");
  renderMessageTemplates();
  showToast("success", "Template Saved", `Template "${name}" added.`);

  document.getElementById("templateName").value = "";
  document.getElementById("templateContent").value = "";
}

function deleteTemplate(id) {
  APP_STATE.templates = APP_STATE.templates.filter((t) => t.id !== id);
  saveAppData("templates");
  renderMessageTemplates();
}

// Quick Send Helpers
function sendWhatsApp(phone, text) {
  const cleanPhone = phone.replace(/\D/g, "");
  window.open(
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`,
    "_blank",
  );
}

function makeCall(phone) {
  window.open(`tel:${phone}`, "_self");
}

function sendEmail(email, subject, body) {
  if (!email) {
    showToast(
      "warning",
      "No Email",
      "This client does not have an email address.",
    );
    return;
  }
  window.open(
    `mailto:${email}?subject=${encodeURIComponent(subject || "Message from " + APP_CONFIG.gymName)}&body=${encodeURIComponent(body || "")}`,
    "_blank",
  );
}

// ============================================================
// SECTION 12: NOTIFICATIONS
// ============================================================

/**
 * Check for upcoming birthdays, anniversaries, and renewals
 */
function checkNotifications() {
  const notifications = [];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  APP_STATE.clients.forEach((client) => {
    // Birthday Check
    if (client.dob) {
      const dobThisYear = new Date(client.dob);
      dobThisYear.setFullYear(today.getFullYear());

      const diffDays = Math.floor(
        (dobThisYear - today) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0) {
        notifications.push({
          type: "birthday",
          icon: "fa-cake-candles",
          title: `Birthday Today!`,
          desc: `${client.firstName} ${client.lastName}'s birthday is today!`,
          clientId: client.id,
          date: today.toISOString(),
        });
      } else if (diffDays === 1) {
        notifications.push({
          type: "birthday",
          icon: "fa-cake-candles",
          title: `Birthday Tomorrow`,
          desc: `${client.firstName} ${client.lastName}'s birthday is tomorrow.`,
          clientId: client.id,
          date: today.toISOString(),
        });
      }
    }

    // Anniversary Check
    if (client.anniversary) {
      const annThisYear = new Date(client.anniversary);
      annThisYear.setFullYear(today.getFullYear());
      const diffDays = Math.floor(
        (annThisYear - today) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === 0 || diffDays === 1) {
        notifications.push({
          type: "anniversary",
          icon: "fa-heart",
          title: `Anniversary ${diffDays === 0 ? "Today" : "Tomorrow"}`,
          desc: `${client.firstName} ${client.lastName}'s anniversary.`,
          clientId: client.id,
          date: today.toISOString(),
        });
      }
    }

    // Renewal Check
    if (client.renewalDate) {
      const renew = new Date(client.renewalDate);
      const diffDays = Math.floor((renew - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 0 || diffDays === 1) {
        notifications.push({
          type: "renewal",
          icon: "fa-clock",
          title: `Renewal ${diffDays === 0 ? "Today" : "Tomorrow"}`,
          desc: `${client.firstName} ${client.lastName}'s membership ${diffDays === 0 ? "expires today" : "expires tomorrow"}.`,
          clientId: client.id,
          date: today.toISOString(),
        });
      }
    }
  });

  APP_STATE.notifications = notifications;

  const badge = document.getElementById("notifCountBadge");
  const dot = document.getElementById("notifDot");
  if (notifications.length > 0) {
    badge.textContent = notifications.length;
    dot.style.display = "block";
  } else {
    badge.textContent = "0";
    dot.style.display = "none";
  }
}

/**
 * Toggle Notification Panel
 */
function toggleNotificationPanel() {
  document.getElementById("notificationPanel").classList.toggle("open");
  document.getElementById("themePanel").classList.remove("open");
  renderNotificationPanelList();
}

function renderNotificationPanelList() {
  const list = document.getElementById("notificationPanelList");
  if (APP_STATE.notifications.length === 0) {
    list.innerHTML =
      '<div class="empty-state" style="padding:40px 20px;"><div class="empty-state-icon"><i class="fas fa-bell-slash"></i></div><p class="text-muted text-sm">No new notifications.</p></div>';
    return;
  }

  list.innerHTML = APP_STATE.notifications
    .map((n) => {
      const iconClass =
        n.type === "birthday"
          ? "accent"
          : n.type === "anniversary"
            ? "danger"
            : "info";
      return `
            <div class="notification-item" onclick="viewClientProfile('${n.clientId}')">
                <div class="notification-item-icon ${n.type}"><i class="fas ${n.icon}"></i></div>
                <div class="notification-item-content">
                    <div class="notification-item-title">${n.title}</div>
                    <div class="notification-item-desc">${n.desc}</div>
                </div>
            </div>
        `;
    })
    .join("");
}

/**
 * Render Notifications Page
 */
function renderNotificationsPage() {
  const container = document.getElementById("notificationFullList");
  if (APP_STATE.notifications.length === 0) {
    container.innerHTML =
      '<div class="card"><div class="empty-state" style="padding:60px;"><div class="empty-state-icon"><i class="fas fa-bell-slash"></i></div><h3 class="empty-state-title">All Caught Up!</h3><p class="empty-state-desc">No upcoming events or reminders for today or tomorrow.</p></div></div>';
    return;
  }

  container.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">Active Reminders</h3></div><div class="card-body">
        ${APP_STATE.notifications
          .map(
            (n) => `
            <div class="notification-item" onclick="viewClientProfile('${n.clientId}')" style="padding:var(--space-4);border-bottom:1px solid var(--border-color);">
                <div class="notification-item-icon ${n.type}" style="width:44px;height:44px;font-size:18px;"><i class="fas ${n.icon}"></i></div>
                <div class="notification-item-content">
                    <div class="notification-item-title" style="font-size:var(--font-size-base);">${n.title}</div>
                    <div class="notification-item-desc">${n.desc}</div>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-sm quick-send-btn whatsapp" onclick="event.stopPropagation(); sendWhatsApp(APP_STATE.clients.find(c=>c.id==='${n.clientId}')?.whatsapp || '', 'Hi ${n.desc.split(" ")[0]}...')"><i class="fa-brands fa-whatsapp"></i></button>
                </div>
            </div>
        `,
          )
          .join("")}
    </div></div>`;
}

function markAllNotificationsRead() {
  APP_STATE.notifications = [];
  document.getElementById("notifDot").style.display = "none";
  document.getElementById("notifCountBadge").textContent = "0";
  renderNotificationPanelList();
  showToast("info", "Cleared", "All notifications marked as read.");
}

// ============================================================
// SECTION 13: DATA EXPORT (PDF, EXCEL, JSON)
// ============================================================

/**
 * Export all clients data
 */
function exportAllClients(format) {
  if (APP_STATE.clients.length === 0) {
    showToast("warning", "No Data", "There are no clients to export.");
    return;
  }

  // Prepare clean data without photo base64
  const cleanData = APP_STATE.clients.map((c) => {
    const obj = { ...c };
    delete obj.photo;
    return obj;
  });

  switch (format) {
    case "json":
      const blob = new Blob([JSON.stringify(cleanData, null, 2)], {
        type: "application/json",
      });
      saveAs(
        blob,
        `H2O_Singur_Clients_${new Date().toISOString().split("T")[0]}.json`,
      );
      break;
    case "excel":
      const ws = XLSX.utils.json_to_sheet(cleanData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      XLSX.writeFile(
        wb,
        `H2O_Singur_Clients_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      break;
    case "pdf":
      exportClientsPDF(cleanData);
      break;
  }
  showToast(
    "success",
    "Exported",
    `Client data exported as ${format.toUpperCase()}.`,
  );
}

function exportClientsPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");

  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text(`${APP_CONFIG.gymName} - Client Directory`, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${formatDate(new Date())}`, 14, 30);

  const tableData = data.map((c) => [
    `${c.firstName} ${c.lastName}`,
    c.mobile,
    c.email || "N/A",
    c.plan,
    formatDate(c.joinDate),
    formatDate(c.renewalDate),
    getClientStatus(c).text,
  ]);

  doc.autoTable({
    startY: 35,
    head: [["Name", "Mobile", "Email", "Plan", "Joined", "Renewal", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`H2O_Singur_Clients_${new Date().toISOString().split("T")[0]}.pdf`);
}

/**
 * Export Enquiries
 */
function exportEnquiries(format) {
  if (APP_STATE.enquiries.length === 0) return;

  if (format === "json") {
    const blob = new Blob([JSON.stringify(APP_STATE.enquiries, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `Enquiries_${new Date().toISOString().split("T")[0]}.json`);
  } else if (format === "excel") {
    const ws = XLSX.utils.json_to_sheet(APP_STATE.enquiries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
    XLSX.writeFile(
      wb,
      `Enquiries_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }
}

// ============================================================
// SECTION 14: BACKUP & RESTORE
// ============================================================

/**
 * Download full system backup as JSON
 */
/**
 * Build a full backup snapshot of every collection
 */
function buildBackupSnapshot() {
  const snap = {
    exportDate: new Date().toISOString(),
    version: "2.0",
  };
  SYNC_ENTITIES.forEach((k) => {
    snap[k] = APP_STATE[k] || [];
  });
  snap.config = APP_CONFIG;
  return snap;
}

/**
 * Push a backup record (with optional data payload) to the MySQL
 * `backups` table so it is available from any device.
 */
async function saveBackupToServer(record, withData) {
  try {
    const payload = {
      jsId: record.id,
      name: record.name || (record.type === "auto" ? "Auto-Backup" : "Manual Backup"),
      type: record.type || "manual",
      size: record.size || "",
      date: record.date || new Date().toISOString(),
    };
    if (withData) payload.data = buildBackupSnapshot();
    const res = await apiCall("save_backup", payload);
    record.serverId = res.id;
    // Refresh server list (server may have merged duplicates)
    await loadServerBackups();
    renderBackupHistory();
  } catch (e) {
    console.error("Server backup failed:", e);
    showToast("warning", "Server Backup", "Backup downloaded but server copy failed: " + e.message, 5000);
  }
}

/**
 * Reload the server backup list into APP_STATE.backups
 */
async function loadServerBackups() {
  try {
    const res = await apiCall("bootstrap");
    if (Array.isArray(res.data && res.data.backups)) {
      APP_STATE.backups = res.data.backups;
      localStorage.setItem("h2o_backups", JSON.stringify(APP_STATE.backups));
    }
  } catch (e) {
    console.warn("Could not load server backups:", e.message);
  }
}

function downloadFullBackup() {
  const snapshot = buildBackupSnapshot();

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  saveAs(
    blob,
    `H2O_Singur_Backup_${new Date().toISOString().split("T")[0]}.json`,
  );

  // Save backup record + full snapshot to the SERVER (restorable from anywhere)
  const record = {
    id: "bak_" + Date.now(),
    date: new Date().toISOString(),
    type: "manual",
    size: (blob.size / 1024).toFixed(1) + " KB",
  };
  renderBackupHistory();
  showToast("success", "Backup Complete", "Full system backup downloaded and stored on server.");
  saveBackupToServer(record, true);
}

/* OLD MANUAL BACKUP (localStorage only, kept commented for reference)
function downloadFullBackup() {
  const backupData = {
    exportDate: new Date().toISOString(),
    version: "2.0",
    clients: APP_STATE.clients,
    enquiries: APP_STATE.enquiries,
    invoices: APP_STATE.invoices,
    templates: APP_STATE.templates,
    config: APP_CONFIG,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json",
  });
  saveAs(
    blob,
    `H2O_Singur_Backup_${new Date().toISOString().split("T")[0]}.json`,
  );

  // Save backup record
  APP_STATE.backups.push({
    id: "bak_" + Date.now(),
    date: new Date().toISOString(),
    type: "manual",
    size: (blob.size / 1024).toFixed(1) + " KB",
  });
  localStorage.setItem("h2o_backups", JSON.stringify(APP_STATE.backups));
  renderBackupHistory();
  showToast("success", "Backup Complete", "Full system backup downloaded.");
}
*/

/**
 * Restore data from backup file
 */
function restoreBackup(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version && data.clients) {
        if (confirm("This will overwrite ALL current data (in the MySQL database too). Are you sure?")) {
          await applyRestoredSnapshot(data);
        }
      } else {
        showToast(
          "error",
          "Invalid File",
          "This file is not a valid H2O Singur backup.",
        );
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Error", "Failed to parse backup file.");
    }
  };
  reader.readAsText(file);
  input.value = ""; // Reset file input
}

/**
 * Apply a backup snapshot to the app AND replace the MySQL data with it
 * (used by file restore and server backup restore).
 */
async function applyRestoredSnapshot(data) {
  // 1) Load snapshot into memory (support every synced entity)
  SYNC_ENTITIES.forEach((k) => {
    if (Array.isArray(data[k])) APP_STATE[k] = data[k];
  });
  // Legacy snapshot format only carries these four:
  APP_STATE.clients = data.clients || APP_STATE.clients || [];
  APP_STATE.enquiries = data.enquiries || [];
  APP_STATE.invoices = data.invoices || [];
  APP_STATE.templates = data.templates || [];
  if (data.config) Object.assign(APP_CONFIG, data.config);

  // 2) Replace the whole server dataset via the restore endpoint
  try {
    await apiCall("restore", {
      data: Object.fromEntries(SYNC_ENTITIES.map((k) => [k, APP_STATE[k] || []])),
      config: APP_CONFIG,
    });
    // 3) Re-baseline sync shadows so future edits diff correctly
    SYNC_ENTITIES.forEach((k) => {
      SYNC_STATE.lastSynced[k] = JSON.parse(JSON.stringify(APP_STATE[k] || []));
      SYNC_STATE.pending[k] = false;
    });
    mirrorToLocalStorage();
  } catch (e) {
    console.error("Server restore failed:", e);
    showToast("error", "Server Restore Failed", e.message);
  }

  refreshAllData();
  renderBackupHistory();
  showToast(
    "success",
    "Data Restored",
    "Backup restored to app and MySQL database.",
  );
}

/**
 * Setup Auto-Backup check
 */
function setupAutoBackup() {
  // Check every hour if auto-backup is needed
  setInterval(() => {
    if (APP_CONFIG.autoBackup) {
      checkDailyBackup();
    }
  }, 3600000); // 1 hour
}

function checkDailyBackup() {
  const lastBackup = localStorage.getItem("h2o_lastAutoBackup");
  const today = new Date().toISOString().split("T")[0];

  if (
    lastBackup !== today &&
    APP_CONFIG.autoBackup &&
    APP_STATE.clients.length > 0
  ) {
    triggerAutoBackup();
  }

  // Update status
  document.getElementById("autoBackupStatus").textContent = lastBackup
    ? `Last backup: ${formatDate(lastBackup)}`
    : "Last backup: Never";
}

function triggerAutoBackup() {
  const backupData = buildBackupSnapshot();

  // Save to localStorage auto-backup key
  try {
    localStorage.setItem("h2o_autoBackup", JSON.stringify(backupData));
    localStorage.setItem(
      "h2o_lastAutoBackup",
      new Date().toISOString().split("T")[0],
    );
  } catch (e) {
    console.error("Auto-backup mirror failed:", e);
  }

  // Store the snapshot ON THE SERVER so it survives any device
  const record = {
    id: "bak_" + Date.now(),
    date: new Date().toISOString(),
    type: "auto",
    size: "Internal",
  };
  saveBackupToServer(record, true);
}

/**
 * Render backup history — now shows SERVER backups (from MySQL) with
 * restore & delete actions.
 */
function renderBackupHistory() {
  const container = document.getElementById("backupHistoryList");
  if (!container) return;
  const backups = APP_STATE.backups || [];

  if (backups.length === 0) {
    container.innerHTML =
      '<div class="empty-state" style="padding:var(--space-6);"><p class="text-muted">No backups yet.</p></div>';
    return;
  }

  container.innerHTML = backups
    .slice()
    .reverse()
    .map(
      (b) => `
        <div class="backup-item">
            <div class="backup-item-info">
                <div class="backup-item-icon"><i class="fas ${b.type === "manual" ? "fa-cloud-arrow-down" : "fa-clock-rotate-left"}"></i></div>
                <div>
                    <div class="backup-item-name">${b.type === "manual" ? "Manual Backup" : "Auto-Backup"}${b.name && b.name !== "Manual Backup" && b.name !== "Auto-Backup" ? " — " + b.name : ""}</div>
                    <div class="backup-item-date">${formatDateTime(b.date)} | ${b.size || ""}${b.jsId ? " | " + b.jsId : ""}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-sm btn-ghost" onclick="restoreServerBackup(${b.id})" data-tooltip="Restore"><i class="fas fa-rotate-left"></i></button>
                <button class="btn btn-sm btn-ghost" onclick="downloadServerBackup(${b.id})" data-tooltip="Download"><i class="fas fa-download"></i></button>
                <button class="btn btn-sm btn-ghost" onclick="deleteServerBackup(${b.id})" data-tooltip="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `,
    )
    .join("");
}

/**
 * Restore a backup stored on the MySQL server
 */
async function restoreServerBackup(id) {
  if (!confirm("Restore this backup? All CURRENT data in the app AND the MySQL database will be replaced.")) return;
  try {
    showToast("info", "Restoring", "Fetching backup from server...", 3000);
    const res = await apiCall("get_backup", { id });
    const row = res.backup;
    if (!row || !row.dataJson) {
      showToast("error", "No Data", "This backup record has no stored snapshot.");
      return;
    }
    const data = JSON.parse(row.dataJson);
    await applyRestoredSnapshot(data);
  } catch (e) {
    console.error(e);
    showToast("error", "Restore Failed", e.message);
  }
}

/**
 * Download a server backup snapshot as a JSON file
 */
async function downloadServerBackup(id) {
  try {
    const res = await apiCall("get_backup", { id });
    const row = res.backup;
    if (!row || !row.dataJson) {
      showToast("error", "No Data", "This backup record has no stored snapshot.");
      return;
    }
    const blob = new Blob([row.dataJson], { type: "application/json" });
    saveAs(blob, `H2O_Singur_Backup_${(row.date || "").split("T")[0]}.json`);
  } catch (e) {
    showToast("error", "Download Failed", e.message);
  }
}

/**
 * Delete a backup from the MySQL server
 */
async function deleteServerBackup(id) {
  if (!confirm("Delete this server backup permanently?")) return;
  try {
    await apiCall("delete_backup", { id });
    APP_STATE.backups = (APP_STATE.backups || []).filter((b) => b.id !== id);
    renderBackupHistory();
    showToast("success", "Deleted", "Backup removed from server.");
  } catch (e) {
    showToast("error", "Delete Failed", e.message);
  }
}

// ============================================================
// SECTION 15: DASHBOARD RENDERING
// ============================================================

/**
 * Render Dashboard Stats & Charts
 */
function renderDashboard() {
  const clients = APP_STATE.clients;
  const today = new Date();

  // Stats
  document.getElementById("statTotalMembers").textContent = clients.length;

  const thisMonth = clients.filter(
    (c) =>
      new Date(c.joinDate).getMonth() === today.getMonth() &&
      new Date(c.joinDate).getFullYear() === today.getFullYear(),
  ).length;
  document.getElementById("statNewThisMonth").textContent = thisMonth;

  const expiring = clients.filter((c) => {
    const status = getClientStatus(c);
    return status.key === "expiring" || status.key === "expired";
  }).length;
  document.getElementById("statExpiringSoon").textContent = expiring;

  const birthdaysThisWeek = clients.filter((c) => {
    if (!c.dob) return false;
    const dob = new Date(c.dob);
    dob.setFullYear(today.getFullYear());
    const diff = Math.abs(Math.floor((dob - today) / (1000 * 60 * 60 * 24)));
    return diff <= 7;
  }).length;
  document.getElementById("statBirthdaysThisWeek").textContent =
    birthdaysThisWeek;

  // Recent Members List
  const recentList = document.getElementById("recentMembersList");
  const recent = clients.slice(-5).reverse();
  if (recent.length === 0) {
    recentList.innerHTML =
      '<div class="empty-state" style="padding:20px;"><p class="text-muted">No members yet.</p></div>';
  } else {
    recentList.innerHTML = recent
      .map(
        (c) => `
            <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                <div class="flex items-center gap-3">
                    <div class="client-avatar-placeholder-sm">${c.firstName.charAt(0)}${c.lastName.charAt(0)}</div>
                    <div>
                        <div class="text-sm font-semibold">${c.firstName} ${c.lastName}</div>
                        <div class="text-xs text-muted">${c.plan} Member</div>
                    </div>
                </div>
                <div class="text-xs text-muted">${formatDate(c.joinDate)}</div>
            </div>
        `,
      )
      .join("");
  }

  // Upcoming Events
  const eventsList = document.getElementById("upcomingEventsList");
  const events = [];
  clients.forEach((c) => {
    if (c.dob) {
      const dob = new Date(c.dob);
      dob.setFullYear(today.getFullYear());
      if (dob >= today)
        events.push({
          type: "Birthday",
          name: `${c.firstName} ${c.lastName}`,
          date: dob,
        });
    }
    if (c.renewalDate) {
      const renew = new Date(c.renewalDate);
      if (renew >= today)
        events.push({
          type: "Renewal",
          name: `${c.firstName} ${c.lastName}`,
          date: renew,
        });
    }
  });
  events.sort((a, b) => a.date - b.date);
  const upcoming = events.slice(0, 5);

  if (upcoming.length === 0) {
    eventsList.innerHTML =
      '<div class="empty-state" style="padding:20px;"><p class="text-muted">No upcoming events.</p></div>';
  } else {
    eventsList.innerHTML = upcoming
      .map(
        (e) => `
            <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                <div class="flex items-center gap-3">
                    <div class="badge badge-${e.type === "Birthday" ? "accent" : "info"}">${e.type}</div>
                    <div class="text-sm font-semibold">${e.name}</div>
                </div>
                <div class="text-xs text-muted">${formatDate(e.date)}</div>
            </div>
        `,
      )
      .join("");
  }

  // Charts
  renderCharts();
}

/**
 * Render Dashboard Charts using Chart.js
 */
function renderCharts() {
  // Destroy old charts
  if (APP_STATE.charts.membership) APP_STATE.charts.membership.destroy();
  if (APP_STATE.charts.plan) APP_STATE.charts.plan.destroy();

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const currentYear = new Date().getFullYear();

  // Membership trend data
  const monthlyData = new Array(12).fill(0);
  APP_STATE.clients.forEach((c) => {
    const joinDate = new Date(c.joinDate);
    if (joinDate.getFullYear() === currentYear) {
      monthlyData[joinDate.getMonth()]++;
    }
  });

  const ctxMembership = document
    .getElementById("membershipChart")
    .getContext("2d");
  APP_STATE.charts.membership = new Chart(ctxMembership, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "New Members",
          data: monthlyData,
          borderColor:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--color-primary")
              .trim() || "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
        x: { grid: { display: false } },
      },
    },
  });

  // Plan distribution data
  const planCounts = { Monthly: 0, Quarterly: 0, "Half-Yearly": 0, Annual: 0 };
  APP_STATE.clients.forEach((c) => {
    if (planCounts[c.plan] !== undefined) planCounts[c.plan]++;
  });

  const ctxPlan = document.getElementById("planChart").getContext("2d");
  APP_STATE.charts.plan = new Chart(ctxPlan, {
    type: "doughnut",
    data: {
      labels: Object.keys(planCounts),
      datasets: [
        {
          data: Object.values(planCounts),
          backgroundColor: ["#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: { position: "bottom", labels: { padding: 15 } },
      },
    },
  });
}

function switchChartPeriod(btn) {
  document
    .querySelectorAll(".chart-period")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderCharts(); // Simplification - would adjust data range in production
}

// ============================================================
// SECTION 16: THEME CUSTOMIZER
// ============================================================

/**
 * Toggle Theme Panel
 */
function toggleThemePanel() {
  document.getElementById("themePanel").classList.toggle("open");
  document.getElementById("notificationPanel").classList.remove("open");
}

/**
 * Set Theme Mode (Dark/Light)
 */
function setThemeMode(mode) {
  APP_CONFIG.darkMode = mode === "dark";
  document.documentElement.setAttribute("data-theme", mode);

  document.querySelectorAll(".theme-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  const darkToggle = document.getElementById("settingDarkMode");
  if (darkToggle) darkToggle.checked = APP_CONFIG.darkMode;

  saveConfig();
  renderCharts(); // Re-render charts with new theme colors
}

function toggleThemeMode(isDark) {
  setThemeMode(isDark ? "dark" : "light");
}

/**
 * Set Accent Color from presets
 */
function setAccentColor(accent, el) {
  APP_CONFIG.accent = accent;
  document.documentElement.setAttribute("data-accent", accent);

  // Update swatches
  document
    .querySelectorAll(".theme-color-swatch")
    .forEach((s) => s.classList.remove("active"));
  document
    .querySelectorAll(`.theme-color-swatch[data-accent="${accent}"]`)
    .forEach((s) => s.classList.add("active"));

  // Update custom picker
  const computedColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  document.getElementById("themeCustomColorPicker").value = computedColor;
  document.getElementById("themeCustomColorHex").value = computedColor;
  document.getElementById("customAccentPicker").value = computedColor;
  document.getElementById("customAccentHex").value = computedColor;

  saveConfig();
  renderCharts();
}

/**
 * Set Custom Accent Color via Color Wheel
 */
function setCustomAccentColor(color) {
  // Remove active from presets
  document
    .querySelectorAll(".theme-color-swatch")
    .forEach((s) => s.classList.remove("active"));

  document.documentElement.setAttribute("data-accent", ""); // Clear preset

  // Set custom CSS variables directly
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  document.documentElement.style.setProperty("--color-primary", color);
  document.documentElement.style.setProperty(
    "--color-primary-rgb",
    `${r}, ${g}, ${b}`,
  );
  document.documentElement.style.setProperty(
    "--color-primary-light",
    lightenColor(color, 20),
  );
  document.documentElement.style.setProperty(
    "--color-primary-dark",
    darkenColor(color, 20),
  );

  // Sync inputs
  document.getElementById("themeCustomColorPicker").value = color;
  document.getElementById("themeCustomColorHex").value = color;
  document.getElementById("customAccentPicker").value = color;
  document.getElementById("customAccentHex").value = color;

  APP_CONFIG.accent = "custom";
  APP_CONFIG.customAccentColor = color;
  saveConfig();
  renderCharts();
}

// Color Utility Functions
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

// ============================================================
// SECTION 17: SETTINGS MANAGEMENT
// ============================================================

/**
 * Save a specific setting
 */
function saveSetting(key, value) {
  APP_CONFIG[key] = value;
  saveConfig();
}

/**
 * Load Settings UI with current config
 */
function loadSettingsUI() {
  document.getElementById("settingGymName").value = APP_CONFIG.gymName;
  document.getElementById("settingGymPhone").value = APP_CONFIG.gymPhone;
  document.getElementById("settingGymAddress").value = APP_CONFIG.gymAddress;
  document.getElementById("settingGstNumber").value = APP_CONFIG.gstNumber;
  document.getElementById("settingCurrency").value = APP_CONFIG.currency;
  document.getElementById("settingAutoBackup").checked = APP_CONFIG.autoBackup;
  document.getElementById("settingDarkMode").checked = APP_CONFIG.darkMode;
}

/**
 * Switch Settings Tabs
 */
function switchSettingsTab(tabName, btn) {
  document
    .querySelectorAll(".settings-tab-content")
    .forEach((t) => (t.style.display = "none"));
  document
    .querySelectorAll(".settings-nav-item")
    .forEach((b) => b.classList.remove("active"));

  document.getElementById(`settingsTab-${tabName}`).style.display = "block";
  btn.classList.add("active");
}

/**
 * Populate Field Settings in Settings Page
 * Allows toggling fields between Required, Optional, Hidden
 */
function populateFieldSettings() {
  const container = document.getElementById("fieldSettingsContainer");
  if (!container) return;

  container.innerHTML = Object.entries(APP_CONFIG.fieldSettings)
    .map(
      ([key, config]) => `
        <div class="settings-row">
            <div>
                <div class="settings-row-label">${config.label}</div>
            </div>
            <select class="form-select" style="width:140px;height:34px;font-size:12px;" onchange="updateFieldSetting('${key}', this.value)">
                <option value="required" ${config.status === "required" ? "selected" : ""}>Required</option>
                <option value="optional" ${config.status === "optional" ? "selected" : ""}>Optional</option>
                <option value="hidden" ${config.status === "hidden" ? "selected" : ""}>Hidden</option>
            </select>
        </div>
    `,
    )
    .join("");
}

/**
 * Update a field's requirement status
 */
function updateFieldSetting(fieldKey, status) {
  APP_CONFIG.fieldSettings[fieldKey].status = status;
  saveConfig();
  showToast(
    "info",
    "Field Updated",
    `${APP_CONFIG.fieldSettings[fieldKey].label} set to ${status}.`,
  );
}

// ============================================================
// SECTION 18: PASSWORD VERIFICATION
// ============================================================

/**
 * Request Password Verification before sensitive action
 * @param {Function} callback - Function to execute if password is correct
 */
function requestPasswordVerify(callback) {
  APP_STATE.passwordVerifyCallback = callback;
  document.getElementById("verifyPasswordInput").value = "";
  document.getElementById("verifyError").style.display = "none";
  openModal("passwordVerifyModal");

  // Focus the input
  setTimeout(() => document.getElementById("verifyPasswordInput").focus(), 300);
}

/**
 * Confirm Password Verification
 */
function confirmPasswordVerify() {
  const inputPass = document.getElementById("verifyPasswordInput").value;

  // In a real system, this would check against the server.
  // Here we check against the currently logged-in admin password
  // or a hardcoded admin password for demo purposes.
  // Since we don't store passwords locally for security,
  // we verify against the session user or a default.

  // DEMO VERIFICATION: Accept "admin123" or the staff's own password
  // In production, this would make an API call to the Google Sheet again.
  if (inputPass === "admin123" || inputPass === "staff123") {
    closeModal("passwordVerifyModal");
    if (APP_STATE.passwordVerifyCallback) {
      APP_STATE.passwordVerifyCallback();
      APP_STATE.passwordVerifyCallback = null;
    }
  } else {
    document.getElementById("verifyError").style.display = "block";
  }
}

// ============================================================
// SECTION 19: GLOBAL SEARCH
// ============================================================

function handleGlobalSearch(query) {
  if (query.length > 2) {
    navigateTo("clients");
    document.getElementById("clientSearchInput").value = query;
    filterClients();
  }
}

// ============================================================
// SECTION 20: UTILITY FUNCTIONS
// ============================================================

/**
 * Format Date string to readable format
 */
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", options);
  } catch (e) {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", options);
  } catch (e) {
    return dateStr;
  }
}

/**
 * Refresh all dynamic data on the page
 */
function refreshAllData() {
  renderDashboard();
  renderClientTable();
  renderEnquiryTable();
  renderInvoicesList();
  renderMessageTemplates();
  checkNotifications();
  populateInvoiceClientDropdown();
  populateFieldSettings();
  loadSettingsUI();
  applyConfigToDOM();

  if (APP_CONFIG.customAccentColor && APP_CONFIG.accent === "custom") {
    setCustomAccentColor(APP_CONFIG.customAccentColor);
  }
}

// ============================================================
// END OF APPLICATION LOGIC
// ============================================================
// ============================================================
// SECTION 21: TRAINER MANAGEMENT
// ============================================================

/**
 * Setup trainer registration form
 */
function setupTrainerForm(editId = null) {
  const form = document.getElementById("trainerForm");
  if (!form) return;
  if (!editId) {
    form.reset();
    document.getElementById("trnEditId").value = "";
    document.getElementById("trainerRegTitle").textContent =
      "New Trainer Registration";
    document.getElementById("trnSubmitBtn").innerHTML =
      '<i class="fas fa-check"></i> Register Trainer';
    document.getElementById("trainerImagePlaceholder").style.display = "";
    document
      .getElementById("trainerImageUpload")
      .querySelector("img")
      ?.remove();
  } else {
    const t = APP_STATE.trainers.find((tr) => tr.id === editId);
    if (!t) return;
    document.getElementById("trainerRegTitle").textContent =
      `Edit: ${t.firstName} ${t.lastName}`;
    document.getElementById("trnEditId").value = t.id;
    document.getElementById("trnFirstName").value = t.firstName;
    document.getElementById("trnLastName").value = t.lastName;
    document.getElementById("trnMobile").value = t.mobile;
    document.getElementById("trnEmail").value = t.email || "";
    document.getElementById("trnDOB").value = t.dob || "";
    document.getElementById("trnSpecialization").value = t.specialization;
    document.getElementById("trnExperience").value = t.experience || "";
    document.getElementById("trnCertifications").value = t.certifications || "";
    document.getElementById("trnShiftStart").value = t.shiftStart || "06:00";
    document.getElementById("trnShiftEnd").value = t.shiftEnd || "12:00";
    document.getElementById("trnSalary").value = t.salary || "";
    document.getElementById("trnSubmitBtn").innerHTML =
      '<i class="fas fa-save"></i> Update Trainer';
    if (t.photo) {
      const uploadDiv = document.getElementById("trainerImageUpload");
      let img = uploadDiv.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        uploadDiv.appendChild(img);
      }
      img.src = t.photo;
      document.getElementById("trainerImagePlaceholder").style.display = "none";
    }
  }
}

/**
 * Handle trainer image upload
 */
function handleTrainerImageUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const uploadDiv = document.getElementById("trainerImageUpload");
      let img = uploadDiv.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        uploadDiv.appendChild(img);
      }
      img.src = e.target.result;
      document.getElementById("trainerImagePlaceholder").style.display = "none";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/**
 * Handle trainer registration form submission
 */
function handleTrainerRegistration(event) {
  event.preventDefault();
  const editId = document.getElementById("trnEditId").value;
  const uploadDiv = document.getElementById("trainerImageUpload");
  const img = uploadDiv.querySelector("img");
  const photoData = img ? img.src : "";

  const trainerData = {
    id: editId || "TRN" + Date.now(),
    firstName: document.getElementById("trnFirstName").value.trim(),
    lastName: document.getElementById("trnLastName").value.trim(),
    mobile: document.getElementById("trnMobile").value.trim(),
    email: document.getElementById("trnEmail").value.trim(),
    dob: document.getElementById("trnDOB").value,
    specialization: document.getElementById("trnSpecialization").value,
    experience: parseFloat(document.getElementById("trnExperience").value) || 0,
    certifications: document.getElementById("trnCertifications").value.trim(),
    shiftStart: document.getElementById("trnShiftStart").value,
    shiftEnd: document.getElementById("trnShiftEnd").value,
    salary: parseFloat(document.getElementById("trnSalary").value) || 0,
    photo: photoData,
    assignedClients: [],
    rating: 0,
    createdAt: editId ? undefined : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editId) {
    const idx = APP_STATE.trainers.findIndex((t) => t.id === editId);
    if (idx !== -1) {
      trainerData.createdAt = APP_STATE.trainers[idx].createdAt;
      trainerData.assignedClients =
        APP_STATE.trainers[idx].assignedClients || [];
      trainerData.rating = APP_STATE.trainers[idx].rating || 0;
      APP_STATE.trainers[idx] = trainerData;
    }
    showToast(
      "success",
      "Trainer Updated",
      `${trainerData.firstName} ${trainerData.lastName} updated.`,
    );
  } else {
    APP_STATE.trainers.push(trainerData);
    showToast(
      "success",
      "Trainer Registered",
      `${trainerData.firstName} ${trainerData.lastName} added!`,
    );
  }
  saveAppData("trainers");
  updateSidebarBadges();
  navigateTo("trainers");
}

/**
 * Render trainer table
 */
function renderTrainerTable() {
  const tbody = document.getElementById("trainerTableBody");
  if (!tbody) return;
  if (APP_STATE.trainers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;"><div class="empty-state"><div class="empty-state-icon"><i class="fas fa-user-tie"></i></div><h3 class="empty-state-title">No Trainers Yet</h3><p class="empty-state-desc">Register your first trainer to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = APP_STATE.trainers
    .map((t) => {
      const initials =
        (t.firstName.charAt(0) || "?") + (t.lastName.charAt(0) || "");
      const clientCount = (t.assignedClients || []).length;
      return `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            ${t.photo ? `<img src="${t.photo}" class="client-avatar-sm" alt="">` : `<div class="client-avatar-placeholder-sm">${initials}</div>`}
            <div>
              <div class="font-semibold text-sm">${t.firstName} ${t.lastName}</div>
              <div class="text-xs" style="color:var(--text-tertiary);">${t.email || "No email"}</div>
            </div>
          </div>
        </td>
        <td><div class="text-sm">${t.mobile}</div></td>
        <td><span class="badge badge-primary">${t.specialization}</span></td>
        <td>${t.experience || 0} yrs</td>
        <td><span class="badge badge-info">${clientCount} clients</span></td>
        <td>${renderStarRating(t.rating || 0)}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn" onclick="viewTrainerProfile('${t.id}')" data-tooltip="View"><i class="fas fa-eye"></i></button>
            <button class="table-action-btn edit" onclick="editTrainer('${t.id}')" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
            <button class="table-action-btn whatsapp" onclick="sendWhatsApp('${t.mobile}', 'Hi ${t.firstName}, message from H2O Singur Fitness Gym')" data-tooltip="WhatsApp"><i class="fa-brands fa-whatsapp"></i></button>
            <button class="table-action-btn delete" onclick="deleteTrainer('${t.id}')" data-tooltip="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderStarRating(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = "";
  for (let i = 0; i < 5; i++) {
    if (i < full)
      stars += '<i class="fas fa-star" style="color:var(--color-accent);"></i>';
    else if (i === full && half)
      stars +=
        '<i class="fas fa-star-half-alt" style="color:var(--color-accent);"></i>';
    else
      stars += '<i class="far fa-star" style="color:var(--text-muted);"></i>';
  }
  return `<div style="display:inline-flex;gap:2px;">${stars} <span class="text-xs text-muted">(${rating.toFixed(1)})</span></div>`;
}

function editTrainer(id) {
  navigateTo("trainerRegistration");
  setupTrainerForm(id);
}

function deleteTrainer(id) {
  if (!confirm("Delete this trainer? This cannot be undone.")) return;
  APP_STATE.trainers = APP_STATE.trainers.filter((t) => t.id !== id);
  saveAppData("trainers");
  renderTrainerTable();
  updateSidebarBadges();
  showToast("info", "Trainer Deleted", "Trainer record removed.");
}

function viewTrainerProfile(id) {
  const t = APP_STATE.trainers.find((tr) => tr.id === id);
  if (!t) return;
  const clients = (t.assignedClients || [])
    .map((cid) => APP_STATE.clients.find((c) => c.id === cid))
    .filter(Boolean);
  const initials =
    (t.firstName.charAt(0) || "?") + (t.lastName.charAt(0) || "");
  const content = document.getElementById("clientProfileContent");
  content.innerHTML = `
    <div class="profile-header">
      ${t.photo ? `<img src="${t.photo}" class="profile-avatar clickable" onclick="openTrainerImageZoom('${t.id}')" style="cursor:zoom-in;">` : `<div class="profile-avatar-placeholder">${initials}</div>`}
      <div class="profile-info">
        <h2 class="profile-name">${t.firstName} ${t.lastName}</h2>
        <div class="profile-meta">
          <span class="profile-meta-item"><i class="fas fa-phone"></i> ${t.mobile}</span>
          <span class="profile-meta-item"><i class="fas fa-envelope"></i> ${t.email || "N/A"}</span>
          <span class="badge badge-primary">${t.specialization}</span>
          ${renderStarRating(t.rating || 0)}
        </div>
      </div>
    </div>
    <div class="profile-details-grid">
      <div class="profile-detail-card">
        <h4><i class="fas fa-user-tie"></i> Trainer Info</h4>
        <div class="profile-detail-item"><span class="profile-detail-label">Experience</span><span class="profile-detail-value">${t.experience || 0} years</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">Certifications</span><span class="profile-detail-value">${t.certifications || "N/A"}</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">DOB</span><span class="profile-detail-value">${formatDate(t.dob)}</span></div>
      </div>
      <div class="profile-detail-card">
        <h4><i class="fas fa-clock"></i> Work Schedule</h4>
        <div class="profile-detail-item"><span class="profile-detail-label">Shift</span><span class="profile-detail-value">${t.shiftStart || "N/A"} - ${t.shiftEnd || "N/A"}</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">Salary</span><span class="profile-detail-value">${APP_CONFIG.currency}${t.salary || 0}</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">Clients</span><span class="profile-detail-value">${(t.assignedClients || []).length}</span></div>
      </div>
      <div class="profile-detail-card">
        <h4><i class="fas fa-users"></i> Assigned Clients</h4>
        ${clients.length ? clients.map((c) => `<div class="profile-detail-item"><span class="profile-detail-label">${c.firstName} ${c.lastName}</span><span class="profile-detail-value">${c.plan}</span></div>`).join("") : '<p class="text-muted text-sm">No clients assigned</p>'}
      </div>
    </div>
  `;
  document.getElementById("profileEditBtn").onclick = () => {
    closeModal("clientProfileModal");
    editTrainer(id);
  };
  openModal("clientProfileModal");
}

function openTrainerImageZoom(id) {
  const t = APP_STATE.trainers.find((tr) => tr.id === id);
  if (!t || !t.photo) return;
  document.getElementById("imageZoomContent").src = t.photo;
  openModal("imageZoomModal");
}

function exportAllTrainers(format) {
  if (APP_STATE.trainers.length === 0) {
    showToast("warning", "No Data", "There are no trainers to export.");
    return;
  }
  if (format === "excel") {
    const cleanData = APP_STATE.trainers.map((t) => {
      const obj = { ...t };
      delete obj.photo;
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trainers");
    XLSX.writeFile(
      wb,
      `H2O_Singur_Trainers_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    showToast("success", "Exported", "Trainers exported to Excel.");
  }
}

// ============================================================
// SECTION 22: ATTENDANCE TRACKER
// ============================================================

/**
 * Render attendance table for today
 */
function renderAttendanceTable() {
  const tbody = document.getElementById("attendanceTableBody");
  if (!tbody) return;
  let dateFilter = document.getElementById("attendanceDateFilter")?.value;
  if (!dateFilter) {
    dateFilter = new Date().toISOString().split("T")[0];
    document.getElementById("attendanceDateFilter").value = dateFilter;
  }
  const planFilter =
    document.getElementById("attendancePlanFilter")?.value || "";
  const statusFilter =
    document.getElementById("attendanceStatusFilter")?.value || "";

  let clients = [...APP_STATE.clients];
  if (planFilter) clients = clients.filter((c) => c.plan === planFilter);

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;"><div class="empty-state"><div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div><p class="text-muted">No clients for selected filters.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML =
    clients
      .map((c) => {
        const rec = APP_STATE.attendance.find(
          (a) => a.clientId === c.id && a.date === dateFilter,
        );
        let status = "unmarked";
        let checkIn = "-";
        let checkOut = "-";
        let duration = "-";
        if (rec) {
          status = rec.status;
          checkIn = rec.checkIn || "-";
          checkOut = rec.checkOut || "-";
          if (rec.checkIn && rec.checkOut) {
            const [h1, m1] = rec.checkIn.split(":").map(Number);
            const [h2, m2] = rec.checkOut.split(":").map(Number);
            const mins = h2 * 60 + m2 - (h1 * 60 + m1);
            if (mins > 0) duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
          }
        }
        if (statusFilter && status !== statusFilter) return "";
        const statusBadge =
          status === "present"
            ? '<span class="badge badge-success"><span class="status-dot active"></span> Present</span>'
            : status === "absent"
              ? '<span class="badge badge-danger"><span class="status-dot expired"></span> Absent</span>'
              : '<span class="badge badge-neutral">Not Marked</span>';
        const initials = c.firstName.charAt(0) + c.lastName.charAt(0);
        return `
      <tr>
        <td><input type="checkbox" class="att-checkbox" data-id="${c.id}"></td>
        <td><div class="flex items-center gap-3">${c.photo ? `<img src="${c.photo}" class="client-avatar-sm" alt="">` : `<div class="client-avatar-placeholder-sm">${initials}</div>`}<div class="font-semibold text-sm">${c.firstName} ${c.lastName}</div></div></td>
        <td><span class="badge badge-primary">${c.plan}</span></td>
        <td>${statusBadge}</td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td>${duration}</td>
        <td>
          <div class="table-actions">
            <button class="table-action-btn edit" onclick="markAttendance('${c.id}', 'present')" data-tooltip="Present"><i class="fas fa-check"></i></button>
            <button class="table-action-btn delete" onclick="markAttendance('${c.id}', 'absent')" data-tooltip="Absent"><i class="fas fa-times"></i></button>
            <button class="table-action-btn" onclick="openAttendanceTracker('${c.id}')" data-tooltip="History"><i class="fas fa-history"></i></button>
          </div>
        </td>
      </tr>
    `;
      })
      .join("") ||
    `<tr><td colspan="8" style="text-align:center;padding:40px;"><p class="text-muted">No records match filters.</p></td></tr>`;
}

function toggleSelectAllAttendance(checkbox) {
  document.querySelectorAll(".att-checkbox").forEach((cb) => {
    cb.checked = checkbox.checked;
  });
}

/**
 * Mark attendance for a client on selected date
 */
function markAttendance(clientId, status) {
  const date =
    document.getElementById("attendanceDateFilter").value ||
    new Date().toISOString().split("T")[0];
  const now = new Date();
  const existingIdx = APP_STATE.attendance.findIndex(
    (a) => a.clientId === clientId && a.date === date,
  );
  const rec = {
    clientId,
    date,
    status,
    checkIn:
      status === "present"
        ? existingIdx !== -1
          ? APP_STATE.attendance[existingIdx].checkIn
          : now.toTimeString().split(" ")[0].slice(0, 5)
        : null,
    checkOut:
      existingIdx !== -1 ? APP_STATE.attendance[existingIdx].checkOut : null,
    timestamp: now.toISOString(),
  };
  if (existingIdx !== -1) APP_STATE.attendance[existingIdx] = rec;
  else APP_STATE.attendance.push(rec);
  saveAppData("attendance");
  // Award loyalty points for check-in
  if (status === "present")
    addLoyaltyPoints(
      clientId,
      APP_CONFIG.loyaltyConfig.pointsPerVisit,
      "visit",
      `Check-in on ${date}`,
    );
  renderAttendanceTable();
  showToast("success", "Attendance Marked", `Marked ${status} for ${date}`);
}

function markAllPresentToday() {
  if (!confirm("Mark ALL clients as present today?")) return;
  const date = new Date().toISOString().split("T")[0];
  const now = new Date().toTimeString().split(" ")[0].slice(0, 5);
  APP_STATE.clients.forEach((c) => {
    const idx = APP_STATE.attendance.findIndex(
      (a) => a.clientId === c.id && a.date === date,
    );
    const rec = {
      clientId: c.id,
      date,
      status: "present",
      checkIn: now,
      checkOut: null,
      timestamp: new Date().toISOString(),
    };
    if (idx !== -1) APP_STATE.attendance[idx] = rec;
    else APP_STATE.attendance.push(rec);
    addLoyaltyPoints(
      c.id,
      APP_CONFIG.loyaltyConfig.pointsPerVisit,
      "visit",
      `Bulk check-in on ${date}`,
    );
  });
  saveAppData("attendance");
  renderAttendanceTable();
  showToast("success", "Done", "All members marked present.");
}

function exportAttendanceReport() {
  if (APP_STATE.attendance.length === 0) {
    showToast("warning", "No Data", "No attendance records to export.");
    return;
  }
  const rows = APP_STATE.attendance.map((a) => {
    const c = APP_STATE.clients.find((cl) => cl.id === a.clientId);
    return {
      Date: a.date,
      Name: c ? `${c.firstName} ${c.lastName}` : "Unknown",
      Plan: c ? c.plan : "",
      Status: a.status,
      CheckIn: a.checkIn || "",
      CheckOut: a.checkOut || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(
    wb,
    `H2O_Singur_Attendance_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
  showToast("success", "Exported", "Attendance report downloaded.");
}

/**
 * Render weekly attendance chart
 */
function renderAttendanceChart() {
  const canvas = document.getElementById("attendanceChart");
  if (!canvas) return;
  if (APP_STATE.charts.attendanceWeekly)
    APP_STATE.charts.attendanceWeekly.destroy();
  const days = [];
  const present = [];
  const absent = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    days.push(d.toLocaleDateString("en-IN", { weekday: "short" }));
    present.push(
      APP_STATE.attendance.filter(
        (a) => a.date === ds && a.status === "present",
      ).length,
    );
    absent.push(
      APP_STATE.attendance.filter((a) => a.date === ds && a.status === "absent")
        .length,
    );
  }
  APP_STATE.charts.attendanceWeekly = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: days,
      datasets: [
        {
          label: "Present",
          data: present,
          backgroundColor: "#10b981",
          borderWidth: 0,
        },
        {
          label: "Absent",
          data: absent,
          backgroundColor: "#ef4444",
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

/**
 * Render peak hours heatmap
 */
function renderPeakHoursHeatmap() {
  const container = document.getElementById("peakHoursHeatmap");
  if (!container) return;
  const hours = [
    "6-8",
    "8-10",
    "10-12",
    "12-14",
    "14-16",
    "16-18",
    "18-20",
    "20-22",
  ];
  const counts = new Array(8).fill(0);
  APP_STATE.attendance.forEach((a) => {
    if (a.checkIn) {
      const h = parseInt(a.checkIn.split(":")[0]);
      const idx = Math.floor((h - 6) / 2);
      if (idx >= 0 && idx < 8) counts[idx]++;
    }
  });
  const max = Math.max(...counts, 1);
  container.innerHTML = `<div class="heatmap-grid">${hours
    .map((h, i) => {
      const intensity = counts[i] / max;
      const bg = `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`;
      return `<div class="heatmap-cell" style="background:${bg};"><div class="heatmap-label">${h}</div><div class="heatmap-count">${counts[i]}</div></div>`;
    })
    .join("")}</div>`;
}

/**
 * Open attendance tracker for individual client
 */
function openAttendanceTracker(clientId) {
  APP_STATE.currentAttendanceClientId = clientId;
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  document.getElementById("attendanceTrackerTitle").textContent =
    `Attendance: ${client.firstName} ${client.lastName}`;
  APP_STATE.currentAttendancePeriod = "week";
  APP_STATE.currentAttendanceView = "graph";
  document
    .querySelectorAll(".att-period-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.period === "week"));
  document
    .querySelectorAll(".att-view-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === "graph"));
  renderAttendanceTrackerContent();
  openModal("attendanceTrackerModal");
}

function switchAttendancePeriod(period, btn) {
  APP_STATE.currentAttendancePeriod = period;
  document
    .querySelectorAll(".att-period-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderAttendanceTrackerContent();
}

function switchAttendanceView(view, btn) {
  APP_STATE.currentAttendanceView = view;
  document
    .querySelectorAll(".att-view-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderAttendanceTrackerContent();
}

function renderAttendanceTrackerContent() {
  const clientId = APP_STATE.currentAttendanceClientId;
  if (!clientId) return;
  const period = APP_STATE.currentAttendancePeriod;
  const view = APP_STATE.currentAttendanceView;
  const today = new Date();
  let startDate = new Date(today);
  if (period === "week") startDate.setDate(today.getDate() - 7);
  else if (period === "month") startDate.setMonth(today.getMonth() - 1);
  else if (period === "year") startDate.setFullYear(today.getFullYear() - 1);

  const records = APP_STATE.attendance.filter(
    (a) =>
      a.clientId === clientId &&
      new Date(a.date) >= startDate &&
      new Date(a.date) <= today,
  );
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const total = records.length || 1;
  const rate = ((present / total) * 100).toFixed(0);
  // Calculate current streak
  let streak = 0;
  const sortedRecs = records.sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  for (const r of sortedRecs) {
    if (r.status === "present") streak++;
    else break;
  }

  document.getElementById("attStatPresent").textContent = present;
  document.getElementById("attStatAbsent").textContent = absent;
  document.getElementById("attStatRate").textContent = rate + "%";
  document.getElementById("attStatStreak").textContent = streak;

  const content = document.getElementById("attendanceTrackerContent");
  if (view === "graph") {
    content.innerHTML = `<div class="chart-container"><canvas id="individualAttendanceChart"></canvas></div>`;
    setTimeout(() => renderIndividualAttendanceChart(clientId, records), 100);
  } else {
    content.innerHTML = `<div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>Status</th><th>Check-In</th><th>Check-Out</th></tr></thead><tbody>${records.map((r) => `<tr><td>${formatDate(r.date)}</td><td><span class="badge badge-${r.status === "present" ? "success" : "danger"}">${r.status}</span></td><td>${r.checkIn || "-"}</td><td>${r.checkOut || "-"}</td></tr>`).join("") || '<tr><td colspan="4" style="text-align:center;padding:20px;">No records</td></tr>'}</tbody></table></div>`;
  }
}

function renderIndividualAttendanceChart(clientId, records) {
  const canvas = document.getElementById("individualAttendanceChart");
  if (!canvas) return;
  if (APP_STATE.charts.individualAtt) APP_STATE.charts.individualAtt.destroy();
  const grouped = {};
  records.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = 0;
    if (r.status === "present") grouped[r.date] = 1;
  });
  const labels = Object.keys(grouped).sort();
  const data = labels.map((d) => grouped[d]);
  APP_STATE.charts.individualAtt = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels.map((d) =>
        new Date(d).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      ),
      datasets: [
        {
          label: "Present",
          data,
          backgroundColor: data.map((v) => (v ? "#10b981" : "#ef4444")),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          ticks: { stepSize: 1, callback: (v) => (v === 1 ? "P" : "A") },
        },
      },
    },
  });
}

function exportIndividualAttendance() {
  const clientId = APP_STATE.currentAttendanceClientId;
  if (!clientId) return;
  const records = APP_STATE.attendance.filter((a) => a.clientId === clientId);
  if (records.length === 0) {
    showToast("warning", "No Data", "No attendance records.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  const rows = records.map((r) => ({
    Date: r.date,
    Status: r.status,
    CheckIn: r.checkIn || "",
    CheckOut: r.checkOut || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${client.firstName}_Attendance`);
  XLSX.writeFile(wb, `Attendance_${client.firstName}_${client.lastName}.xlsx`);
}

/**
 * Generate daily QR code for attendance
 */
function generateDailyQRCode() {
  const date = new Date().toISOString().split("T")[0];
  const data = `H2O_SINGUR_ATTENDANCE_${date}`;
  const container = document.getElementById("dailyQRCode");
  if (!container) return;
  // Simple QR via Google Charts API as fallback (or use a canvas-based generator)
  container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}" alt="QR Code" style="width:200px;height:200px;">`;
  document.getElementById("qrDateLabel").textContent =
    `Date: ${formatDate(date)}`;
  openModal("qrCodeModal");
}

// ============================================================
// SECTION 23: ID CARD GENERATION
// ============================================================

function populateIDCardClientDropdown() {
  const select = document.getElementById("idcardClientSelect");
  if (!select) return;
  select.innerHTML = '<option value="">Select Member...</option>';
  APP_STATE.clients.forEach((c) => {
    select.innerHTML += `<option value="${c.id}">${c.firstName} ${c.lastName} - ${c.plan}</option>`;
  });
}

function renderIDCardPreview() {
  const clientId = document.getElementById("idcardClientSelect")?.value;
  const template =
    document.getElementById("idcardTemplateSelect")?.value || "classic";
  const color = document.getElementById("idcardColor")?.value || "#10b981";
  const container = document.getElementById("idcardPreviewContainer");
  if (!container) return;
  if (!clientId) {
    container.innerHTML =
      '<p class="text-muted">Select a member to preview ID card</p>';
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  const status = getClientStatus(client);
  const expiryDate = client.renewalDate;
  container.innerHTML = generateIDCardHTML(
    client,
    template,
    color,
    status,
    expiryDate,
  );
  hydrateIDCardQRs(container);
}

/**
 * Render QR codes locally (no external image service needed).
 * Every card element carrying [data-qr] gets a live QR code drawn
 * into it. Falls back to the external QR image API when the local
 * QRCode library is not available.
 */
function hydrateIDCardQRs(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".idcard-qr-img[data-qr]").forEach((el) => {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const size = parseInt(el.dataset.size || "80", 10);
    if (typeof QRCode !== "undefined") {
      try {
        new QRCode(el, {
          text: el.dataset.qr,
          width: size,
          height: size,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M,
        });
        return;
      } catch (e) {
        console.warn("Local QR failed, falling back to API image", e);
      }
    }
    // Fallback: external QR service
    el.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      el.dataset.qr,
    )}" style="width:${size}px;height:${size}px;" alt="QR">`;
  });
}

function generateIDCardHTML(client, template, color, status, expiryDate) {
  const initials =
    (client.firstName.charAt(0) || "?") + (client.lastName.charAt(0) || "");
  const photoHTML = client.photo
    ? `<img src="${client.photo}" class="idcard-photo" alt="">`
    : `<div class="idcard-photo-placeholder">${initials}</div>`;
  const gymName = APP_CONFIG.gymName;
  const id = client.id;
  const qrData = `H2O_SINGUR_ID_${id}`;
  // QR is rendered locally by hydrateIDCardQRs() into [data-qr] elements
  const qr = (size) =>
    `<div class="idcard-qr-img" data-qr="${qrData}" data-size="${size}" style="width:${size}px;height:${size}px;"></div>`;

  if (template === "classic") {
    return `<div class="idcard idcard-classic" style="--card-color:${color};">
      <div class="idcard-header" style="background:${color};">
        <div class="idcard-brand"><i class="fas fa-dumbbell"></i> ${gymName}</div>
        <div class="idcard-type">MEMBER ID CARD</div>
      </div>
      <div class="idcard-body">
        <div class="idcard-photo-wrap">${photoHTML}</div>
        <div class="idcard-info">
          <div class="idcard-name">${client.firstName} ${client.lastName}</div>
          <div class="idcard-id">ID: ${id}</div>
          <div class="idcard-detail"><i class="fas fa-phone"></i> ${client.mobile}</div>
          <div class="idcard-detail"><i class="fas fa-id-card"></i> ${client.plan} Member</div>
          <div class="idcard-detail"><i class="fas fa-calendar"></i> Joined: ${formatDate(client.joinDate)}</div>
          <div class="idcard-detail"><i class="fas fa-clock"></i> Valid Till: ${formatDate(expiryDate)}</div>
        </div>
        <div class="idcard-qr">${qr(70)}<div class="idcard-qr-label">Scan to verify</div></div>
      </div>
      <div class="idcard-footer" style="background:${color};">
        <span>${APP_CONFIG.gymPhone}</span><span>${APP_CONFIG.gymAddress}</span>
      </div>
    </div>`;
  } else if (template === "modern") {
    return `<div class="idcard idcard-modern" style="--card-color:${color};">
      <div class="idcard-modern-left" style="background:linear-gradient(135deg,${color},${color}aa);">
        ${photoHTML}
        <div class="idcard-modern-name">${client.firstName}<br>${client.lastName}</div>
        <div class="idcard-modern-plan">${client.plan} Member</div>
      </div>
      <div class="idcard-modern-right">
        <div class="idcard-modern-brand"><i class="fas fa-dumbbell"></i> ${gymName}</div>
        <div class="idcard-modern-row"><span>ID</span><strong>${id}</strong></div>
        <div class="idcard-modern-row"><span>Mobile</span><strong>${client.mobile}</strong></div>
        <div class="idcard-modern-row"><span>Joined</span><strong>${formatDate(client.joinDate)}</strong></div>
        <div class="idcard-modern-row"><span>Valid Till</span><strong>${formatDate(expiryDate)}</strong></div>
        <div class="idcard-modern-row"><span>Goal</span><strong>${client.goal}</strong></div>
        <div style="margin-top:8px;">${qr(50)}</div>
      </div>
    </div>`;
  } else if (template === "minimal") {
    return `<div class="idcard idcard-minimal" style="--card-color:${color};">
      <div class="idcard-minimal-top">
        ${photoHTML}
        <div><div class="idcard-name" style="font-size:18px;">${client.firstName} ${client.lastName}</div>
        <div class="text-xs text-muted">ID: ${id} | ${client.plan} Member</div></div>
      </div>
      <div class="idcard-minimal-grid">
        <div><strong>Mobile:</strong> ${client.mobile}</div>
        <div><strong>Goal:</strong> ${client.goal}</div>
        <div><strong>Joined:</strong> ${formatDate(client.joinDate)}</div>
        <div><strong>Valid Till:</strong> ${formatDate(expiryDate)}</div>
      </div>
      <div class="idcard-minimal-footer" style="border-top:2px solid ${color};">
        <span>${gymName}</span>${qr(40)}
      </div>
    </div>`;
  } else {
    // VIP
    return `<div class="idcard idcard-vip" style="--card-color:${color};">
      <div class="idcard-vip-shine"></div>
      <div class="idcard-vip-header" style="background:linear-gradient(135deg,${color},${color}99);">
        <i class="fas fa-dumbbell"></i>
        <div><div style="font-size:18px;font-weight:800;">${gymName}</div><div style="font-size:10px;opacity:0.9;">PREMIUM MEMBER CARD</div></div>
        <div class="idcard-vip-badge"><i class="fas fa-crown"></i> VIP</div>
      </div>
      <div class="idcard-vip-body">
        <div class="idcard-photo-wrap">${photoHTML}</div>
        <div class="idcard-vip-info">
          <div class="idcard-name" style="font-size:22px;">${client.firstName} ${client.lastName}</div>
          <div class="idcard-id">ID: ${id}</div>
          <div class="idcard-detail"><i class="fas fa-phone"></i> ${client.mobile} | <i class="fas fa-id-card"></i> ${client.plan}</div>
          <div class="idcard-detail"><i class="fas fa-bullseye"></i> ${client.goal}</div>
          <div class="idcard-detail"><i class="fas fa-clock"></i> Valid Till: ${formatDate(expiryDate)}</div>
        </div>
        ${qr(60)}
      </div>
    </div>`;
  }
}

function generateSingleIDCard(clientId) {
  populateIDCardClientDropdown();
  document.getElementById("idcardClientSelect").value = clientId;
  renderIDCardPreview();
  navigateTo("idcards");
  showToast("info", "ID Card", "Member loaded. Choose template and download.");
}

/**
 * Capture the currently rendered ID card as a high-resolution canvas.
 * This is the SINGLE SOURCE for PDF, print and batch output — which is
 * why preview, print and PDF always look identical now.
 *
 * (The old implementation used jsPDF doc.html() which silently failed
 *  because html2canvas was never loaded — kept commented below.)
 */
async function captureIDCardCanvas(cardEl) {
  if (typeof html2canvas === "undefined") {
    throw new Error(
      "html2canvas library not loaded — check your internet connection or the script tag in index.html.",
    );
  }
  // Wait a moment so freshly rendered QR codes/photos are fully painted
  await new Promise((r) => setTimeout(r, 120));
  // Neutralize any responsive transform (mobile preview scale) so the
  // capture is always at the card's natural size
  const prevTransform = cardEl.style.transform;
  cardEl.style.transform = "none";
  try {
    return await html2canvas(cardEl, {
      scale: 3, // ≈ 300 DPI on a CR80 card
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
    });
  } finally {
    cardEl.style.transform = prevTransform;
  }
}

async function downloadIDCardPDF() {
  const clientId = document.getElementById("idcardClientSelect").value;
  if (!clientId) {
    showToast("warning", "Select Member", "Please choose a member first.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) {
    showToast("error", "Not Found", "Member not found.");
    return;
  }
  // Re-render the preview so the card matches the current selections
  renderIDCardPreview();
  const cardEl = document.querySelector("#idcardPreviewContainer .idcard");
  if (!cardEl) {
    showToast("warning", "No Card", "Generate a card preview first.");
    return;
  }
  try {
    showToast("info", "Working", "Rendering ID card PDF...", 2000);
    const canvas = await captureIDCardCanvas(cardEl);
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    // CR80 card size: 85.6mm x 54mm (landscape)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 54],
    });
    doc.addImage(imgData, "PNG", 0, 0, 85.6, 54);
    doc.save(`IDCard_${client.firstName}_${client.lastName}.pdf`);
    showToast("success", "Downloaded", "ID Card PDF saved.");
  } catch (e) {
    console.error("ID card PDF failed:", e);
    showToast("error", "PDF Failed", e.message || "Could not render the ID card.");
  }
}

/**
 * Print the ID card using the EXACT same captured image as the PDF —
 * preview, print and PDF output are guaranteed to look identical.
 */
async function printIDCard() {
  const preview = document.getElementById("idcardPreviewContainer");
  if (!preview || !preview.querySelector(".idcard")) {
    showToast("warning", "Empty", "Generate a card first.");
    return;
  }
  try {
    const cardEl = preview.querySelector(".idcard");
    const canvas = await captureIDCardCanvas(cardEl);
    const imgData = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    win.document.write(
      `<html><head><title>ID Card Print</title><style>
        @page { size: 85.6mm 54mm; margin: 0; }
        html,body { margin:0; padding:0; background:#fff; }
        body { display:flex; align-items:center; justify-content:center; min-height:100vh; }
        img { width:85.6mm; height:54mm; display:block; }
      </style></head><body><img src="${imgData}" alt="ID Card"></body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 400);
  } catch (e) {
    console.error("ID card print failed:", e);
    showToast("error", "Print Failed", e.message || "Could not print the ID card.");
  }
}

/* OLD ID CARD PDF IMPLEMENTATION (broken — html2canvas was never
   loaded so doc.html() failed; print also skipped all card styles).
   Kept commented for reference.

function downloadIDCardPDF() {
  const clientId = document.getElementById("idcardClientSelect").value;
  if (!clientId) {
    showToast("warning", "Select Member", "Please choose a member first.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  const template = document.getElementById("idcardTemplateSelect").value;
  const color = document.getElementById("idcardColor").value;
  const status = getClientStatus(client);
  const html = generateIDCardHTML(
    client,
    template,
    color,
    status,
    client.renewalDate,
  );

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape", "mm", "cr80");
  doc.html(`<div style="width:200px;">${html}</div>`, {
    callback: (doc) => {
      doc.save(`IDCard_${client.firstName}_${client.lastName}.pdf`);
      showToast("success", "Downloaded", "ID Card PDF saved.");
    },
    x: 5,
    y: 5,
    html2canvas: { scale: 0.3 },
    width: 80,
  });
}

function printIDCard() {
  const preview = document.getElementById("idcardPreviewContainer");
  if (!preview || !preview.innerHTML.trim()) {
    showToast("warning", "Empty", "Generate a card first.");
    return;
  }
  const win = window.open("", "_blank");
  win.document.write(
    `<html><head><title>ID Card Print</title></head><body style="display:flex;justify-content:center;padding:20px;">${preview.innerHTML}</body></html>`,
  );
  win.document.close();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}
*/

/**
 * Batch ID cards — one high-res image per member, rendered with the
 * same capture pipeline (identical look), output to a printable
 * window AND a multi-page PDF download.
 */
async function batchGenerateIDCards() {
  if (APP_STATE.clients.length === 0) {
    showToast("warning", "No Members", "No clients to generate cards.");
    return;
  }
  if (typeof html2canvas === "undefined") {
    showToast("error", "Library Missing", "html2canvas not loaded — check internet connection.");
    return;
  }
  try {
    showToast("info", "Batch Started", `Rendering ${APP_STATE.clients.length} ID cards...`, 3000);
    const images = [];
    // Offscreen container for rendering each card
    const holder = document.createElement("div");
    holder.style.cssText =
      "position:fixed;left:-10000px;top:0;width:400px;background:#fff;";
    document.body.appendChild(holder);

    for (const c of APP_STATE.clients) {
      holder.innerHTML = generateIDCardHTML(
        c,
        "classic",
        "#10b981",
        getClientStatus(c),
        c.renewalDate,
      );
      hydrateIDCardQRs(holder);
      const cardEl = holder.querySelector(".idcard");
      const canvas = await captureIDCardCanvas(cardEl);
      images.push({
        name: c.firstName + " " + c.lastName,
        data: canvas.toDataURL("image/png"),
      });
    }
    document.body.removeChild(holder);

    // 1) Printable window (same images => same look as PDF)
    const win = window.open("", "_blank");
    win.document.write(
      `<html><head><title>ID Cards - All Members</title><style>
        body{font-family:sans-serif;padding:10px;background:#f1f5f9;}
        h2{text-align:center;}
        .card-wrap{margin:6mm auto;page-break-inside:avoid;width:85.6mm;}
        img{width:85.6mm;height:54mm;display:block;}
      </style></head><body><h2>${APP_CONFIG.gymName} - All Member ID Cards</h2>` +
        images
          .map(
            (im) => `<div class="card-wrap"><img src="${im.data}" alt="${im.name}"></div>`,
          )
          .join("") +
        `</body></html>`,
    );
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 800);

    // 2) Multi-page PDF (one card per page)
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 54],
    });
    images.forEach((im, i) => {
      if (i > 0) doc.addPage([85.6, 54], "landscape");
      doc.addImage(im.data, "PNG", 0, 0, 85.6, 54);
    });
    doc.save("IDCards_All_Members.pdf");
    showToast("success", "Done", `${images.length} ID cards rendered (print + PDF).`);
  } catch (e) {
    console.error("Batch ID cards failed:", e);
    showToast("error", "Batch Failed", e.message || "Could not render all cards.");
  }
}

// ============================================================
// SECTION 24: DIET PLANS
// ============================================================

function openAddDietPlanModal(editId) {
  if (editId) {
    const p = APP_STATE.dietPlans.find((pl) => pl.id === editId);
    if (p) {
      document.getElementById("dietPlanEditId").value = p.id;
      document.getElementById("dietPlanName").value = p.name;
      document.getElementById("dietPlanGoal").value = p.goal;
      document.getElementById("dietPlanCalories").value = p.calories || "";
      document.getElementById("dietPlanDesc").value = p.description || "";
      document.getElementById("dietPlanMeals").value = p.meals || "";
      document.getElementById("dietPlanClient").value = p.assignedTo || "";
    }
  } else {
    document.getElementById("dietPlanEditId").value = "";
    [
      "dietPlanName",
      "dietPlanCalories",
      "dietPlanDesc",
      "dietPlanMeals",
    ].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("dietPlanClient").value = "";
  }
  openModal("addDietPlanModal");
}

function saveDietPlan() {
  const editId = document.getElementById("dietPlanEditId").value;
  const plan = {
    id: editId || "Diet_" + Date.now(),
    name: document.getElementById("dietPlanName").value.trim(),
    goal: document.getElementById("dietPlanGoal").value,
    calories:
      parseFloat(document.getElementById("dietPlanCalories").value) || 0,
    description: document.getElementById("dietPlanDesc").value.trim(),
    meals: document.getElementById("dietPlanMeals").value,
    assignedTo: document.getElementById("dietPlanClient").value || null,
    createdAt: editId ? undefined : new Date().toISOString(),
  };
  if (!plan.name) {
    showToast("warning", "Missing", "Plan name is required.");
    return;
  }
  if (editId) {
    const idx = APP_STATE.dietPlans.findIndex((p) => p.id === editId);
    if (idx !== -1) APP_STATE.dietPlans[idx] = plan;
    showToast("success", "Updated", `Diet plan "${plan.name}" updated.`);
  } else {
    APP_STATE.dietPlans.push(plan);
    showToast("success", "Saved", `Diet plan "${plan.name}" created.`);
  }
  saveAppData("dietPlans");
  closeModal("addDietPlanModal");
  renderDietPlans();
}

function renderDietPlans() {
  const grid = document.getElementById("dietPlanGrid");
  if (!grid) return;
  if (APP_STATE.dietPlans.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-utensils"></i></div><h3>No Diet Plans</h3><p class="text-muted">Create your first diet plan.</p></div>`;
    return;
  }
  grid.innerHTML = APP_STATE.dietPlans
    .map((p) => {
      const client = p.assignedTo
        ? APP_STATE.clients.find((c) => c.id === p.assignedTo)
        : null;
      return `
      <div class="card template-card">
        <div class="template-card-header">
          <span class="badge badge-primary"><i class="fas fa-utensils"></i> ${p.goal}</span>
          ${client ? `<span class="badge badge-info">Assigned: ${client.firstName} ${client.lastName}</span>` : ""}
        </div>
        <h4>${p.name}</h4>
        <p class="text-sm text-muted">${p.description || ""}</p>
        <div class="template-card-body">
          <strong>Daily Calories:</strong> ${p.calories || "N/A"}<br>
          <strong>Meals:</strong> ${(p.meals || "").split("\n").filter(Boolean).length || 0} entries
        </div>
        <div class="template-card-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewDietPlan('${p.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="openAddDietPlanModal('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-ghost quick-send-btn whatsapp" onclick="sendDietPlanWhatsApp('${p.id}')"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="btn btn-sm btn-ghost delete" onclick="deleteDietPlan('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    })
    .join("");
}

function viewDietPlan(id) {
  const p = APP_STATE.dietPlans.find((pl) => pl.id === id);
  if (!p) return;
  document.getElementById("viewDietTitle").textContent = p.name;
  const meals = (p.meals || "")
    .split("\n")
    .filter(Boolean)
    .map((m) => {
      const parts = m.split("|").map((s) => s.trim());
      return `<tr><td><strong>${parts[0] || "Meal"}</strong></td><td>${parts[1] || ""}</td><td>${parts[2] || ""}</td></tr>`;
    })
    .join("");
  document.getElementById("viewDietContent").innerHTML = `
    <div class="profile-details-grid">
      <div class="profile-detail-card"><h4>Plan Info</h4>
        <div class="profile-detail-item"><span class="profile-detail-label">Goal</span><span class="profile-detail-value">${p.goal}</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">Daily Calories</span><span class="profile-detail-value">${p.calories || "N/A"}</span></div>
      </div>
      <div class="profile-detail-card"><h4>Description</h4><p class="text-sm">${p.description || "No description provided."}</p></div>
    </div>
    <h4 style="margin-top:var(--space-5);">Daily Meals</h4>
    <table class="data-table" style="margin-top:var(--space-3);"><thead><tr><th>Meal</th><th>Food</th><th>Calories</th></tr></thead><tbody>${meals || '<tr><td colspan="3" style="text-align:center;">No meals defined</td></tr>'}</tbody></table>
  `;
  openModal("viewDietPlanModal");
}

function deleteDietPlan(id) {
  if (!confirm("Delete this diet plan?")) return;
  APP_STATE.dietPlans = APP_STATE.dietPlans.filter((p) => p.id !== id);
  saveAppData("dietPlans");
  renderDietPlans();
}

function sendDietPlanWhatsApp(id) {
  const p = APP_STATE.dietPlans.find((pl) => pl.id === id);
  if (!p || !p.assignedTo) {
    showToast("warning", "Not Assigned", "Assign to a client first.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === p.assignedTo);
  if (!client) return;
  let msg = `Hi ${client.firstName}, here's your diet plan "${p.name}":\n\n`;
  if (p.description) msg += `${p.description}\n\n`;
  msg += "Meals:\n" + (p.meals || "No meals defined");
  sendWhatsApp(client.whatsapp || client.mobile, msg);
}

// ============================================================
// SECTION 25: EXERCISE PLANS
// ============================================================

function openAddExercisePlanModal(editId) {
  if (editId) {
    const p = APP_STATE.exercisePlans.find((pl) => pl.id === editId);
    if (p) {
      document.getElementById("exPlanEditId").value = p.id;
      document.getElementById("exPlanName").value = p.name;
      document.getElementById("exPlanGoal").value = p.goal;
      document.getElementById("exPlanDuration").value = p.duration || "";
      document.getElementById("exPlanDesc").value = p.description || "";
      document.getElementById("exPlanWorkouts").value = p.workouts || "";
      document.getElementById("exPlanTrainer").value = p.assignedTrainer || "";
      document.getElementById("exPlanClient").value = p.assignedTo || "";
    }
  } else {
    document.getElementById("exPlanEditId").value = "";
    ["exPlanName", "exPlanDuration", "exPlanDesc", "exPlanWorkouts"].forEach(
      (id) => {
        document.getElementById(id).value = "";
      },
    );
    document.getElementById("exPlanTrainer").value = "";
    document.getElementById("exPlanClient").value = "";
  }
  openModal("addExercisePlanModal");
}

function saveExercisePlan() {
  const editId = document.getElementById("exPlanEditId").value;
  const plan = {
    id: editId || "Ex_" + Date.now(),
    name: document.getElementById("exPlanName").value.trim(),
    goal: document.getElementById("exPlanGoal").value,
    duration: parseInt(document.getElementById("exPlanDuration").value) || 0,
    description: document.getElementById("exPlanDesc").value.trim(),
    workouts: document.getElementById("exPlanWorkouts").value,
    assignedTrainer: document.getElementById("exPlanTrainer").value || null,
    assignedTo: document.getElementById("exPlanClient").value || null,
    createdAt: editId ? undefined : new Date().toISOString(),
  };
  if (!plan.name) {
    showToast("warning", "Missing", "Plan name is required.");
    return;
  }
  if (editId) {
    const idx = APP_STATE.exercisePlans.findIndex((p) => p.id === editId);
    if (idx !== -1) APP_STATE.exercisePlans[idx] = plan;
    showToast("success", "Updated", `Exercise plan "${plan.name}" updated.`);
  } else {
    APP_STATE.exercisePlans.push(plan);
    showToast("success", "Saved", `Exercise plan "${plan.name}" created.`);
  }
  saveAppData("exercisePlans");
  closeModal("addExercisePlanModal");
  renderExercisePlans();
}

function renderExercisePlans() {
  const grid = document.getElementById("exercisePlanGrid");
  if (!grid) return;
  if (APP_STATE.exercisePlans.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-dumbbell"></i></div><h3>No Exercise Plans</h3><p class="text-muted">Create your first workout plan.</p></div>`;
    return;
  }
  grid.innerHTML = APP_STATE.exercisePlans
    .map((p) => {
      const client = p.assignedTo
        ? APP_STATE.clients.find((c) => c.id === p.assignedTo)
        : null;
      const trainer = p.assignedTrainer
        ? APP_STATE.trainers.find((t) => t.id === p.assignedTrainer)
        : null;
      return `
      <div class="card template-card">
        <div class="template-card-header">
          <span class="badge badge-primary"><i class="fas fa-dumbbell"></i> ${p.goal}</span>
          ${client ? `<span class="badge badge-info">Member: ${client.firstName}</span>` : ""}
          ${trainer ? `<span class="badge badge-accent">Trainer: ${trainer.firstName}</span>` : ""}
        </div>
        <h4>${p.name}</h4>
        <p class="text-sm text-muted">${p.description || ""}</p>
        <div class="template-card-body">
          <strong>Duration:</strong> ${p.duration || "N/A"} weeks<br>
          <strong>Workouts:</strong> ${(p.workouts || "").split("\n").filter(Boolean).length || 0} entries
        </div>
        <div class="template-card-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewExercisePlan('${p.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="openAddExercisePlanModal('${p.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-ghost quick-send-btn whatsapp" onclick="sendExercisePlanWhatsApp('${p.id}')"><i class="fa-brands fa-whatsapp"></i></button>
          <button class="btn btn-sm btn-ghost delete" onclick="deleteExercisePlan('${p.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    })
    .join("");
}

function viewExercisePlan(id) {
  const p = APP_STATE.exercisePlans.find((pl) => pl.id === id);
  if (!p) return;
  document.getElementById("viewExTitle").textContent = p.name;
  const workouts = (p.workouts || "")
    .split("\n")
    .filter(Boolean)
    .map((w) => {
      const parts = w.split("|").map((s) => s.trim());
      return `<tr><td><strong>${parts[0] || "Day"}</strong></td><td>${parts[1] || ""}</td><td>${parts[2] || ""}</td></tr>`;
    })
    .join("");
  document.getElementById("viewExerciseContent").innerHTML = `
    <div class="profile-details-grid">
      <div class="profile-detail-card"><h4>Plan Info</h4>
        <div class="profile-detail-item"><span class="profile-detail-label">Goal</span><span class="profile-detail-value">${p.goal}</span></div>
        <div class="profile-detail-item"><span class="profile-detail-label">Duration</span><span class="profile-detail-value">${p.duration || "N/A"} weeks</span></div>
      </div>
      <div class="profile-detail-card"><h4>Description</h4><p class="text-sm">${p.description || "No description."}</p></div>
    </div>
    <h4 style="margin-top:var(--space-5);">Workout Schedule</h4>
    <table class="data-table" style="margin-top:var(--space-3);"><thead><tr><th>Day</th><th>Exercise</th><th>Sets x Reps</th></tr></thead><tbody>${workouts || '<tr><td colspan="3" style="text-align:center;">No workouts defined</td></tr>'}</tbody></table>
  `;
  openModal("viewExercisePlanModal");
}

function deleteExercisePlan(id) {
  if (!confirm("Delete this exercise plan?")) return;
  APP_STATE.exercisePlans = APP_STATE.exercisePlans.filter((p) => p.id !== id);
  saveAppData("exercisePlans");
  renderExercisePlans();
}

function sendExercisePlanWhatsApp(id) {
  const p = APP_STATE.exercisePlans.find((pl) => pl.id === id);
  if (!p || !p.assignedTo) {
    showToast("warning", "Not Assigned", "Assign to a client first.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === p.assignedTo);
  if (!client) return;
  let msg = `Hi ${client.firstName}, here's your exercise plan "${p.name}":\n\n`;
  if (p.description) msg += `${p.description}\n\n`;
  msg += "Workouts:\n" + (p.workouts || "No workouts defined");
  sendWhatsApp(client.whatsapp || client.mobile, msg);
}

// ============================================================
// SECTION 26: GROUP CLASSES
// ============================================================

function openAddClassModal(editId) {
  if (editId) {
    const c = APP_STATE.classes.find((cl) => cl.id === editId);
    if (c) {
      document.getElementById("classEditId").value = c.id;
      document.getElementById("className").value = c.name;
      document.getElementById("classType").value = c.type;
      document.getElementById("classTrainer").value = c.trainerId || "";
      document.getElementById("classDate").value = c.date;
      document.getElementById("classTime").value = c.time;
      document.getElementById("classCapacity").value = c.capacity;
      document.getElementById("classDuration").value = c.duration;
      document.getElementById("classFee").value = c.fee;
    }
  } else {
    document.getElementById("classEditId").value = "";
    ["className", "classDate", "classTime"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("classCapacity").value = 20;
    document.getElementById("classDuration").value = 60;
    document.getElementById("classFee").value = 0;
  }
  // Populate trainer dropdown
  const trnSelect = document.getElementById("classTrainer");
  if (trnSelect) {
    trnSelect.innerHTML = '<option value="">None</option>';
    APP_STATE.trainers.forEach((t) => {
      trnSelect.innerHTML += `<option value="${t.id}">${t.firstName} ${t.lastName}</option>`;
    });
  }
  openModal("addClassModal");
}

function saveClass() {
  const editId = document.getElementById("classEditId").value;
  const cls = {
    id: editId || "CLS" + Date.now(),
    name: document.getElementById("className").value.trim(),
    type: document.getElementById("classType").value,
    trainerId: document.getElementById("classTrainer").value || null,
    date: document.getElementById("classDate").value,
    time: document.getElementById("classTime").value,
    capacity: parseInt(document.getElementById("classCapacity").value) || 20,
    duration: parseInt(document.getElementById("classDuration").value) || 60,
    fee: parseFloat(document.getElementById("classFee").value) || 0,
    enrolled: editId
      ? APP_STATE.classes.find((c) => c.id === editId)?.enrolled || []
      : [],
    createdAt: editId ? undefined : new Date().toISOString(),
  };
  if (!cls.name) {
    showToast("warning", "Missing", "Class name is required.");
    return;
  }
  if (editId) {
    const idx = APP_STATE.classes.findIndex((c) => c.id === editId);
    if (idx !== -1) APP_STATE.classes[idx] = cls;
    showToast("success", "Updated", `Class "${cls.name}" updated.`);
  } else {
    APP_STATE.classes.push(cls);
    showToast("success", "Saved", `Class "${cls.name}" scheduled.`);
  }
  saveAppData("classes");
  closeModal("addClassModal");
  renderClasses();
}

function renderClasses() {
  const grid = document.getElementById("classesGrid");
  if (!grid) return;
  if (APP_STATE.classes.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-people-group"></i></div><h3>No Classes</h3><p class="text-muted">Schedule your first group class.</p></div>`;
    return;
  }
  grid.innerHTML = APP_STATE.classes
    .map((c) => {
      const trainer = c.trainerId
        ? APP_STATE.trainers.find((t) => t.id === c.trainerId)
        : null;
      const enrolledCount = (c.enrolled || []).length;
      const isFull = enrolledCount >= c.capacity;
      return `
      <div class="card template-card">
        <div class="template-card-header">
          <span class="badge badge-primary"><i class="fas fa-people-group"></i> ${c.type}</span>
          ${isFull ? '<span class="badge badge-danger">Full</span>' : `<span class="badge badge-success">${enrolledCount}/${c.capacity}</span>`}
        </div>
        <h4>${c.name}</h4>
        <div class="template-card-body">
          <div><i class="fas fa-calendar"></i> ${formatDate(c.date)} at ${c.time}</div>
          <div><i class="fas fa-clock"></i> ${c.duration} min</div>
          ${trainer ? `<div><i class="fas fa-user-tie"></i> ${trainer.firstName} ${trainer.lastName}</div>` : ""}
          ${c.fee > 0 ? `<div><i class="fas fa-rupee"></i> ${APP_CONFIG.currency}${c.fee}</div>` : '<span class="badge badge-success">FREE</span>'}
        </div>
        <div class="template-card-actions">
          <button class="btn btn-sm btn-ghost" onclick="viewClassDetails('${c.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="openAddClassModal('${c.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-ghost delete" onclick="deleteClass('${c.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    })
    .join("");
}

function viewClassDetails(id) {
  const c = APP_STATE.classes.find((cl) => cl.id === id);
  if (!c) return;
  const trainer = c.trainerId
    ? APP_STATE.trainers.find((t) => t.id === c.trainerId)
    : null;
  const enrolled = (c.enrolled || [])
    .map((cid) => APP_STATE.clients.find((cl) => cl.id === cid))
    .filter(Boolean);
  alert(
    `Class: ${c.name}\nType: ${c.type}\nDate: ${formatDate(c.date)} at ${c.time}\nDuration: ${c.duration} min\nCapacity: ${c.capacity}\nEnrolled: ${enrolled.length}\nTrainer: ${trainer ? trainer.firstName + " " + trainer.lastName : "None"}\nFee: ${APP_CONFIG.currency}${c.fee}`,
  );
}

function deleteClass(id) {
  if (!confirm("Delete this class?")) return;
  APP_STATE.classes = APP_STATE.classes.filter((c) => c.id !== id);
  saveAppData("classes");
  renderClasses();
}

// ============================================================
// SECTION 27: EXPENSES
// ============================================================

function openAddExpenseModal(editId) {
  if (editId) {
    const e = APP_STATE.expenses.find((ex) => ex.id === editId);
    if (e) {
      document.getElementById("expenseEditId").value = e.id;
      document.getElementById("expenseDate").value = e.date;
      document.getElementById("expenseCategory").value = e.category;
      document.getElementById("expenseAmount").value = e.amount;
      document.getElementById("expenseDesc").value = e.description || "";
      document.getElementById("expenseVendor").value = e.vendor || "";
      document.getElementById("expensePayment").value = e.paymentMode || "Cash";
    }
  } else {
    document.getElementById("expenseEditId").value = "";
    document.getElementById("expenseDate").value = new Date()
      .toISOString()
      .split("T")[0];
    ["expenseAmount", "expenseDesc", "expenseVendor"].forEach((id) => {
      document.getElementById(id).value = "";
    });
  }
  openModal("addExpenseModal");
}

function saveExpense() {
  const editId = document.getElementById("expenseEditId").value;
  const exp = {
    id: editId || "EXP" + Date.now(),
    date: document.getElementById("expenseDate").value,
    category: document.getElementById("expenseCategory").value,
    amount: parseFloat(document.getElementById("expenseAmount").value) || 0,
    description: document.getElementById("expenseDesc").value.trim(),
    vendor: document.getElementById("expenseVendor").value.trim(),
    paymentMode: document.getElementById("expensePayment").value,
    createdAt: editId ? undefined : new Date().toISOString(),
  };
  if (!exp.amount || exp.amount <= 0) {
    showToast("warning", "Invalid Amount", "Amount must be greater than 0.");
    return;
  }
  if (editId) {
    const idx = APP_STATE.expenses.findIndex((e) => e.id === editId);
    if (idx !== -1) APP_STATE.expenses[idx] = exp;
    showToast("success", "Updated", "Expense updated.");
  } else {
    APP_STATE.expenses.push(exp);
    showToast("success", "Saved", "Expense added.");
  }
  saveAppData("expenses");
  closeModal("addExpenseModal");
  renderExpenses();
}

function renderExpenses() {
  const tbody = document.getElementById("expenseTableBody");
  if (!tbody) return;
  const total = APP_STATE.expenses.reduce((sum, e) => sum + e.amount, 0);
  const today = new Date();
  const thisMonth = APP_STATE.expenses
    .filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate revenue (sum of all invoice totals)
  const totalRevenue = APP_STATE.invoices.reduce(
    (sum, i) => sum + (i.total || 0),
    0,
  );
  const netProfit = totalRevenue - total;
  const expRatio =
    totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(0) : 0;

  // Avg monthly expense
  const months = new Set();
  APP_STATE.expenses.forEach((e) => {
    const d = new Date(e.date);
    months.add(d.getFullYear() + "-" + d.getMonth());
  });
  const avgMonthly = months.size > 0 ? total / months.size : 0;

  document.getElementById("statTotalExpenses").textContent =
    APP_CONFIG.currency + total.toLocaleString();
  document.getElementById("statExpenseThisMonth").textContent =
    APP_CONFIG.currency + thisMonth.toLocaleString();
  document.getElementById("statAvgMonthly").textContent =
    APP_CONFIG.currency + Math.round(avgMonthly).toLocaleString();
  document.getElementById("statExpenseRatio").textContent = expRatio + "%";

  if (APP_STATE.expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="empty-state"><div class="empty-state-icon"><i class="fas fa-money-bill-trend-up"></i></div><p class="text-muted">No expenses recorded.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = APP_STATE.expenses
    .slice()
    .reverse()
    .map(
      (e) => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td><span class="badge badge-info">${e.category}</span></td>
      <td>${e.description || "N/A"}</td>
      <td><strong>${APP_CONFIG.currency}${e.amount.toLocaleString()}</strong></td>
      <td>${e.vendor || "N/A"}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn edit" onclick="openAddExpenseModal('${e.id}')"><i class="fas fa-edit"></i></button>
          <button class="table-action-btn delete" onclick="deleteExpense('${e.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  APP_STATE.expenses = APP_STATE.expenses.filter((e) => e.id !== id);
  saveAppData("expenses");
  renderExpenses();
}

// ============================================================
// SECTION 28: REPORTS & ANALYTICS
// ============================================================

function renderReports() {
  const totalRevenue = APP_STATE.invoices.reduce(
    (sum, i) => sum + (i.total || 0),
    0,
  );
  const totalExpenses = APP_STATE.expenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const netProfit = totalRevenue - totalExpenses;
  const activeMembers = APP_STATE.clients.filter(
    (c) => getClientStatus(c).key === "active",
  ).length;
  const totalAtt = APP_STATE.attendance.length || 1;
  const presentAtt = APP_STATE.attendance.filter(
    (a) => a.status === "present",
  ).length;
  const avgAtt = ((presentAtt / totalAtt) * 100).toFixed(0);

  document.getElementById("statTotalRevenue").textContent =
    APP_CONFIG.currency + totalRevenue.toLocaleString();
  document.getElementById("statNetProfit").textContent =
    APP_CONFIG.currency + netProfit.toLocaleString();
  document.getElementById("statActiveMembers").textContent = activeMembers;
  document.getElementById("statAvgAttendance").textContent = avgAtt + "%";

  // Revenue vs Expenses chart
  const ctx1 = document.getElementById("revExpChart");
  if (ctx1) {
    if (APP_STATE.charts.revExp) APP_STATE.charts.revExp.destroy();
    APP_STATE.charts.revExp = new Chart(ctx1.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Revenue", "Expenses", "Net Profit"],
        datasets: [
          {
            label: "Amount",
            data: [totalRevenue, totalExpenses, netProfit],
            backgroundColor: ["#10b981", "#ef4444", "#3b82f6"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  // Plan distribution
  const ctx2 = document.getElementById("reportPlanChart");
  if (ctx2) {
    if (APP_STATE.charts.reportPlan) APP_STATE.charts.reportPlan.destroy();
    const planCounts = {
      Monthly: 0,
      Quarterly: 0,
      "Half-Yearly": 0,
      Annual: 0,
    };
    APP_STATE.clients.forEach((c) => {
      if (planCounts[c.plan] !== undefined) planCounts[c.plan]++;
    });
    APP_STATE.charts.reportPlan = new Chart(ctx2.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: Object.keys(planCounts),
        datasets: [
          {
            data: Object.values(planCounts),
            backgroundColor: ["#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: { legend: { position: "bottom" } },
      },
    });
  }

  // Monthly revenue chart
  const ctx3 = document.getElementById("monthlyRevenueChart");
  if (ctx3) {
    if (APP_STATE.charts.monthlyRev) APP_STATE.charts.monthlyRev.destroy();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyData = new Array(12).fill(0);
    APP_STATE.invoices.forEach((i) => {
      const d = new Date(i.date);
      monthlyData[d.getMonth()] += i.total || 0;
    });
    APP_STATE.charts.monthlyRev = new Chart(ctx3.getContext("2d"), {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Revenue",
            data: monthlyData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  // Top trainers
  const topTrainersList = document.getElementById("topTrainersList");
  if (topTrainersList) {
    const trainersWithClients = APP_STATE.trainers
      .map((t) => ({ ...t, clientCount: (t.assignedClients || []).length }))
      .sort((a, b) => b.clientCount - a.clientCount)
      .slice(0, 5);
    topTrainersList.innerHTML = trainersWithClients.length
      ? trainersWithClients
          .map(
            (t, i) => `
      <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
        <div class="flex items-center gap-3">
          <div class="badge badge-${i === 0 ? "accent" : "primary"}">#${i + 1}</div>
          <div><div class="text-sm font-semibold">${t.firstName} ${t.lastName}</div><div class="text-xs text-muted">${t.specialization}</div></div>
        </div>
        <div class="text-sm font-bold">${t.clientCount} clients</div>
      </div>
    `,
          )
          .join("")
      : '<p class="text-muted">No trainers yet.</p>';
  }
}

function exportFullReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");
  doc.setFontSize(18);
  doc.text(`${APP_CONFIG.gymName} - Business Report`, 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date())}`, 14, 30);
  const totalRev = APP_STATE.invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalExp = APP_STATE.expenses.reduce((s, e) => s + e.amount, 0);
  doc.autoTable({
    startY: 40,
    head: [["Metric", "Value"]],
    body: [
      ["Total Members", APP_STATE.clients.length],
      [
        "Active Members",
        APP_STATE.clients.filter((c) => getClientStatus(c).key === "active")
          .length,
      ],
      ["Total Revenue", `${APP_CONFIG.currency}${totalRev.toLocaleString()}`],
      ["Total Expenses", `${APP_CONFIG.currency}${totalExp.toLocaleString()}`],
      [
        "Net Profit",
        `${APP_CONFIG.currency}${(totalRev - totalExp).toLocaleString()}`,
      ],
      ["Trainers", APP_STATE.trainers.length],
      ["Invoices Generated", APP_STATE.invoices.length],
      ["Attendance Records", APP_STATE.attendance.length],
    ],
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save(`H2O_Singur_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  showToast("success", "Report Exported", "PDF report downloaded.");
}

// ============================================================
// SECTION 29: BODY MEASUREMENTS
// ============================================================

function openBodyMeasurement(clientId) {
  APP_STATE.currentBodyMeasurementClientId = clientId;
  document.getElementById("bmDate").value = new Date()
    .toISOString()
    .split("T")[0];
  [
    "bmWeight",
    "bmBodyFat",
    "bmMuscle",
    "bmChest",
    "bmWaist",
    "bmHips",
    "bmArms",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  document.querySelector("#bodyMeasurementModal .modal-title").textContent =
    `Body Measurements - ${client.firstName} ${client.lastName}`;
  renderBodyMeasurementChart(clientId);
  openModal("bodyMeasurementModal");
}

function saveBodyMeasurement() {
  const clientId = APP_STATE.currentBodyMeasurementClientId;
  if (!clientId) return;
  const m = {
    id: "BM" + Date.now(),
    clientId,
    date: document.getElementById("bmDate").value,
    weight: parseFloat(document.getElementById("bmWeight").value) || 0,
    bodyFat: parseFloat(document.getElementById("bmBodyFat").value) || 0,
    muscle: parseFloat(document.getElementById("bmMuscle").value) || 0,
    chest: parseFloat(document.getElementById("bmChest").value) || 0,
    waist: parseFloat(document.getElementById("bmWaist").value) || 0,
    hips: parseFloat(document.getElementById("bmHips").value) || 0,
    arms: parseFloat(document.getElementById("bmArms").value) || 0,
  };
  if (!m.date) {
    showToast("warning", "Date Required", "Please enter measurement date.");
    return;
  }
  APP_STATE.bodyMeasurements.push(m);
  saveAppData("bodyMeasurements");
  renderBodyMeasurementChart(clientId);
  showToast("success", "Saved", "Body measurement recorded.");
}

function renderBodyMeasurementChart(clientId) {
  const canvas = document.getElementById("bodyMeasurementChart");
  if (!canvas) return;
  if (APP_STATE.charts.bodyMeas) APP_STATE.charts.bodyMeas.destroy();
  const records = APP_STATE.bodyMeasurements
    .filter((m) => m.clientId === clientId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (records.length === 0) {
    canvas.parentElement.innerHTML =
      '<p class="text-muted text-sm" style="text-align:center;padding:20px;">No measurements recorded yet.</p>';
    return;
  }
  const labels = records.map((r) => formatDate(r.date));
  const weightData = records.map((r) => r.weight);
  const waistData = records.map((r) => r.waist);
  APP_STATE.charts.bodyMeas = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Weight (kg)",
          data: weightData,
          borderColor: "#10b981",
          tension: 0.4,
          fill: false,
        },
        {
          label: "Waist (cm)",
          data: waistData,
          borderColor: "#f59e0b",
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// ============================================================
// SECTION 30: LOYALTY POINTS
// ============================================================

function addLoyaltyPoints(clientId, points, type, reason) {
  APP_STATE.loyaltyPoints.push({
    id: "LY" + Date.now() + Math.random().toString(36).slice(2, 6),
    clientId,
    points,
    type,
    reason,
    date: new Date().toISOString(),
  });
  saveAppData("loyaltyPoints");
}

function openLoyaltyPoints(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  const loyalty = getClientLoyalty(clientId);
  const value = (
    loyalty.points * APP_CONFIG.loyaltyConfig.perPointValue
  ).toFixed(2);
  document.getElementById("loyaltyPointsContent").innerHTML = `
    <div style="text-align:center;padding:var(--space-4);">
      <i class="fas fa-award" style="font-size:48px;color:var(--color-accent);"></i>
      <h2 style="margin:var(--space-2) 0;">${loyalty.points} Points</h2>
      <p class="text-muted">Equivalent to ${APP_CONFIG.currency}${value}</p>
    </div>
    <div class="form-row" style="margin-bottom:var(--space-4);">
      <div class="form-group">
        <label class="form-label">Add Points</label>
        <input type="number" class="form-input" id="addPointsAmount" placeholder="e.g. 50">
      </div>
      <div class="form-group">
        <label class="form-label">Reason</label>
        <input type="text" class="form-input" id="addPointsReason" placeholder="e.g. Bonus">
      </div>
    </div>
    <button class="btn btn-primary btn-block" onclick="addPointsManual('${clientId}')"><i class="fas fa-plus"></i> Add Points</button>
    <button class="btn btn-secondary btn-block" style="margin-top:var(--space-2);" onclick="redeemPoints('${clientId}')"><i class="fas fa-gift"></i> Redeem Points</button>
    <h4 style="margin-top:var(--space-5);">History</h4>
    <div style="max-height:200px;overflow-y:auto;">
      ${
        loyalty.history.length
          ? loyalty.history
              .map(
                (h) => `
        <div class="profile-detail-item">
          <span class="profile-detail-label">${h.reason} (${formatDate(h.date)})</span>
          <span class="profile-detail-value" style="color:${h.points >= 0 ? "var(--color-success)" : "var(--color-danger)"};">${h.points >= 0 ? "+" : ""}${h.points}</span>
        </div>
      `,
              )
              .join("")
          : '<p class="text-muted text-sm">No points history.</p>'
      }
    </div>
  `;
  openModal("loyaltyPointsModal");
}

function addPointsManual(clientId) {
  const amount = parseInt(document.getElementById("addPointsAmount").value);
  const reason =
    document.getElementById("addPointsReason").value || "Manual adjustment";
  if (!amount) {
    showToast("warning", "Invalid", "Enter points to add.");
    return;
  }
  addLoyaltyPoints(clientId, amount, "manual", reason);
  openLoyaltyPoints(clientId);
  showToast("success", "Added", `${amount} points added.`);
}

function redeemPoints(clientId) {
  const loyalty = getClientLoyalty(clientId);
  if (loyalty.points <= 0) {
    showToast("warning", "No Points", "Client has no points to redeem.");
    return;
  }
  const redeem = parseInt(
    prompt(`Redeem how many points? Available: ${loyalty.points}`),
  );
  if (!redeem || redeem <= 0) return;
  if (redeem > loyalty.points) {
    showToast("warning", "Too Many", "Cannot redeem more than available.");
    return;
  }
  addLoyaltyPoints(clientId, -redeem, "redeem", "Points redeemed for discount");
  openLoyaltyPoints(clientId);
  showToast(
    "success",
    "Redeemed",
    `${redeem} points redeemed (Value: ${APP_CONFIG.currency}${(redeem * APP_CONFIG.loyaltyConfig.perPointValue).toFixed(2)}).`,
  );
}

// ============================================================
// SECTION 31: REFERRALS
// ============================================================

function openReferral(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  const referrals = APP_STATE.referrals.filter(
    (r) => r.referrerId === clientId,
  );
  const points = APP_CONFIG.loyaltyConfig.pointsPerReferral;
  document.getElementById("referralContent").innerHTML = `
    <div style="text-align:center;padding:var(--space-4);">
      <i class="fas fa-share-from-bracket" style="font-size:48px;color:var(--color-primary);"></i>
      <h2 style="margin:var(--space-2) 0;">${referrals.length} Referrals</h2>
      <p class="text-muted">Earn ${points} points per successful referral</p>
    </div>
    <div class="form-group">
      <label class="form-label">Referred Member</label>
      <select class="form-select" id="newReferralSelect">
        <option value="">Select member...</option>
        ${APP_STATE.clients
          .filter(
            (c) =>
              c.id !== clientId &&
              !APP_STATE.referrals.some((r) => r.referredId === c.id),
          )
          .map(
            (c) =>
              `<option value="${c.id}">${c.firstName} ${c.lastName}</option>`,
          )
          .join("")}
      </select>
    </div>
    <button class="btn btn-primary btn-block" onclick="addReferral('${clientId}')"><i class="fas fa-plus"></i> Add Referral</button>
    <h4 style="margin-top:var(--space-5);">Referral History</h4>
    ${
      referrals.length
        ? referrals
            .map((r) => {
              const referred = APP_STATE.clients.find(
                (c) => c.id === r.referredId,
              );
              return `<div class="profile-detail-item"><span class="profile-detail-label">${referred ? referred.firstName + " " + referred.lastName : "Unknown"} (${formatDate(r.date)})</span><span class="badge badge-success">+${r.pointsAwarded} pts</span></div>`;
            })
            .join("")
        : '<p class="text-muted text-sm">No referrals yet.</p>'
    }
  `;
  openModal("referralModal");
}

function addReferral(referrerId) {
  const referredId = document.getElementById("newReferralSelect").value;
  if (!referredId) {
    showToast("warning", "Select", "Choose a referred member.");
    return;
  }
  const points = APP_CONFIG.loyaltyConfig.pointsPerReferral;
  APP_STATE.referrals.push({
    id: "REF" + Date.now(),
    referrerId,
    referredId,
    pointsAwarded: points,
    date: new Date().toISOString(),
  });
  addLoyaltyPoints(referrerId, points, "referral", "Referral bonus");
  saveAppData("referrals");
  openReferral(referrerId);
  showToast("success", "Referral Added", `${points} points awarded.`);
}

// ============================================================
// SECTION 32: FEEDBACK SYSTEM
// ============================================================

function openFeedback(clientId) {
  document.getElementById("feedbackClientId").value = clientId;
  APP_STATE.currentStarRating = 0;
  document.querySelectorAll(".star-rating i").forEach((s) => {
    s.classList.remove("active");
  });
  document.getElementById("feedbackComments").value = "";
  openModal("feedbackModal");
}

function setRating(rating) {
  APP_STATE.currentStarRating = rating;
  document.querySelectorAll(".star-rating i").forEach((s, i) => {
    if (i < rating) {
      s.classList.add("active");
      s.classList.replace("far", "fas");
    } else {
      s.classList.remove("active");
      s.classList.replace("fas", "far");
    }
  });
}

function saveFeedback() {
  const clientId = document.getElementById("feedbackClientId").value;
  if (!clientId) return;
  if (!APP_STATE.currentStarRating) {
    showToast("warning", "Rating", "Please select a rating.");
    return;
  }
  const fb = {
    id: "FB" + Date.now(),
    clientId,
    rating: APP_STATE.currentStarRating,
    category: document.getElementById("feedbackCategory").value,
    comments: document.getElementById("feedbackComments").value.trim(),
    date: new Date().toISOString(),
  };
  APP_STATE.feedback.push(fb);
  saveAppData("feedback");
  closeModal("feedbackModal");
  showToast("success", "Feedback Saved", "Thank you for your feedback!");
}

// ============================================================
// SECTION 33: MEMBERSHIP FREEZE
// ============================================================

function openFreeze(clientId) {
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  document.getElementById("freezeClientId").value = clientId;
  document.getElementById("freezeFrom").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("freezeTo").value = "";
  openModal("freezeModal");
}

function applyFreeze() {
  const clientId = document.getElementById("freezeClientId").value;
  const fromDate = document.getElementById("freezeFrom").value;
  const toDate = document.getElementById("freezeTo").value;
  const reason = document.getElementById("freezeReason").value;
  if (!fromDate || !toDate) {
    showToast("warning", "Dates", "Please select freeze period.");
    return;
  }
  const client = APP_STATE.clients.find((c) => c.id === clientId);
  if (!client) return;
  // Extend renewal date by freeze duration
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
  if (client.renewalDate) {
    const renewal = new Date(client.renewalDate);
    renewal.setDate(renewal.getDate() + days);
    client.renewalDate = renewal.toISOString().split("T")[0];
  }
  APP_STATE.freezes.push({
    id: "FRZ" + Date.now(),
    clientId,
    fromDate,
    toDate,
    reason,
    days,
    date: new Date().toISOString(),
  });
  saveAppData("clients");
  saveAppData("freezes");
  closeModal("freezeModal");
  showToast(
    "success",
    "Frozen",
    `Membership frozen for ${days} days. Renewal extended.`,
  );
}

// ============================================================
// SECTION 34: FESTIVAL CAMPAIGNS
// ============================================================

function openFestivalCampaignModal() {
  document.getElementById("campaignName").value = "";
  document.getElementById("campaignDiscount").value = 10;
  document.getElementById("campaignValid").value = "";
  document.getElementById("campaignMessage").value =
    "🎉 {festival} Special at {gym}! Get {discount}% off on all annual memberships. Limited time only! Visit us today!";
  ["campaignAll", "campaignActive"].forEach((id) => {
    document.getElementById(id).checked = id === "campaignAll";
  });
  document.getElementById("campaignExpired").checked = false;
  openModal("festivalCampaignModal");
}

function launchCampaign() {
  const name = document.getElementById("campaignName").value.trim();
  const discount = document.getElementById("campaignDiscount").value;
  const valid = document.getElementById("campaignValid").value;
  const message = document
    .getElementById("campaignMessage")
    .value.replace(/{festival}/g, name || "Festival")
    .replace(/{gym}/g, APP_CONFIG.gymName)
    .replace(/{discount}/g, discount);
  const all = document.getElementById("campaignAll").checked;
  const active = document.getElementById("campaignActive").checked;
  const expired = document.getElementById("campaignExpired").checked;
  let targetClients = APP_STATE.clients;
  if (!all) {
    targetClients = targetClients.filter((c) => {
      const s = getClientStatus(c);
      return (active && s.key === "active") || (expired && s.key === "expired");
    });
  }
  if (targetClients.length === 0) {
    showToast("warning", "No Targets", "No clients match the criteria.");
    return;
  }
  APP_STATE.campaigns.push({
    id: "CMP" + Date.now(),
    name,
    discount,
    valid,
    message,
    sentTo: targetClients.length,
    date: new Date().toISOString(),
  });
  saveAppData("campaigns");
  // Open WhatsApp for each client (limit to 5 to avoid popup blocking)
  const limit = Math.min(5, targetClients.length);
  for (let i = 0; i < limit; i++) {
    sendWhatsApp(targetClients[i].whatsapp || targetClients[i].mobile, message);
  }
  closeModal("festivalCampaignModal");
  showToast(
    "success",
    "Campaign Launched",
    `Sent to ${limit} clients via WhatsApp. (${targetClients.length} total targeted)`,
  );
}

// ============================================================
// SECTION 35: SELF-REGISTRATION PORTAL
// ============================================================

function renderSelfRegPortal() {
  // Generate portal URL
  const url = `${window.location.origin}${window.location.pathname}?portal=selfregister`;
  document.getElementById("selfRegPortalUrl").value = url;
  // Render pending approvals
  const list = document.getElementById("pendingSelfRegList");
  const pending = APP_STATE.selfRegistrations.filter(
    (s) => s.status === "pending",
  );
  if (pending.length === 0) {
    list.innerHTML =
      '<p class="text-muted text-sm">No pending self-registrations.</p>';
    return;
  }
  list.innerHTML = pending
    .map(
      (s) => `
    <div class="backup-item">
      <div class="backup-item-info">
        <div class="backup-item-icon"><i class="fas fa-user-clock"></i></div>
        <div>
          <div class="backup-item-name">${s.firstName} ${s.lastName} - ${s.mobile}</div>
          <div class="backup-item-date">Applied: ${formatDateTime(s.date)} | Goal: ${s.goal}</div>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-primary" onclick="approveSelfReg('${s.id}')"><i class="fas fa-check"></i> Approve</button>
        <button class="btn btn-sm btn-danger" onclick="rejectSelfReg('${s.id}')"><i class="fas fa-times"></i> Reject</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function copySelfRegLink() {
  const url = document.getElementById("selfRegPortalUrl").value;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showToast("success", "Copied", "Portal link copied to clipboard.");
    })
    .catch(() => {
      showToast("info", "Link", url);
    });
}

function openSelfRegPortal() {
  const url = document.getElementById("selfRegPortalUrl").value;
  window.open(url, "_blank");
}

function exportSelfRegQR() {
  const url = document.getElementById("selfRegPortalUrl").value;
  const win = window.open("", "_blank");
  win.document.write(
    `<html><head><title>Self-Registration QR</title></head><body style="text-align:center;padding:40px;"><h2>${APP_CONFIG.gymName}</h2><p>Scan to self-register</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" alt="QR"><br><a href="${url}">${url}</a></body></html>`,
  );
  win.document.close();
}

function approveSelfReg(id) {
  const reg = APP_STATE.selfRegistrations.find((s) => s.id === id);
  if (!reg) return;
  reg.status = "approved";
  // Create client from self-registration
  const newClient = {
    id: "CLT" + Date.now(),
    firstName: reg.firstName,
    lastName: reg.lastName,
    mobile: reg.mobile,
    email: reg.email,
    goal: reg.goal,
    plan: reg.plan || "Monthly",
    joinDate: new Date().toISOString().split("T")[0],
    renewalDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })(),
    fees: APP_CONFIG.planPrices[reg.plan || "Monthly"] || 3000,
    paymentMode: "Pending",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  APP_STATE.clients.push(newClient);
  saveAppData("clients");
  saveAppData("selfRegistrations");
  renderSelfRegPortal();
  updateSidebarBadges();
  showToast(
    "success",
    "Approved",
    `${reg.firstName} ${reg.lastName} added as member.`,
  );
}

function rejectSelfReg(id) {
  const reg = APP_STATE.selfRegistrations.find((s) => s.id === id);
  if (!reg) return;
  reg.status = "rejected";
  saveAppData("selfRegistrations");
  renderSelfRegPortal();
  showToast("info", "Rejected", "Self-registration rejected.");
}

// Handle URL parameter for self-reg portal
function checkSelfRegPortal() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("portal") === "selfregister") {
    // Hide login page and show self-reg form
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appLayout").style.display = "none";
    showSelfRegForm();
  }
}

function showSelfRegForm() {
  // Create a simple self-registration form on the page
  const existing = document.getElementById("publicSelfRegForm");
  if (existing) {
    existing.style.display = "flex";
    return;
  }
  const form = document.createElement("div");
  form.id = "publicSelfRegForm";
  form.style.cssText =
    "min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg-body);padding:var(--space-6);";
  form.innerHTML = `
    <div class="login-card" style="max-width:500px;">
      <div class="login-logo">
        <div class="login-logo-icon"><i class="fas fa-dumbbell"></i></div>
        <h1>${APP_CONFIG.gymName}</h1>
        <p>Self-Registration Portal</p>
      </div>
      <form onsubmit="submitSelfRegForm(event)">
        <div class="form-group"><label>Full Name *</label><input type="text" id="selfRegName" required></div>
        <div class="form-group"><label>Mobile *</label><input type="tel" id="selfRegMobile" required></div>
        <div class="form-group"><label>Email</label><input type="email" id="selfRegEmail"></div>
        <div class="form-group"><label>Fitness Goal</label><select id="selfRegGoal"><option>Weight Loss</option><option>Muscle Gain</option><option>General Fitness</option><option>Body Recomposition</option></select></div>
        <div class="form-group"><label>Preferred Plan</label><select id="selfRegPlan"><option>Monthly</option><option>Quarterly</option><option>Half-Yearly</option><option>Annual</option></select></div>
        <button type="submit" class="btn btn-primary btn-block btn-lg">Submit Registration</button>
      </form>
      <p class="text-muted text-xs" style="text-align:center;margin-top:var(--space-4);">${APP_CONFIG.selfRegApproval ? "Your registration will be reviewed by our team." : "You will be registered immediately."}</p>
    </div>
  `;
  document.body.appendChild(form);
}

function submitSelfRegForm(event) {
  event.preventDefault();
  const name = document.getElementById("selfRegName").value.trim();
  const [firstName, ...lastParts] = name.split(" ");
  const lastName = lastParts.join(" ");
  const reg = {
    id: "SR" + Date.now(),
    firstName,
    lastName,
    mobile: document.getElementById("selfRegMobile").value,
    email: document.getElementById("selfRegEmail").value,
    goal: document.getElementById("selfRegGoal").value,
    plan: document.getElementById("selfRegPlan").value,
    status: "pending",
    date: new Date().toISOString(),
  };
  // ★ LIVE MODE: the public portal submits straight to the MySQL
  // database through an unauthenticated API endpoint.
  if (!APP_STATE.currentUser) {
    fetch(API_URL + "?action=public_selfreg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reg),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          event.target.innerHTML =
            '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-check-circle" style="color:var(--color-success);"></i></div><h3>Registration Submitted!</h3><p>We will contact you soon.</p></div>';
        } else {
          showToast("error", "Failed", j.message || "Could not submit registration.");
        }
      })
      .catch(() => {
        showToast("error", "Network Error", "Could not reach the server. Try again.");
      });
    return;
  }
  // Logged-in mode (staff testing the form) — normal sync path
  APP_STATE.selfRegistrations.push(reg);
  saveAppData("selfRegistrations");
  event.target.innerHTML =
    '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-check-circle" style="color:var(--color-success);"></i></div><h3>Registration Submitted!</h3><p>We will contact you soon.</p></div>';
}

// ============================================================
// SECTION 36: BULK RENEWAL REMINDERS
// ============================================================

function sendBulkRenewalReminders() {
  const today = new Date();
  const upcoming = APP_STATE.clients.filter((c) => {
    if (!c.renewalDate) return false;
    const renew = new Date(c.renewalDate);
    const diff = Math.ceil((renew - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });
  if (upcoming.length === 0) {
    showToast("info", "No Renewals", "No renewals due in the next 7 days.");
    return;
  }
  const limit = Math.min(5, upcoming.length);
  for (let i = 0; i < limit; i++) {
    const c = upcoming[i];
    const msg = `Hi ${c.firstName}, your ${APP_CONFIG.gymName} membership expires on ${formatDate(c.renewalDate)}. Renew now to keep crushing your fitness goals! 💪`;
    sendWhatsApp(c.whatsapp || c.mobile, msg);
  }
  showToast(
    "success",
    "Reminders Sent",
    `Sent WhatsApp reminders to ${limit} members. (${upcoming.length} total expiring soon)`,
  );
}

// ============================================================
// SECTION 37: ENQUIRY TO CLIENT CONVERSION
// ============================================================

function convertEnquiryToClient(id) {
  const enq = APP_STATE.enquiries.find((e) => e.id === id);
  if (!enq) return;
  const newClient = {
    id: "CLT" + Date.now(),
    firstName: enq.name.split(" ")[0] || enq.name,
    lastName: enq.name.split(" ").slice(1).join(" ") || "",
    mobile: enq.phone,
    email: enq.email || "",
    goal: "General Fitness",
    plan: "Monthly",
    joinDate: new Date().toISOString().split("T")[0],
    renewalDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split("T")[0];
    })(),
    fees: APP_CONFIG.planPrices["Monthly"] || 3000,
    paymentMode: "Pending",
    status: "active",
    notes: `Converted from enquiry on ${enq.interest}. Original enquiry: ${enq.message || "N/A"}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  APP_STATE.clients.push(newClient);
  enq.status = "Converted";
  saveAppData("clients");
  saveAppData("enquiries");
  renderEnquiryTable();
  updateSidebarBadges();
  showToast("success", "Converted", `${enq.name} converted to member.`);
}

// ============================================================
// SECTION 38: BIRTHDAY AUTO-WISH SCHEDULER
// ============================================================

function sendBirthdayWishes() {
  const today = new Date();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const birthdayClients = APP_STATE.clients.filter((c) => {
    if (!c.dob) return false;
    const dob = new Date(c.dob);
    return dob.getMonth() === todayM && dob.getDate() === todayD;
  });
  if (birthdayClients.length === 0) {
    showToast("info", "No Birthdays", "No birthdays today.");
    return;
  }
  const limit = Math.min(5, birthdayClients.length);
  for (let i = 0; i < limit; i++) {
    const tpl = APP_STATE.templates.find((t) => t.id === "tpl_bday");
    const msg = tpl
      ? tpl.content
          .replace(/{name}/g, birthdayClients[i].firstName)
          .replace(/{gym}/g, APP_CONFIG.gymName)
      : `Happy Birthday ${birthdayClients[i].firstName}!`;
    sendWhatsApp(birthdayClients[i].whatsapp || birthdayClients[i].mobile, msg);
  }
  showToast(
    "success",
    "Wishes Sent",
    `Sent birthday wishes to ${limit} members via WhatsApp.`,
  );
}

// ============================================================
// SECTION 39: STAFF ATTENDANCE (trainer check-in)
// ============================================================

function markStaffAttendance(trainerId, status) {
  const date = new Date().toISOString().split("T")[0];
  // Reuse attendance array with clientId = trainerId (prefixed)
  const key = "TRN_" + trainerId;
  const idx = APP_STATE.attendance.findIndex(
    (a) => a.clientId === key && a.date === date,
  );
  const rec = {
    clientId: key,
    date,
    status,
    checkIn:
      status === "present"
        ? new Date().toTimeString().split(" ")[0].slice(0, 5)
        : null,
    timestamp: new Date().toISOString(),
  };
  if (idx !== -1) APP_STATE.attendance[idx] = rec;
  else APP_STATE.attendance.push(rec);
  saveAppData("attendance");
  showToast("success", "Marked", `Trainer marked ${status}.`);
}

// ============================================================
// SECTION 40: ENHANCED INVOICE RENDERING (improved looks)
// ============================================================

// Override renderInvoiceHTML with improved styling
const _originalRenderInvoiceHTML = renderInvoiceHTML;
renderInvoiceHTML = function (invoice) {
  document.documentElement.style.setProperty("--invoice-color", invoice.color);
  const content = document.getElementById("invoicePreviewContent");
  const subtotalWords = numberToWords(Math.floor(invoice.total)) + " only";
  content.innerHTML = `
    <div class="invoice-preview invoice-preview-v2" style="--inv-color:${invoice.color};">
      <div class="inv-v2-header" style="background:linear-gradient(135deg,${invoice.color},${invoice.color}cc);">
        <div class="inv-v2-brand">
          <div class="inv-v2-logo"><i class="fas fa-dumbbell"></i></div>
          <div>
            <h2>${invoice.gymName}</h2>
            <p>${invoice.gymAddress}<br><i class="fas fa-phone"></i> ${invoice.gymPhone}</p>
          </div>
        </div>
        <div class="inv-v2-title">
          <h1>INVOICE</h1>
          <p class="inv-v2-num">#${invoice.number}</p>
          <p class="inv-v2-date">${formatDate(invoice.date)}${invoice.gstNumber ? "<br>GSTIN: " + invoice.gstNumber : ""}</p>
        </div>
      </div>
      <div class="inv-v2-body">
        <div class="inv-v2-bill">
          <h4>Bill To</h4>
          <p class="inv-v2-name">${invoice.client.firstName} ${invoice.client.lastName}</p>
          <p>${invoice.client.address || "N/A"}<br>${invoice.client.city || ""}, ${invoice.client.state || ""}<br><i class="fas fa-phone"></i> ${invoice.client.mobile}</p>
        </div>
        <div class="inv-v2-meta">
          <h4>Membership</h4>
          <p class="inv-v2-name">${invoice.client.plan}</p>
          <p>Joined: ${formatDate(invoice.client.joinDate)}<br>Renewal: ${formatDate(invoice.client.renewalDate)}</p>
        </div>
      </div>
      <table class="inv-v2-table">
        <thead>
          <tr style="background:${invoice.color};">
            <th style="width:40px;">#</th>
            <th>Description</th>
            <th style="text-align:right;width:120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item, i) => `<tr><td>${i + 1}</td><td>${item.description}</td><td style="text-align:right;">${APP_CONFIG.currency}${item.amount.toFixed(2)}</td></tr>`).join("")}
        </tbody>
        <tfoot>
          <tr><td colspan="2">Subtotal</td><td style="text-align:right;">${APP_CONFIG.currency}${invoice.subtotal.toFixed(2)}</td></tr>
          ${invoice.discount > 0 ? `<tr><td colspan="2">Discount</td><td style="text-align:right;color:${invoice.color};">- ${APP_CONFIG.currency}${invoice.discount.toFixed(2)}</td></tr>` : ""}
          ${invoice.taxRate > 0 ? `<tr><td colspan="2">Tax (${invoice.taxRate}%)</td><td style="text-align:right;">${APP_CONFIG.currency}${invoice.taxAmount.toFixed(2)}</td></tr>` : ""}
          <tr class="inv-v2-total" style="background:${invoice.color}22;">
            <td colspan="2"><strong>Total Amount</strong></td>
            <td style="text-align:right;font-size:18px;color:${invoice.color};"><strong>${APP_CONFIG.currency}${invoice.total.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
      <div class="inv-v2-amount-words"><strong>Amount in Words:</strong> ${subtotalWords}</div>
      <div class="inv-v2-footer">
        <p>Thank you for your business with ${invoice.gymName}! 💪</p>
        <p class="text-xs text-muted">This is a computer-generated invoice and does not require a signature.</p>
      </div>
    </div>
  `;
};

function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function threeDigits(n) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (
      (h ? ones[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "")
    );
  }
  let result = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (crore) result += threeDigits(crore) + " Crore ";
  if (lakh) result += twoDigits(lakh) + " Lakh ";
  if (thousand) result += twoDigits(thousand) + " Thousand ";
  if (num) result += threeDigits(num);
  return result.trim() || "Zero";
}

// ============================================================
// SECTION 40: USER MANAGEMENT (ADMIN) + SIDEBAR RESIZER
// ============================================================

/**
 * Render the User Management panel (Settings page, admin only).
 * Users are stored in the MySQL `users` table — the same table the
 * login verifies against.
 */
async function renderUsersManagement() {
  const wrap = document.getElementById("userManagementContainer");
  if (!wrap) return;
  if (APP_STATE.currentUser?.role !== "admin") {
    wrap.innerHTML =
      '<p class="text-muted">Only administrators can manage users.</p>';
    return;
  }
  wrap.innerHTML =
    '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading users...</p>';
  try {
    const res = await apiCall("users_list");
    const users = res.users || [];
    wrap.innerHTML = `
      <div class="table-container" style="margin-bottom: var(--space-4);">
        <table class="data-table" style="min-width:520px;">
          <thead>
            <tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${users
              .map(
                (u) => `
              <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.name || "-"}</td>
                <td><span class="badge ${u.role === "admin" ? "badge-success" : "badge-info"}">${u.role}</span></td>
                <td>${u.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
                <td>
                  <button class="btn btn-sm btn-ghost" onclick="editSystemUser(${u.id}, '${u.username}', '${(u.name || "").replace(/'/g, "\\'")}', '${u.role}', ${u.active})" data-tooltip="Edit"><i class="fas fa-edit"></i></button>
                  <button class="btn btn-sm btn-ghost" onclick="deleteSystemUser(${u.id}, '${u.username}')" data-tooltip="Delete"><i class="fas fa-trash"></i></button>
                </td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <h4 style="margin-bottom: var(--space-3);" id="userFormTitle">Add New User</h4>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Username *</label><input class="form-input" id="newUserUsername" placeholder="e.g. frontdesk2"></div>
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="newUserName" placeholder="e.g. Priya Das"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Password * <span class="text-muted text-xs">(blank on edit = keep current)</span></label><input class="form-input" type="password" id="newUserPassword" placeholder="min 6 characters"></div>
        <div class="form-group">
          <label class="form-label">Role *</label>
          <select class="form-select" id="newUserRole">
            <option value="admin">Admin (full access)</option>
            <option value="staff" selected>Staff (front desk)</option>
            <option value="trainer">Trainer</option>
          </select>
        </div>
        <div class="form-group" style="max-width:130px;">
          <label class="form-label">Status</label>
          <select class="form-select" id="newUserActive">
            <option value="1" selected>Active</option>
            <option value="0">Disabled</option>
          </select>
        </div>
      </div>
      <input type="hidden" id="newUserId" value="">
      <div class="flex gap-2">
        <button class="btn btn-primary" onclick="saveSystemUser()"><i class="fas fa-save"></i> Save User</button>
        <button class="btn btn-ghost" onclick="resetUserForm()"><i class="fas fa-broom"></i> Clear</button>
      </div>
    `;
    window._systemUsers = users;
  } catch (e) {
    wrap.innerHTML = `<p class="text-danger">Could not load users: ${e.message}</p>`;
  }
}

function resetUserForm() {
  ["newUserUsername", "newUserName", "newUserPassword", "newUserId"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    },
  );
  const role = document.getElementById("newUserRole");
  if (role) role.value = "staff";
  const active = document.getElementById("newUserActive");
  if (active) active.value = "1";
  const title = document.getElementById("userFormTitle");
  if (title) title.textContent = "Add New User";
}

function editSystemUser(id, username, name, role, active) {
  document.getElementById("newUserId").value = id;
  document.getElementById("newUserUsername").value = username;
  document.getElementById("newUserName").value = name;
  document.getElementById("newUserRole").value = role;
  document.getElementById("newUserActive").value = active ? "1" : "0";
  document.getElementById("newUserPassword").value = "";
  const title = document.getElementById("userFormTitle");
  if (title) title.textContent = `Edit User: ${username}`;
}

async function saveSystemUser() {
  const id = parseInt(document.getElementById("newUserId").value) || 0;
  const payload = {
    id,
    username: document.getElementById("newUserUsername").value.trim(),
    name: document.getElementById("newUserName").value.trim(),
    password: document.getElementById("newUserPassword").value,
    role: document.getElementById("newUserRole").value,
    active: document.getElementById("newUserActive").value === "1",
  };
  if (!payload.username || (id === 0 && !payload.password)) {
    showToast("warning", "Missing Fields", "Username and password are required.");
    return;
  }
  try {
    await apiCall("users_save", payload);
    showToast("success", "Saved", `User ${payload.username} saved to database.`);
    resetUserForm();
    renderUsersManagement();
  } catch (e) {
    showToast("error", "Save Failed", e.message);
  }
}

async function deleteSystemUser(id, username) {
  if (!confirm(`Delete user "${username}" from the database?`)) return;
  try {
    await apiCall("users_delete", { id });
    showToast("success", "Deleted", `User ${username} removed.`);
    renderUsersManagement();
  } catch (e) {
    showToast("error", "Delete Failed", e.message);
  }
}

/**
 * Change the password of the currently logged-in user
 */
async function changeMyPassword() {
  const current = document.getElementById("myCurrentPassword").value;
  const next = document.getElementById("myNewPassword").value;
  if (!current || !next) {
    showToast("warning", "Missing Fields", "Enter both passwords.");
    return;
  }
  try {
    await apiCall("change_password", { current, new: next });
    document.getElementById("myCurrentPassword").value = "";
    document.getElementById("myNewPassword").value = "";
    showToast("success", "Password Changed", "Your password was updated in the database.");
  } catch (e) {
    showToast("error", "Failed", e.message);
  }
}

/**
 * ★ Adjustable sidebar — drag the right edge to resize.
 * Width is remembered per browser (localStorage) and applied via
 * the --sidebar-width CSS variable.
 */
function setupSidebarResize() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  // Handle element
  const handle = document.createElement("div");
  handle.id = "sidebarResizeHandle";
  handle.title = "Drag to resize sidebar";
  sidebar.appendChild(handle);

  // Restore saved width
  const saved = parseInt(localStorage.getItem("h2o_sidebar_width"));
  if (saved >= 190 && saved <= 440) {
    document.documentElement.style.setProperty("--sidebar-width", saved + "px");
  }

  let startX = 0;
  let startW = 0;
  let dragging = false;

  function onDown(e) {
    if (sidebar.classList.contains("collapsed")) return;
    if (window.innerWidth <= 768) return; // mobile: fixed behaviour
    dragging = true;
    startX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging) return;
    const x = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    let w = startW + (x - startX);
    w = Math.max(190, Math.min(440, w));
    document.documentElement.style.setProperty("--sidebar-width", w + "px");
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    const w = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"),
    );
    if (!isNaN(w)) localStorage.setItem("h2o_sidebar_width", String(w));
  }

  handle.addEventListener("mousedown", onDown);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  handle.addEventListener("touchstart", onDown, { passive: false });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onUp);
}

// ============================================================
// SECTION 41: INITIALIZATION HOOKS FOR NEW FEATURES
// ============================================================

// Override DOMContentLoaded to also check for self-reg portal
const _origDOMContentLoaded = document.addEventListener;
document.addEventListener(
  "DOMContentLoaded",
  () => {
    setTimeout(checkSelfRegPortal, 50);
  },
  { once: false },
);

// Update refreshAllData to include new renderers
const _origRefreshAllData = refreshAllData;
refreshAllData = function () {
  _origRefreshAllData();
  if (typeof renderTrainerTable === "function") renderTrainerTable();
  if (typeof renderAttendanceTable === "function") renderAttendanceTable();
  if (typeof renderDietPlans === "function") renderDietPlans();
  if (typeof renderExercisePlans === "function") renderExercisePlans();
  if (typeof renderClasses === "function") renderClasses();
  if (typeof renderExpenses === "function") renderExpenses();
  if (typeof renderReports === "function") renderReports();
  if (typeof updateSidebarBadges === "function") updateSidebarBadges();
};

// ============================================================
// END OF ENHANCED APPLICATION LOGIC
// ============================================================

// Koushik koley modification
