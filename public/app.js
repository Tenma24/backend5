const listEl = document.getElementById("list");
const toastEl = document.getElementById("toast");

const statTotal = document.getElementById("statTotal");
const statSync = document.getElementById("statSync");

const authStatus = document.getElementById("authStatus");
const logoutBtn = document.getElementById("logoutBtn");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");

const loadBtn = document.getElementById("loadBtn");

// Car form fields
const f = (id) => document.getElementById(id);
const carForm = {
  brand: f("brand"),
  model: f("model"),
  year: f("year"),
  price: f("price"),
  mileage: f("mileage"),
  color: f("color"),
  transmission: f("transmission"),
  fuel: f("fuel"),
  description: f("description"),
};

// Review form fields
const reviewForm = {
  carId: f("reviewCarId"),
  rating: f("reviewRating"),
  comment: f("reviewComment"),
};

// Modal
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const editIdEl = document.getElementById("editId");

const e = {
  brand: f("e_brand"),
  model: f("e_model"),
  year: f("e_year"),
  price: f("e_price"),
  mileage: f("e_mileage"),
  color: f("e_color"),
  transmission: f("e_transmission"),
  fuel: f("e_fuel"),
  description: f("e_description"),
};

let carsCache = [];
let reviewsCache = [];
let editingId = null;

// ---------- AUTH helpers ----------
function getAuth() {
  return {
    token: localStorage.getItem("token") || "",
    role: localStorage.getItem("role") || "",
    email: localStorage.getItem("email") || "",
  };
}

function setAuth({ token, role, email }) {
  localStorage.setItem("token", token || "");
  localStorage.setItem("role", role || "");
  localStorage.setItem("email", email || "");
  refreshAuthUI();
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("email");
  refreshAuthUI();
}

function isLoggedIn() {
  const { token } = getAuth();
  return Boolean(token);
}

function isAdmin() {
  const { role } = getAuth();
  return role === "admin";
}

function authHeaders(extra = {}) {
  const { token } = getAuth();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function refreshAuthUI() {
  const { email, role } = getAuth();
  if (!email) {
    authStatus.textContent = "Guest";
    logoutBtn.style.display = "none";
    return;
  }
  authStatus.textContent = `${email} (${role || "user"})`;
  logoutBtn.style.display = "inline-block";
}

// ---------- INIT ----------
init();

function init() {
  loadBtn.addEventListener("click", loadData);
  f("addCarBtn").addEventListener("click", addCar);
  f("clearCarBtn").addEventListener("click", clearCarForm);
  f("addReviewBtn").addEventListener("click", addReview);
  f("clearReviewBtn").addEventListener("click", clearReviewForm);

  searchEl.addEventListener("input", render);
  sortEl.addEventListener("change", render);

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (ev) => {
    if (ev.target === modalOverlay) closeModal();
  });

  saveBtn.addEventListener("click", saveEdit);
  deleteBtn.addEventListener("click", deleteCurrent);

  loginBtn.addEventListener("click", login);
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    showToast("Logged out", "good");
  });

  // Tab switching
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tabContent").forEach(tc => tc.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(targetTab + "Tab").classList.add("active");
    });
  });

  refreshAuthUI();
  loadData();
}

// ---------- UI helpers ----------
function showToast(msg, type = "good") {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.className = "toast";
  }, 2600);
}

function moneyKZT(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("ru-RU") + " ₸";
}

function toNumberOrNull(value) {
  const v = String(value ?? "").trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function readCarFromForm(src) {
  const brand = String(src.brand.value ?? "").trim();
  const model = String(src.model.value ?? "").trim();
  const year = Number(String(src.year.value ?? "").trim());
  const price = Number(String(src.price.value ?? "").trim());

  const mileage = toNumberOrNull(src.mileage.value);
  const color = String(src.color.value ?? "").trim();
  const transmission = String(src.transmission.value ?? "").trim();
  const fuel = String(src.fuel.value ?? "").trim();
  const description = String(src.description.value ?? "").trim();

  return { brand, model, year, price, mileage, color, transmission, fuel, description };
}

function validateCarLocal(car) {
  const errors = [];
  if (!car.brand) errors.push("brand is required");
  if (!car.model) errors.push("model is required");
  if (!Number.isFinite(car.year)) errors.push("year must be a number");
  if (!Number.isFinite(car.price)) errors.push("price must be a number");
  return errors;
}

function clearCarForm() {
  for (const k of Object.keys(carForm)) carForm[k].value = "";
  showToast("Car form cleared", "good");
}

function clearReviewForm() {
  for (const k of Object.keys(reviewForm)) reviewForm[k].value = "";
  showToast("Review form cleared", "good");
}

function renderStars(rating) {
  const full = "⭐".repeat(Math.floor(rating));
  return full || "—";
}

// ---------- API ----------
async function loadData() {
  listEl.innerHTML = `<div class="chip">Loading...</div>`;

  try {
    // Load cars
    const carsRes = await fetch("/api/cars");
    const carsData = await carsRes.json();

    if (!carsRes.ok) {
      listEl.innerHTML = "";
      showToast(carsData?.error || "Failed to load cars", "bad");
      return;
    }

    carsCache = carsData.cars || [];

    // Load reviews
    const reviewsRes = await fetch("/api/reviews");
    const reviewsData = await reviewsRes.json();
    
    if (reviewsRes.ok) {
      reviewsCache = reviewsData.reviews || [];
    } else {
      reviewsCache = [];
    }

    statTotal.textContent = String(carsData.count ?? carsCache.length);
    statSync.textContent = new Date().toLocaleTimeString();

    render();
    showToast("Data loaded", "good");
  } catch (err) {
    listEl.innerHTML = "";
    showToast("Network error while loading", "bad");
  }
}

async function login() {
  const email = String(loginEmail.value || "").trim();
  const password = String(loginPassword.value || "").trim();

  if (!email || !password) {
    showToast("Enter email and password", "bad");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data?.error || "Login failed", "bad");
      return;
    }

    setAuth({ token: data.token, role: data.role, email });
    showToast("Login success", "good");
  } catch {
    showToast("Network error while login", "bad");
  }
}

async function addCar() {
  if (!isLoggedIn()) {
    showToast("Login first (admin token needed)", "bad");
    return;
  }
  if (!isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }

  const car = readCarFromForm(carForm);
  const errors = validateCarLocal(car);
  if (errors.length) {
    showToast(errors.join(", "), "bad");
    return;
  }

  try {
    const res = await fetch("/api/cars", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(car),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.details ? data.details.join(", ") : (data?.error || "Failed to add");
      showToast(msg, "bad");
      return;
    }

    clearCarForm();
    await loadData();
    showToast("Car added successfully", "good");
  } catch {
    showToast("Network error while adding", "bad");
  }
}

async function addReview() {
  if (!isLoggedIn()) {
    showToast("Login first (admin token needed)", "bad");
    return;
  }
  if (!isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }

  const carId = String(reviewForm.carId.value || "").trim();
  const rating = Number(reviewForm.rating.value);
  const comment = String(reviewForm.comment.value || "").trim();

  if (!carId) {
    showToast("Car ID is required", "bad");
    return;
  }
  if (!rating || rating < 1 || rating > 5) {
    showToast("Rating must be 1-5", "bad");
    return;
  }
  if (!comment || comment.length < 2) {
    showToast("Comment must be at least 2 characters", "bad");
    return;
  }

  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ carId, rating, comment }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.details ? data.details.join(", ") : (data?.error || "Failed to add review");
      showToast(msg, "bad");
      return;
    }

    clearReviewForm();
    await loadData();
    showToast("Review added successfully", "good");
  } catch {
    showToast("Network error while adding review", "bad");
  }
}

// ---------- render ----------
function filteredAndSortedCars() {
  const q = String(searchEl.value ?? "").trim().toLowerCase();
  let arr = [...carsCache];

  if (q) {
    arr = arr.filter(c => {
      const text = `${c.brand} ${c.model} ${c.year} ${c.color} ${c.fuel} ${c.transmission} ${c.description}`.toLowerCase();
      return text.includes(q);
    });
  }

  const sort = sortEl.value;
  arr.sort((a, b) => {
    const pa = Number(a.price ?? 0);
    const pb = Number(b.price ?? 0);
    const ya = Number(a.year ?? 0);
    const yb = Number(b.year ?? 0);
    const ca = new Date(a.createdAt ?? 0).getTime();
    const cb = new Date(b.createdAt ?? 0).getTime();

    switch (sort) {
      case "priceAsc": return pa - pb;
      case "priceDesc": return pb - pa;
      case "yearAsc": return ya - yb;
      case "yearDesc": return yb - ya;
      case "new":
      default: return cb - ca;
    }
  });

  return arr;
}

function getReviewsForCar(carId) {
  return reviewsCache.filter(r => String(r.carId) === String(carId) || String(r.carId?._id) === String(carId));
}

function render() {
  const arr = filteredAndSortedCars();

  if (arr.length === 0) {
    listEl.innerHTML = `<div class="chip">No cars found.</div>`;
    return;
  }

  listEl.innerHTML = "";

  for (const c of arr) {
    const title = `${escapeHtml(c.brand || "—")} ${escapeHtml(c.model || "—")} (${escapeHtml(String(c.year ?? "—"))})`;
    const price = moneyKZT(Number(c.price));

    const mileage = (c.mileage === null || c.mileage === undefined) ? "—" : `${Number(c.mileage).toLocaleString("ru-RU")} km`;
    const color = c.color ? escapeHtml(c.color) : "—";
    const fuel = c.fuel ? escapeHtml(c.fuel) : "—";
    const tr = c.transmission ? escapeHtml(c.transmission) : "—";

    const desc = c.description ? escapeHtml(c.description) : "";

    // Get reviews for this car
    const carReviews = getReviewsForCar(c._id);

    const el = document.createElement("div");
    el.className = "card";

    let reviewsHtml = '';
    if (carReviews.length > 0) {
      reviewsHtml = `
        <div class="reviewsSection">
          <div class="reviewsTitle">Reviews (${carReviews.length}):</div>
          ${carReviews.map(r => `
            <div class="review">
              <div class="reviewHeader">
                <span class="stars">${renderStars(r.rating)}</span>
                <span class="chip">${r.rating}/5</span>
              </div>
              <div class="reviewComment">${escapeHtml(r.comment || "")}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      reviewsHtml = `
        <div class="reviewsSection">
          <div class="noReviews">No reviews yet</div>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="cardTop">
        <div>
          <h3 class="title">${title}</h3>
          <p class="subtitle">${mileage} • ${color} • ${tr} • ${fuel}</p>
        </div>
        <div class="price">${price}</div>
      </div>

      <div class="chips">
        <span class="chip">ID: ${escapeHtml(String(c._id))}</span>
        <span class="chip">Created: ${c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</span>
      </div>

      ${desc ? `<div class="subtitle">${desc}</div>` : ""}

      ${reviewsHtml}

      <div class="cardBtns">
        <button class="btn btnSmall" data-action="edit" data-id="${c._id}">Edit Car</button>
        <button class="btn btnSmall btnDanger" data-action="delete" data-id="${c._id}">Delete Car</button>
      </div>
    `;

    el.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;

      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "edit") openModalForCar(id);
      if (action === "delete") quickDelete(id);
    });

    listEl.appendChild(el);
  }
}

function openModalForCar(id) {
  if (!isLoggedIn()) {
    showToast("Login first (admin token needed)", "bad");
    return;
  }
  if (!isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }

  const car = carsCache.find(x => String(x._id) === String(id));
  if (!car) {
    showToast("Car not found in UI cache. Refresh first.", "bad");
    return;
  }

  editingId = String(id);
  editIdEl.textContent = editingId;

  e.brand.value = car.brand ?? "";
  e.model.value = car.model ?? "";
  e.year.value = car.year ?? "";
  e.price.value = car.price ?? "";
  e.mileage.value = car.mileage ?? "";
  e.color.value = car.color ?? "";
  e.transmission.value = car.transmission ?? "";
  e.fuel.value = car.fuel ?? "";
  e.description.value = car.description ?? "";

  modalOverlay.classList.add("show");
}

function closeModal() {
  modalOverlay.classList.remove("show");
  editingId = null;
}

async function saveEdit() {
  if (!editingId) return;
  if (!isLoggedIn() || !isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }

  const car = readCarFromForm({
    brand: e.brand, model: e.model, year: e.year, price: e.price,
    mileage: e.mileage, color: e.color, transmission: e.transmission, fuel: e.fuel,
    description: e.description
  });

  const errors = validateCarLocal(car);
  if (errors.length) {
    showToast(errors.join(", "), "bad");
    return;
  }

  try {
    const res = await fetch(`/api/cars/${editingId}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(car),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.details ? data.details.join(", ") : (data?.error || "Failed to update");
      showToast(msg, "bad");
      return;
    }

    closeModal();
    await loadData();
    showToast("Car updated", "good");
  } catch {
    showToast("Network error while updating", "bad");
  }
}

async function deleteCurrent() {
  if (!editingId) return;
  if (!isLoggedIn() || !isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }
  const ok = confirm("Delete this car? This cannot be undone.");
  if (!ok) return;
  await doDelete(editingId);
  closeModal();
}

async function quickDelete(id) {
  if (!isLoggedIn() || !isAdmin()) {
    showToast("Forbidden: admin only", "bad");
    return;
  }
  const ok = confirm("Delete this car? This cannot be undone.");
  if (!ok) return;
  await doDelete(id);
}

async function doDelete(id) {
  try {
    const res = await fetch(`/api/cars/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data?.error || "Failed to delete", "bad");
      return;
    }

    await loadData();
    showToast("Car deleted", "good");
  } catch {
    showToast("Network error while deleting", "bad");
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}