// ═══════════════════════════════════════════════════════════
//  VISTRU — Utility Functions
//  frontend/js/utils.js
// ═══════════════════════════════════════════════════════════

// ── Toast notifications ──
function showToast(message, type = 'info') {
  const existing = document.getElementById('vistru-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'vistru-toast';
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4500);
}

// ── Format Naira ──
function formatNaira(kobo) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

// ── Format date ──
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Format relative time ──
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return formatDate(iso);
}

// ── Show/hide form errors ──
function showErr(id, message) {
  const input = document.getElementById(id);
  const err   = document.getElementById('err-' + id);
  if (input) input.classList.add('error');
  if (err)   { if (message) err.textContent = message; err.classList.add('show'); }
}
function clearErr(id) {
  const input = document.getElementById(id);
  const err   = document.getElementById('err-' + id);
  if (input) input.classList.remove('error');
  if (err)   err.classList.remove('show');
}
function clearAllErrors() {
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error.show').forEach(el => el.classList.remove('show'));
}

// ── Toggle password visibility ──
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const show  = input.type === 'password';
  input.type      = show ? 'text' : 'password';
  btn.textContent = show ? 'Hide'  : 'Show';
}

// ── Password strength ──
function checkPwStrength(pw, barPrefix, hintId) {
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const cls    = ['', 'weak', 'medium', 'medium', 'strong'];
  const labels = ['Use 8+ characters, uppercase, numbers and symbols', 'Weak — add numbers & symbols', 'Fair — add uppercase or symbols', 'Good — almost there!', 'Strong password ✓'];
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(barPrefix + i);
    if (bar) bar.className = 'pw-bar' + (i <= score ? ' ' + cls[score] : '');
  }
  const hint = document.getElementById(hintId);
  if (hint) {
    hint.textContent = labels[score];
    hint.style.color = score >= 4 ? 'var(--green)' : score >= 3 ? 'var(--gold)' : score >= 1 ? 'var(--red)' : 'var(--slate)';
  }
  return score;
}

// ── OTP box auto-advance ──
function otpMove(el, nextId) {
  if (el.value && nextId) {
    const next = document.getElementById(nextId);
    if (next) next.focus();
  }
}
function otpBack(e, prevId, el) {
  if (e.key === 'Backspace' && !el.value && prevId) {
    const prev = document.getElementById(prevId);
    if (prev) prev.focus();
  }
}
function getOTPValue(prefix, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const el = document.getElementById(`${prefix}-${i + 1}`);
    return el ? el.value : '';
  }).join('');
}
function shakeOTPBoxes(prefix, count = 6) {
  for (let i = 1; i <= count; i++) {
    const el = document.getElementById(`${prefix}-${i}`);
    if (el) { el.classList.add('error'); setTimeout(() => el.classList.remove('error'), 600); }
  }
}

// ── File preview ──
function previewFile(inputId, previewId, nameId, errorId) {
  const input = document.getElementById(inputId);
  if (!input || !input.files.length) return;
  const file = input.files[0];
  const nameEl = document.getElementById(nameId);
  const prevEl = document.getElementById(previewId);
  if (nameEl) nameEl.textContent = file.name;
  if (prevEl) prevEl.style.display = 'flex';
  if (errorId) clearErr(errorId);
}

// ── Set button loading state ──
function setLoading(btnId, loading, loadingText = 'Please wait...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ── Get URL params ──
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── Validate email ──
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Age check ──
function isAtLeast18(dateStr) {
  const age = (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 18;
}

// ── Set max DOB to 18 years ago ──
function setDOBMax(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  el.max = d.toISOString().split('T')[0];
}

// ── Guard: redirect if not authenticated ──
function requireAuth(requiredRole) {
  if (typeof VistruAPI === 'undefined') return true;
  if (!VistruAPI.Auth.isLoggedIn()) {
    window.location.href = '/pages/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  if (requiredRole) {
    const user = VistruAPI.Auth.getUser();
    if (user && user.role !== requiredRole && user.role !== 'admin') {
      const dashMap = { client:'client', engineer:'engineer', supplier:'supplier', lawyer:'lawyer', admin:'admin' };
      window.location.href = `/pages/${dashMap[user.role] || 'auth/login'}/dashboard.html`;
      return false;
    }
  }
  return true;
}

// ── Populate sidebar with user info ──
function populateSidebar(user) {
  if (!user) return;
  const nameEl   = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.avatar');
  const roleEl   = document.querySelector('.user-role');
  const roleMap  = { client:'Property Owner', engineer:'Civil Engineer', supplier:'Material Supplier', lawyer:'Platform Lawyer', admin:'Administrator' };
  if (nameEl)   nameEl.textContent   = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
  if (avatarEl) avatarEl.textContent = (user.firstName || user.first_name || '?').charAt(0).toUpperCase();
  if (roleEl)   roleEl.textContent   = roleMap[user.role] || user.role;
}

// ── Spec / category card toggle ──
function toggleCard(label) {
  const cb = label.querySelector('input[type="checkbox"]');
  setTimeout(() => {
    label.style.borderColor = cb.checked ? 'var(--gold)'     : 'var(--border)';
    label.style.background  = cb.checked ? 'var(--gold-pale)': '';
    label.style.fontWeight  = cb.checked ? '600'             : '400';
  }, 10);
}
