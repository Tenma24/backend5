

const API_URL = window.location.origin + '/api';


let currencyRates = null;
let currentCurrency = localStorage.getItem('currency') || 'KZT';

// Fetch currency rates from API
async function fetchCurrencyRates() {
  try {
    const data = await apiCall('/currency/rates');
    currencyRates = data.rates;
    return data.rates;
  } catch (error) {
    console.error('Failed to fetch currency rates:', error);
    // Fallback rates
    currencyRates = { KZT: 1, USD: 0.0021, EUR: 0.0020, RUB: 0.21 };
    return currencyRates;
  }
}

// Set active currency
function setCurrency(currency) {
  currentCurrency = currency;
  localStorage.setItem('currency', currency);
  
  // Update all prices on page
  document.querySelectorAll('[data-price]').forEach(el => {
    const basePrice = parseFloat(el.dataset.price);
    el.textContent = formatPrice(basePrice, currency);
  });
  
  // Update currency selector if exists
  const selector = document.getElementById('currencySelector');
  if (selector) selector.value = currency;
}

// Get current currency
function getCurrency() {
  return currentCurrency;
}


function getAuth() {
  return {
    token: localStorage.getItem('token') || '',
    role: localStorage.getItem('role') || '',
    email: localStorage.getItem('email') || '',
  };
}

function setAuth({ token, role, email }) {
  localStorage.setItem('token', token || '');
  localStorage.setItem('role', role || '');
  localStorage.setItem('email', email || '');
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('email');
}

function isLoggedIn() {
  const { token } = getAuth();
  return Boolean(token);
}

function isAdmin() {
  const { role } = getAuth();
  return role === 'admin';
}

function authHeaders(extra = {}) {
  const { token } = getAuth();
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function requireAuth(redirectTo = '/login.html') {
  if (!isLoggedIn()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

function requireAdmin(redirectTo = '/index.html') {
  if (!isAdmin()) {
    showToast('Admin access required', 'error');
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1500);
    return false;
  }
  return true;
}


async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(API_URL + endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}


function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) {
    // Create toast if doesn't exist
    const toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  
  const toastElement = document.getElementById('toast');
  toastElement.textContent = message;
  toastElement.className = `toast ${type} show`;

  setTimeout(() => {
    toastElement.className = 'toast';
  }, 3000);
}

function showLoading() {
  const existing = document.querySelector('.loading-overlay');
  if (existing) return;

  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatPrice(price, currency = null) {
  if (typeof price !== 'number' || isNaN(price)) return '—';
  
  const curr = currency || currentCurrency;
  
  const symbols = {
    KZT: '₸',
    USD: '$',
    EUR: '€',
    RUB: '₽'
  };
  
  let amount = price;
  
  if (curr !== 'KZT' && currencyRates && currencyRates[curr]) {
    amount = price * currencyRates[curr];
  }
  
  const formatted = amount.toLocaleString('ru-RU', {
    minimumFractionDigits: curr === 'KZT' ? 0 : 2,
    maximumFractionDigits: curr === 'KZT' ? 0 : 2
  });
  
  return `${symbols[curr] || ''}${formatted}`;
}

function renderStars(rating) {
  const full = '⭐'.repeat(Math.floor(rating));
  return full || '—';
}

function updateNavbar() {
  const auth = getAuth();
  const navAuth = document.querySelector('.nav-auth');
  
  if (!navAuth) return;

  if (auth.email) {
    navAuth.innerHTML = `
      <span class="badge badge-primary">${escapeHtml(auth.email)} (${auth.role})</span>
      ${auth.role === 'admin' ? '<a href="/admin.html" class="nav-link">Admin</a>' : ''}
      <a href="/profile.html" class="nav-link">Profile</a>
      <button onclick="logout()" class="btn btn-sm btn-danger">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="/login.html" class="nav-link">Login</a>
      <a href="/register.html" class="btn btn-sm btn-primary">Sign Up</a>
    `;
  }
}

function logout() {
  clearAuth();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/index.html';
  }, 1000);
}

// Toggle mobile menu
function toggleMobileMenu() {
  const navbarNav = document.querySelector('.navbar-nav');
  if (navbarNav) {
    navbarNav.classList.toggle('active');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Update navbar on every page
  updateNavbar();

  await fetchCurrencyRates();

  // Mobile menu toggle
  const navToggle = document.querySelector('.navbar-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', toggleMobileMenu);
  }

  document.addEventListener('click', (e) => {
    const navbar = document.querySelector('.navbar');
    const navbarNav = document.querySelector('.navbar-nav');
    if (navbar && navbarNav && !navbar.contains(e.target)) {
      navbarNav.classList.remove('active');
    }
  });
});