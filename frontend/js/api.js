// ═══════════════════════════════════════════════════════════
//  VISTRU — Frontend API Connector
//  frontend/js/api.js
//
//  This file replaces all the mock/demo functions in the
//  prototype with real HTTP calls to the backend API.
//  Include this in every dashboard page.
// ═══════════════════════════════════════════════════════════

const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' 
  ? 'http://127.0.0.1:5000/api' 
  : 'https://vistru-backend.onrender.com/api'; // Replace with real backend URL after deployment

// ── Token management ──
const Auth = {
  getAccess  : ()    => localStorage.getItem('vistru_access'),
  getRefresh : ()    => localStorage.getItem('vistru_refresh'),
  getUser    : ()    => JSON.parse(localStorage.getItem('vistru_user') || 'null'),
  save       : (data) => {
    localStorage.setItem('vistru_access',  data.accessToken);
    localStorage.setItem('vistru_refresh', data.refreshToken);
    localStorage.setItem('vistru_user',    JSON.stringify(data.user));
  },
  clear      : ()    => {
    localStorage.removeItem('vistru_access');
    localStorage.removeItem('vistru_refresh');
    localStorage.removeItem('vistru_user');
  },
  isLoggedIn : ()    => !!localStorage.getItem('vistru_access')
};

// ── Core fetch wrapper with auto token refresh ──
async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const access = Auth.getAccess();
  if (access) headers['Authorization'] = `Bearer ${access}`;

  let res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && Auth.getRefresh()) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({ refreshToken: Auth.getRefresh() })
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      localStorage.setItem('vistru_access',  refreshData.accessToken);
      localStorage.setItem('vistru_refresh', refreshData.refreshToken);
      headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } else {
      Auth.clear();
      window.location.href = '/';  // redirect to landing / login
      return;
    }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Multipart form fetch (for file uploads) ──
async function apiUpload(endpoint, formData) {
  const access = Auth.getAccess();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method  : 'POST',
    headers : access ? { 'Authorization': `Bearer ${access}` } : {},
    body    : formData  // do NOT set Content-Type — browser sets it with boundary
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

// ═══════════════════════════════════════════
//  AUTH API
// ═══════════════════════════════════════════
const AuthAPI = {

  // ── Client registration ──
  registerClient: async (formData) => {
    return apiUpload('/auth/register/client', formData);
  },

  // ── Engineer registration ──
  registerEngineer: async (formData) => {
    return apiUpload('/auth/register/engineer', formData);
  },

  // ── Supplier registration ──
  registerSupplier: async (formData) => {
    return apiUpload('/auth/register/supplier', formData);
  },

  // ── Verify email OTP ──
  verifyEmail: async (userId, otp) => {
    return apiFetch('/auth/verify-email', {
      method : 'POST',
      body   : JSON.stringify({ userId, otp })
    });
  },

  // ── Resend OTP ──
  resendOTP: async (userId) => {
    return apiFetch('/auth/resend-otp', {
      method : 'POST',
      body   : JSON.stringify({ userId })
    });
  },

  // ── Login ──
  login: async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method : 'POST',
      body   : JSON.stringify({ email, password })
    });
    Auth.save(data);
    return data;
  },

  // ── Logout ──
  logout: async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) {}
    Auth.clear();
    window.location.href = '/';
  },

  // ── Forgot password ──
  forgotPassword: async (email) => {
    return apiFetch('/auth/forgot-password', {
      method : 'POST',
      body   : JSON.stringify({ email })
    });
  },

  // ── Reset password ──
  resetPassword: async (token, newPassword) => {
    return apiFetch('/auth/reset-password', {
      method : 'POST',
      body   : JSON.stringify({ token, newPassword })
    });
  }
};

// ═══════════════════════════════════════════
//  PROJECT API
// ═══════════════════════════════════════════
const ProjectAPI = {

  create: async (data) => apiFetch('/project', {
    method : 'POST',
    body   : JSON.stringify(data)
  }),

  getMyProjects: async () => apiFetch('/client/dashboard'),

  getProject: async (id) => apiFetch(`/project/${id}`),

  getMilestones: async (projectId) => apiFetch(`/project/${projectId}/milestones`),

  getBOQBids: async (projectId) => apiFetch(`/project/${projectId}/boqs`),

  awardBOQ: async (projectId, boqId) => apiFetch(`/project/${projectId}/boqs/${boqId}/award`, {
    method: 'POST'
  }),

  fileMilestone: async (projectId, milestoneId, notes) =>
    apiFetch(`/project/${projectId}/milestones/${milestoneId}/file`, {
      method : 'POST',
      body   : JSON.stringify({ notes })
    }),

  getOpenProjects: async (state) =>
    apiFetch(`/project/open/for-engineers${state ? '?state=' + state : ''}`),

  submitBOQ: async (formData) => apiUpload('/engineer/boq', formData),

  uploadLandDocs: async (projectId, formData) =>
    apiUpload(`/project/${projectId}/land-docs`, formData),

  uploadDrawings: async (projectId, formData) =>
    apiUpload(`/project/${projectId}/drawings`, formData)
};

// ═══════════════════════════════════════════
//  ESCROW API
// ═══════════════════════════════════════════
const EscrowAPI = {

  fundMilestone: async (milestoneId, paymentRef) =>
    apiFetch('/escrow/fund-milestone', {
      method : 'POST',
      body   : JSON.stringify({ milestoneId, flwReference: paymentRef })
    }),

  releaseMilestone: async (milestoneId) =>
    apiFetch('/escrow/release-milestone', {
      method : 'POST',
      body   : JSON.stringify({ milestoneId })
    }),

  fundOrder: async (orderId, paymentRef) =>
    apiFetch('/escrow/fund-order', {
      method : 'POST',
      body   : JSON.stringify({ orderId, flwReference: paymentRef })
    }),

  releaseOrder: async (orderId) =>
    apiFetch('/escrow/release-order', {
      method : 'POST',
      body   : JSON.stringify({ orderId })
    }),

  getSummary: async (projectId) => apiFetch(`/escrow/summary/${projectId}`)
};

// ═══════════════════════════════════════════
//  SUPPLIER API
// ═══════════════════════════════════════════
const SupplierAPI = {

  getDashboard: async () => apiFetch('/supplier/dashboard'),

  getInventory: async () => apiFetch('/supplier/inventory'),

  addInventoryItem: async (data) => apiFetch('/supplier/inventory', {
    method : 'POST',
    body   : JSON.stringify(data)
  }),

  markDispatched: async (orderId) =>
    apiFetch(`/supplier/orders/${orderId}/dispatch`, { method: 'PATCH' }),

  markDelivered: async (orderId) =>
    apiFetch(`/supplier/orders/${orderId}/delivered`, { method: 'PATCH' })
};

// ═══════════════════════════════════════════
//  ENGINEER API
// ═══════════════════════════════════════════
const EngineerAPI = {

  getDashboard: async () => apiFetch('/engineer/dashboard'),

  applyForLoan: async (data) => apiFetch('/engineer/loan', {
    method : 'POST',
    body   : JSON.stringify(data)
  })
};

// ═══════════════════════════════════════════
//  NOTIFICATIONS API
// ═══════════════════════════════════════════
const NotificationsAPI = {

  getAll: async () => apiFetch('/client/notifications'),

  markRead: async (id) =>
    apiFetch(`/client/notifications/${id}/read`, { method: 'PATCH' })
};

// ═══════════════════════════════════════════
//  ARBITRATION API
// ═══════════════════════════════════════════
const ArbitrationAPI = {

  file: async (data) => apiFetch('/arbitration', {
    method : 'POST',
    body   : JSON.stringify(data)
  }),

  getMyCases: async () => apiFetch('/arbitration/my')
};

// ═══════════════════════════════════════════
//  CCTV API
// ═══════════════════════════════════════════
const CCTVAPI = {
  getCameras: async (projectId) => apiFetch(`/cctv/${projectId}/cameras`),
  getReports: async (projectId) => apiFetch(`/cctv/${projectId}/reports`),
  triggerAnalysis: async (projectId, imageUrl, milestoneId = null) => apiFetch(`/cctv/${projectId}/analyze`, {
    method : 'POST',
    body   : JSON.stringify({ imageUrl, milestoneId })
  })
};

// ═══════════════════════════════════════════
//  ADMIN API
// ═══════════════════════════════════════════
const AdminAPI = {
  getStats: async () => apiFetch('/admin/stats'),

  getPendingReviews: async () => apiFetch('/admin/pending-reviews'),

  approveUser: async (id) => apiFetch(`/admin/users/${id}/approve`, {
    method: 'PATCH'
  }),

  suspendUser: async (id, reason) => apiFetch(`/admin/users/${id}/suspend`, {
    method : 'PATCH',
    body   : JSON.stringify({ reason })
  }),

  onboardLawyer: async (data) => apiFetch('/admin/onboard-lawyer', {
    method : 'POST',
    body   : JSON.stringify(data)
  }),

  getArbitrations: async () => apiFetch('/admin/arbitrations'),

  assignLawyer: async (caseId, lawyerId) => apiFetch(`/admin/arbitrations/${caseId}/assign-lawyer`, {
    method : 'PATCH',
    body   : JSON.stringify({ lawyerId })
  }),

  getAuditLog: async () => apiFetch('/admin/audit-log')
};

// ═══════════════════════════════════════════
//  LAWYER API
// ═══════════════════════════════════════════
const LawyerAPI = {

  getDashboard: async () => apiFetch('/lawyer/dashboard'),

  issueLandVerdict: async (verificationId, data) =>
    apiFetch(`/lawyer/land/${verificationId}/verdict`, {
      method : 'PATCH',
      body   : JSON.stringify(data)
    }),

  draftContract: async (data) => apiFetch('/lawyer/contract', {
    method : 'POST',
    body   : JSON.stringify(data)
  }),

  scheduleHearing: async (caseId, hearingDate) =>
    apiFetch(`/lawyer/arbitration/${caseId}/schedule`, {
      method : 'PATCH',
      body   : JSON.stringify({ hearingDate })
    }),

  issueRuling: async (caseId, ruling) =>
    apiFetch(`/lawyer/arbitration/${caseId}/ruling`, {
      method : 'PATCH',
      body   : JSON.stringify({ ruling })
    })
};

// ═══════════════════════════════════════════
//  UI HELPERS — wire API calls to the prototype DOM
// ═══════════════════════════════════════════

// ── Build FormData from a multi-step registration state object ──
function buildRegFormData(fields, files) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach(item => fd.append(k + '[]', item));
    } else {
      fd.append(k, v);
    }
  });
  if (files) {
    Object.entries(files).forEach(([fieldname, file]) => {
      if (file) fd.append(fieldname, file);
    });
  }
  return fd;
}

// ── Show toast (works with the prototype's existing showToast fn) ──
function apiToast(msg, type = 'info') {
  if (typeof showToast === 'function') showToast(msg, type);
  else console.log(`[${type.toUpperCase()}] ${msg}`);
}

// ── Guard: redirect to login if not authenticated ──
function requireAuth(role) {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/';
    return false;
  }
  const user = Auth.getUser();
  if (role && user?.role !== role && user?.role !== 'admin') {
    apiToast('Access denied.', 'error');
    window.location.href = '/';
    return false;
  }
  return true;
}

// ── Populate sidebar with real user data ──
function populateSidebar(user) {
  if (!user) return;
  const nameEl   = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.avatar');
  const roleEl   = document.querySelector('.user-role');

  if (nameEl)   nameEl.textContent   = `${user.firstName} ${user.lastName}`;
  if (avatarEl) avatarEl.textContent = user.firstName?.charAt(0).toUpperCase() || '?';
  if (roleEl)   roleEl.textContent   = {
    client   : 'Property Owner',
    engineer : 'Civil Engineer',
    supplier : 'Material Supplier',
    lawyer   : 'Platform Lawyer',
    admin    : 'Administrator'
  }[user.role] || user.role;
}

// ── Format kobo to Naira string ──
function formatNaira(kobo) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

// ── Format date ──
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Export everything (if using modules) or expose globally
if (typeof module !== 'undefined') {
  module.exports = {
    Auth, AuthAPI, ProjectAPI, EscrowAPI, SupplierAPI,
    EngineerAPI, NotificationsAPI, ArbitrationAPI, CCTVAPI,
    buildRegFormData, apiToast, requireAuth, populateSidebar,
    formatNaira, formatDate
  };
} else {
  // Browser global
  window.VistruAPI = {
    Auth, AuthAPI, ProjectAPI, EscrowAPI, SupplierAPI,
    EngineerAPI, NotificationsAPI, ArbitrationAPI, CCTVAPI, AdminAPI, LawyerAPI,
    buildRegFormData, apiToast, requireAuth, populateSidebar,
    formatNaira, formatDate
  };
}
