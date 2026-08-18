const backend = window.SmartBusBackend || window.PicTroBackend;
const routes = backend ? backend.getRoutes() : [
  { code: "B12", name: "East Legon → Circle", eta: "2 min", meta: "Accra Mall · 8 stops", fare: "GH₵ 7.00", seats: "14 seats" },
  { code: "A04", name: "Madina → 37 Station", eta: "6 min", meta: "Legon · 11 stops", fare: "GH₵ 6.50", seats: "8 seats" },
  { code: "C21", name: "Kasoa → Accra Central", eta: "11 min", meta: "Kaneshie · 13 stops", fare: "GH₵ 9.00", seats: "21 seats" },
];

const app = document.querySelector("#app-main");
const modalBackdrop = document.querySelector("#modal-backdrop");
const modalContent = document.querySelector("#modal-content");
const toast = document.querySelector("#toast");
let toastTimer;
let isAuthenticated = Boolean(backend && backend.isAuthenticated());

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

function getCurrentUser() {
  return backend && typeof backend.getCurrentUser === "function" ? backend.getCurrentUser() : null;
}

function getUserInitials(name = "AK") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AK";
}

function getRoleLabel(role = "PASSENGER") {
  const normalized = String(role || "PASSENGER").toUpperCase();
  if (normalized === "MANAGER" || normalized === "ADMIN") return "Management account";
  if (normalized === "DRIVER" || normalized === "MATE") return "Driver / mate account";
  return "Passenger account";
}

function getDashboardViewForUser(user) {
  if (!user) return "welcome";
  const role = String(user.role || "PASSENGER").toUpperCase();
  if (role === "DRIVER" || role === "MATE") return "staff";
  if (role === "MANAGER" || role === "ADMIN") return "manage";
  return "home";
}

function getAllowedViewsForUser(user) {
  if (!user) return new Set(["welcome", "login", "signup"]);
  const role = String(user.role || "PASSENGER").toUpperCase();
  if (role === "DRIVER" || role === "MATE") return new Set(["staff", "track", "details", "welcome", "login", "signup"]);
  if (role === "MANAGER" || role === "ADMIN") return new Set(["manage", "welcome", "login", "signup"]);
  return new Set(["home", "track", "details", "pass", "wallet", "activity", "welcome", "login", "signup"]);
}

function applyRoleNavVisibility() {
  const user = getCurrentUser();
  const allowed = getAllowedViewsForUser(user);
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((button) => {
    const view = button.dataset.view;
    const visible = view ? allowed.has(view) : true;
    button.hidden = !visible;
  });
}

function updateProfileCard() {
  const profileButton = document.querySelector(".account-menu-button");
  if (!profileButton) return;

  const user = getCurrentUser();
  const strong = profileButton.querySelector("strong");
  const roleLabel = profileButton.querySelector("span");
  const avatar = profileButton.querySelector(".avatar");
  if (!strong || !roleLabel || !avatar) return;

  if (user) {
    strong.textContent = user.fullName || "Akosua K.";
    roleLabel.textContent = getRoleLabel(user.role);
    avatar.textContent = getUserInitials(user.fullName);
  } else {
    strong.textContent = "Akosua K.";
    roleLabel.textContent = "Passenger account";
    avatar.textContent = "AK";
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function openModal(content) {
  modalContent.innerHTML = content;
  modalContent.removeAttribute("data-route");
  modalContent.removeAttribute("data-method");
  modalContent.removeAttribute("data-pass-name");
  modalBackdrop.hidden = false;
  modalBackdrop.querySelector("button, input, select")?.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  modalContent.removeAttribute("data-route");
  modalContent.removeAttribute("data-method");
  modalContent.removeAttribute("data-pass-name");
}

function routeCards(list = routes) {
  return list.map((route) => `
    <article class="route-card">
      <div class="route-code">${route.code}</div>
      <div>
        <p class="route-name">${route.name}</p>
        <span class="route-meta">${route.meta} · ${Number(route.seats || 0)} seats</span>
      </div>
      <div class="route-right"><strong>${route.eta}</strong><span>GH₵ ${Number(route.fare || route.price || 0).toFixed(2)}</span></div>
      <button class="track-button" data-track="${route.code}">Track</button>
    </article>`).join("");
}

function renderAccraMap() {
  return `
    <div class="real-map-wrap">
      <div class="live-route-map" data-live-map="B12" aria-label="Live route map"></div>
    </div>
  `;
}

function initLiveRouteMap() {
  if (!window.L) return;

  const mapNode = document.querySelector("[data-live-map]");
  if (!mapNode || mapNode.dataset.initialized === "true") return;

  const routeCode = mapNode.dataset.liveMap || "B12";
  const route = backend.getRouteByCode(routeCode) || { code: routeCode, origin: "East Legon", destination: "Circle", name: "East Legon → Circle" };
  const originPoint = String(route.origin || "East Legon").trim();
  const destinationPoint = String(route.destination || "Circle").trim();
  const routeProgress = [
    [5.6091, -0.1774],
    [5.6112, -0.1760],
    [5.6098, -0.1727],
    [5.6079, -0.1841],
    [5.6038, -0.1870]
  ];
  const stopLocations = [
    { name: "East Legon", coords: [5.6091, -0.1774] },
    { name: "Accra Mall", coords: [5.6062, -0.1786] },
    { name: "37 Station", coords: [5.6051, -0.1824] },
    { name: "Circle", coords: [5.6038, -0.1870] }
  ];
  const currentUser = getCurrentUser();
  const role = currentUser ? String(currentUser.role || "PASSENGER").toUpperCase() : "PASSENGER";
  const vehicleList = Array.isArray(backend.getVehicles) ? backend.getVehicles() : [];

  const map = L.map(mapNode, { zoomControl: true, attributionControl: true }).setView([5.6072, -0.1818], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const routeLine = L.polyline(routeProgress, {
    color: "#0b7a61",
    weight: 6,
    opacity: 0.9,
    dashArray: "10 12"
  }).addTo(map);

  stopLocations.forEach((stop) => {
    L.circleMarker(stop.coords, {
      radius: 7,
      color: role === "PASSENGER" ? "#1987ff" : "#f2a65a",
      fillColor: role === "PASSENGER" ? "#1987ff" : "#f2a65a",
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map).bindPopup(`<strong>${escapeHTML(stop.name)}</strong><br />Passenger stop`);
  });

  if (vehicleList.length) {
    vehicleList.forEach((vehicle) => {
      const marker = L.marker([Number(vehicle.currentLat || 5.6072), Number(vehicle.currentLng || -0.1818)]).addTo(map);
      marker.bindPopup(`<strong>${escapeHTML(vehicle.plate)}</strong><br />${escapeHTML(vehicle.model)}<br />Driver: ${escapeHTML(vehicle.driverName)}<br />${escapeHTML(vehicle.origin)} → ${escapeHTML(vehicle.destination)}`);
    });
  }

  const originMarker = L.marker([5.6091, -0.1774]).addTo(map)
    .bindPopup(`<strong>${escapeHTML(originPoint)}</strong><br />Pickup point`);
  const destinationMarker = L.marker([5.6038, -0.1870]).addTo(map)
    .bindPopup(`<strong>${escapeHTML(destinationPoint)}</strong><br />Drop-off point`);

  const liveMarker = L.circleMarker([routeProgress[0][0], routeProgress[0][1]], {
    radius: 12,
    color: "#ea6c5a",
    fillColor: "#ea6c5a",
    fillOpacity: 0.9,
    weight: 3
  }).addTo(map);

  liveMarker.bindPopup(`<strong>PicTro ${escapeHTML(route.code)}</strong><br />${escapeHTML(originPoint)} → ${escapeHTML(destinationPoint)}`);
  map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
  mapNode.dataset.initialized = "true";

  let stepIndex = 0;
  const animateDriver = () => {
    stepIndex = (stepIndex + 1) % routeProgress.length;
    const [lat, lng] = routeProgress[stepIndex];
    liveMarker.setLatLng([lat, lng]);
    map.panTo([lat, lng], { animate: true, duration: 1.8 });
  };

  originMarker.addTo(map);
  destinationMarker.addTo(map);
  window.setInterval(animateDriver, 4000);
}

function ensureLiveMap() {
  if (document.querySelector("[data-live-map]") && typeof window !== "undefined") {
    window.setTimeout(initLiveRouteMap, 150);
  }
}

function validateProviderEmail(provider, email) {
  const providerName = String(provider || "Gmail").trim();
  const value = String(email || "").trim().toLowerCase();
  const checker = providerName.toLowerCase() === "gmail" ? /^[^\s@]+@gmail\.com$/i : providerName.toLowerCase() === "icloud" ? /^[^\s@]+@icloud\.com$/i : null;

  if (!value) return { ok: false, message: `Please enter a valid ${providerName} address.` };
  if (!checker || !checker.test(value)) return { ok: false, message: `Use a valid ${providerName} email ending in ${providerName.toLowerCase() === "gmail" ? "@gmail.com" : "@icloud.com"}.` };
  return { ok: true, email: value };
}

function openProviderAuth(provider) {
  const providerName = String(provider || "Gmail").trim();
  const domain = providerName.toLowerCase() === "gmail" ? "gmail.com" : "icloud.com";
  openModal(`
    <div class="account-menu-panel">
      <h2>Continue with ${providerName}</h2>
      <p>Choose a valid ${domain} email to sign in securely.</p>
      <div class="field">
        <label for="provider-email">${providerName} email</label>
        <input id="provider-email" type="email" placeholder="name@${domain}" value="" />
      </div>
      <button class="primary-button" type="button" data-provider-submit="${providerName}">Continue</button>
    </div>
  `);
  modalContent.dataset.provider = providerName;
}

function welcomeView() {
  return `
    <section class="auth-screen welcome-screen">
      <div class="auth-visual"><div class="auth-mark">P</div><span class="auth-brand">PicTro</span><p>Smarter travel across the city.</p><div class="auth-route"><i></i><i></i><i></i><i></i></div></div>
      <div class="auth-card">
        <span class="auth-kicker">PICTRO</span><h1>Move with confidence.</h1><p>Find buses, track routes, collect payments, and manage journeys in one connected system.</p>
        <button class="primary-button auth-primary" data-view="signup">Create an account</button>
        <button type="button" class="oauth-button gmail-button" data-signin-provider="Gmail"><span class="oauth-logo gmail-logo" aria-hidden="true">G</span> Continue with Gmail</button>
        <button type="button" class="oauth-button icloud-button" data-signin-provider="iCloud"><span class="oauth-logo icloud-logo" aria-hidden="true">☁</span> Continue with iCloud</button>
        <button type="button" class="email-button" data-view="login">Use email or phone</button>
        <div class="auth-divider"><span>Already have an account?</span></div>
        <button type="button" class="text-button auth-login" data-view="login">Log in to PicTro →</button>
      </div>
      <p class="auth-note">By continuing, you agree to the PicTro Terms and Privacy Policy.</p>
    </section>`;
}

function loginView() {
  return `
    <section class="auth-screen auth-form-screen">
      <div class="auth-card auth-form-card"><button type="button" class="back-link" data-view="welcome">← Back</button><div class="auth-mark compact">P</div><span class="auth-kicker">WELCOME BACK</span><h1>Log in to PicTro.</h1><p>Passenger, driver, mate, and management accounts all use the same secure system.</p>
        <form id="login-form" class="auth-form"><label>Email or phone<input id="login-identifier" name="identifier" required type="text" placeholder="driver@pictro.com or 055 123 4567" /></label><label>Password<input id="login-password" name="password" required type="password" placeholder="Enter your password" /></label><button class="primary-button" type="submit">Log in</button></form>
        <button type="button" class="oauth-button gmail-button" data-signin-provider="Gmail"><span class="oauth-logo gmail-logo" aria-hidden="true">G</span> Continue with Gmail</button>
        <button type="button" class="oauth-button icloud-button" data-signin-provider="iCloud"><span class="oauth-logo icloud-logo" aria-hidden="true">☁</span> Continue with iCloud</button>
        <button type="button" class="text-button auth-login" data-view="signup">New to PicTro? Create an account →</button>
      </div>
    </section>`;
}

function signupView() {
  return `
    <section class="auth-screen auth-form-screen">
      <div class="auth-card auth-form-card"><button type="button" class="back-link" data-view="welcome">← Back</button><div class="auth-mark compact">P</div><span class="auth-kicker">CREATE YOUR ACCOUNT</span><h1>Start moving smarter.</h1><p>Your PicTro account keeps your trips, fares, and service access in one place.</p>
        <form id="signup-form" class="auth-form"><label>Full name<input id="signup-name" name="fullName" required type="text" placeholder="Ama Serwaa" /></label><label>Phone number<input id="signup-phone" name="phone" required type="tel" placeholder="055 123 4567" /></label><label>Email address<input id="signup-email" name="email" required type="email" placeholder="ama@email.com" /></label><label>Account role<select name="role"><option value="PASSENGER">Passenger</option><option value="DRIVER">Driver</option><option value="MATE">Driver's mate</option><option value="MANAGER">Management</option></select></label><label>Create password<input id="signup-password" name="password" required type="password" placeholder="At least 8 characters" /></label><button class="primary-button" type="submit">Create account</button></form>
        <button type="button" class="oauth-button gmail-button" data-signin-provider="Gmail"><span class="oauth-logo gmail-logo" aria-hidden="true">G</span> Sign up with Gmail</button>
        <button type="button" class="oauth-button icloud-button" data-signin-provider="iCloud"><span class="oauth-logo icloud-logo" aria-hidden="true">☁</span> Sign up with iCloud</button>
        <button type="button" class="text-button auth-login" data-view="login">Already have an account? Log in →</button>
      </div>
    </section>`;
}

function homeView() {
  const user = getCurrentUser();
  const greetingName = user ? user.fullName.split(" ")[0] : "Akosua";

  return `
    <header class="topbar">
      <div><h1>Good morning, ${escapeHTML(greetingName)}.</h1><p>Where would you like to go today?</p></div>
      <div class="topbar-actions"><span class="location">⌖ Accra, Ghana</span><button class="icon-button" aria-label="Notifications">♧<i class="notification-dot"></i></button></div>
    </header>
    <section class="hero-grid">
      <section class="search-panel" aria-labelledby="journey-heading">
        <h2 id="journey-heading">Plan a smoother journey</h2>
        <p>Find a bus, compare arrivals, and travel with confidence.</p>
        <form class="journey-form" id="journey-form">
          <div class="field"><label for="from">From</label><input id="from" name="from" value="East Legon" autocomplete="off" /></div>
          <div class="field"><label for="to">To</label><input id="to" name="to" value="Circle" autocomplete="off" /></div>
          <div class="field"><label for="travel-time">When</label><select id="travel-time" name="when"><option>Leaving now</option><option>In 30 minutes</option><option>Later today</option></select></div>
          <button class="primary-button" type="submit">Find buses</button>
        </form>
        <div class="quick-links"><button class="quick-link" data-view="track">Live map</button><button class="quick-link" data-view="pass">Get a PicTro Pass</button><button class="quick-link" data-view="wallet">Pay a fare</button></div>
      </section>
      <section class="map-panel" aria-label="Live bus map preview">
        <div class="map-label"><span>Live around you</span><span class="live-badge">● LIVE</span></div>
        ${renderAccraMap()}
        <div class="map-callout"><div><b>B12 is approaching</b><span>East Legon · 2 minutes away</span></div><button data-track="B12">Track</button></div>
      </section>
    </section>
    <section class="content-grid">
      <section><div class="section-heading"><h2>Leaving soon</h2><button class="text-button" data-view="track">See all routes →</button></div><div class="route-list">${routeCards()}</div></section>
      <aside class="side-stack">
        <article class="pass-card"><p class="eyebrow">More freedom, less queueing</p><h3>PicTro Pass</h3><p>Your weekly travel companion starts at GH₵ 35.</p><button data-view="pass">View passes</button></article>
        <article class="stat-card"><h3>Your travel this month</h3><p>A little momentum goes a long way.</p><div class="stat-row"><span>Trips taken</span><b>18</b></div><div class="stat-row"><span>Time saved</span><b>2h 10m</b></div><div class="stat-row"><span>Monthly goal</span><b>68%</b></div><div class="progress"><span></span></div></article>
      </aside>
    </section>`;
}

function trackView() {
  const route = backend.getRouteByCode("B12") || { code: "B12", name: "East Legon → Circle", fare: 7, origin: "East Legon", destination: "Circle" };
  const fare = Number(route.fare || route.price || 0).toFixed(2);
  const user = getCurrentUser();
  const isPassenger = user ? String(user.role || "PASSENGER").toUpperCase() === "PASSENGER" : true;
  const alightButton = isPassenger ? `<button class="secondary-button" data-alight-now style="margin-top:10px">I will alight here</button>` : "";

  return `
    <div class="view-intro"><p class="eyebrow">Live movement</p><h1>Track your bus in real time.</h1><p>See where your bus is, how full it is, and exactly when it will arrive at the next stop.</p></div>
    <div class="split-panel"><section class="feature-panel"><div class="map-panel"><div class="map-label"><span>Accra — live route</span><span class="live-badge">● 42 ONLINE</span></div>${renderAccraMap()}<div class="map-callout"><div><b>${escapeHTML(route.code)} · ${escapeHTML(route.name)}</b><span>Reaching ${escapeHTML(route.destination || "Circle")} in 2 mins</span></div><button data-view="details">Details</button></div></div></section><section class="feature-panel"><div class="route-label">ROUTE ${escapeHTML(route.code)}</div><h2>${escapeHTML(route.name)} journey update</h2><p>Seats are available and the bus is moving normally.</p><div class="timeline"><div class="timeline-item"><b>${escapeHTML(route.origin || "East Legon")}</b><small>Current location · 2 min ago</small></div><div class="timeline-item"><b>Accra Mall</b><small>Next stop · 2 min</small></div><div class="timeline-item"><b>37 Station</b><small>Estimated · 8 min</small></div><div class="timeline-item"><b>${escapeHTML(route.destination || "Circle")}</b><small>Estimated arrival · 17 min</small></div></div><div class="action-row"><button class="primary-button" data-view="details">View bus details</button><button class="secondary-button" data-pay="${escapeHTML(route.code)}">Pay GH₵ ${fare}</button></div>${alightButton}</section></div>
    <section class="feature-panel" style="margin-top:20px"><div class="section-heading"><h2>More routes nearby</h2><button class="text-button" data-view="home">Plan a journey →</button></div><div class="route-list">${routeCards(routes.slice(1))}</div></section>`;
}

function detailsView() {
  const user = getCurrentUser();
  const isPassenger = user ? String(user.role || "PASSENGER").toUpperCase() === "PASSENGER" : true;
  const alightButton = isPassenger ? `<button class="secondary-button" data-alight-now> I will alight here </button>` : "";

  return `
    <div class="view-intro"><p class="eyebrow">B12 · Bus details</p><h1>East Legon to Circle.</h1><p>Everything you need before you board: fare, service hours, live movement, and the stops ahead.</p></div>
    <section class="split-panel">
      <section class="feature-panel route-detail-card"><div class="bus-illustration"><div class="bus-window-row"><i></i><i></i><i></i><i></i><i></i></div><div class="bus-stripe"></div><span class="bus-number">B12</span><span class="bus-wheel wheel-one"></span><span class="bus-wheel wheel-two"></span></div><div class="route-label">LOCAL BUS SERVICE</div><h2>East Legon <span>→</span> Circle</h2><div class="bus-facts"><div><small>Fare</small><b>GH₵ 7.00</b></div><div><small>First bus</small><b>5:30 AM</b></div><div><small>Last bus</small><b>9:30 PM</b></div></div></section>
      <section class="feature-panel"><h2>Stops on this route</h2><p>Bus B12 is moving normally and has 14 seats available.</p><div class="stop-list"><div class="stop is-current"><b>East Legon, 3rd Avenue</b><small>Current location</small></div><div class="stop"><b>Accra Mall</b><small>Next stop · 2 min</small></div><div class="stop"><b>37 Station</b><small>Estimated · 8 min</small></div><div class="stop"><b>Circle</b><small>Estimated arrival · 17 min</small></div></div><button class="primary-button" data-pay="B12">Pay fare with PicTro</button>${alightButton}</section>
    </section>
    <section class="payment-strip"><div><span>✓</span><div><b>Pay in the way that works for you</b><small>Mobile Money, cash recorded by staff, or a supported card / tap-to-pay device.</small></div></div><button class="secondary-button" data-view="wallet">Choose payment method</button></section>`;
}

function passView() {
  return `
    <div class="view-intro"><p class="eyebrow">Travel your way</p><h1>Meet the PicTro Pass.</h1><p>One simple pass for regular journeys—activate in seconds, then tap, scan, or show your pass when you board.</p></div>
    <section class="dashboard-grid"><article class="metric"><span>This week</span><strong>5 trips</strong><small>2 more than last week</small></article><article class="metric"><span>Current savings</span><strong>GH₵ 12</strong><small>with PicTro Pass</small></article><article class="metric"><span>Reward points</span><strong>340</strong><small>160 to your next reward</small></article></section>
    <section class="feature-panel"><div class="section-heading"><div><h2>Choose your pass</h2><p>Flexible travel that fits your routine.</p></div></div><div class="route-list"><article class="route-card"><div class="route-code" style="background:#0b7a61">7D</div><div><p class="route-name">Weekly Pass</p><span class="route-meta">Up to 14 journeys · Great for your work week</span></div><div class="route-right"><strong>GH₵ 35</strong><span>valid 7 days</span></div><button class="track-button" data-subscribe="Weekly Pass">Choose</button></article><article class="route-card"><div class="route-code" style="background:#f47f61">30D</div><div><p class="route-name">Monthly Pass</p><span class="route-meta">Up to 60 journeys · The best value for regular travel</span></div><div class="route-right"><strong>GH₵ 120</strong><span>valid 30 days</span></div><button class="track-button" data-subscribe="Monthly Pass">Choose</button></article></div></section>`;
}

function walletView() {
  return `
    <div class="view-intro"><p class="eyebrow">Secure payments</p><h1>Your PicTro wallet.</h1><p>Pay your way with Mobile Money, cash recorded by staff, or a supported contactless card.</p></div>
    <section class="split-panel"><section class="feature-panel"><h2>Pay a bus fare</h2><p>Choose a payment method for your next trip. PicTro records only your transaction reference and status—not card numbers or CVV.</p><div class="payment-options"><button class="payment-option" data-payment-method="MoMo"><i>M</i><span><b>Mobile Money</b><small>Fast, secure, and ready on your phone</small></span></button><button class="payment-option" data-payment-method="Cash"><i>₵</i><span><b>Cash</b><small>Record payment with the driver or mate</small></span></button><button class="payment-option" data-payment-method="Card"><i>◌</i><span><b>Card / tap to pay</b><small>Use a supported contactless card or device</small></span></button></div></section><section class="feature-panel"><h2>Payment activity</h2><p>Your latest completed payments.</p><div class="stat-row"><span><b>B12 · East Legon</b><small>MoMo · Today, 08:41</small></span><b>−GH₵ 7.00</b></div><div class="stat-row"><span><b>A04 · Madina</b><small>Cash · Yesterday, 18:12</small></span><b>−GH₵ 6.50</b></div><div class="stat-row"><span><b>PicTro Pass</b><small>MoMo · 12 Aug</small></span><b>−GH₵ 35.00</b></div><button class="secondary-button" style="margin-top:16px" data-view="activity">View full history</button></section></section>`;
}

function activityView() {
  return `
    <div class="view-intro"><p class="eyebrow">Your history</p><h1>Every journey in one place.</h1><p>Keep track of payments, passes, and journeys without digging through messages or receipts.</p></div>
    <section class="feature-panel"><div class="section-heading"><h2>Recent activity</h2><button class="text-button" data-export>Download statement</button></div><div class="timeline"><div class="timeline-item"><b>Paid GH₵ 7.00 for B12</b><small>MoMo · Today at 08:41 · East Legon → Circle</small></div><div class="timeline-item"><b>Completed journey on A04</b><small>Cash · Yesterday at 18:12 · Madina → 37 Station</small></div><div class="timeline-item"><b>Weekly Pass activated</b><small>MoMo · 12 August · Valid until 19 August</small></div><div class="timeline-item"><b>Paid GH₵ 9.00 for C21</b><small>Card · 10 August · Kasoa → Accra Central</small></div></div></section>`;
}

function staffView() {
  const route = backend.getRouteByCode("B12") || { fare: 7, seats: 48, passengerCount: 0, name: "East Legon → Circle", origin: "East Legon", destination: "Circle" };
  const passengerCount = backend.getRoutePassengerCount("B12");
  const seatsAvailable = Math.max(0, Number(route.seats || 48) - passengerCount);
  const tripCollection = Number(route.fare || route.price || 0) * Math.max(1, passengerCount);
  const notifications = backend.getFleetNotifications ? backend.getFleetNotifications().filter((item) => item.type === "alight") : [];

  return `
    <div class="view-intro"><p class="eyebrow">Driver & mate hub</p><h1>Keep today's service moving.</h1><p>A private, at-a-glance view of your assigned trip, passengers, boarding demand, and collection.</p></div>
    <section class="dashboard-grid"><article class="metric"><span>Assigned bus</span><strong>B12</strong><small>${escapeHTML(route.name || "East Legon → Circle")}</small></article><article class="metric"><span>Passenger count</span><strong>${passengerCount} / ${route.seats || 48}</strong><small>${seatsAvailable} seats remaining</small></article><article class="metric"><span>Trip collection</span><strong>GH₵ ${tripCollection.toFixed(2)}</strong><small>Updated after payment</small></article></section>
    <section class="split-panel"><section class="feature-panel"><h2>Next stop: Accra Mall</h2><p>Expected boarding demand is high. Prepare for about 9 passengers at this stop.</p><div class="progress"><span style="width:${Math.min(100, (passengerCount / Math.max(1, route.seats || 48)) * 100)}%"></span></div><div class="stat-row"><span>Cash</span><b>GH₵ ${Math.max(0, (passengerCount * Number(route.fare || route.price || 0) * 0.35)).toFixed(2)}</b></div><div class="stat-row"><span>MoMo</span><b>GH₵ ${Math.max(0, (passengerCount * Number(route.fare || route.price || 0) * 0.45)).toFixed(2)}</b></div><div class="stat-row"><span>Card</span><b>GH₵ ${Math.max(0, (passengerCount * Number(route.fare || route.price || 0) * 0.20)).toFixed(2)}</b></div><button class="primary-button" data-record-cash>Record cash payment</button><button class="secondary-button" data-set-price="B12" style="margin-top:10px">Set fare</button><button class="secondary-button" data-set-destination="B12" style="margin-top:10px">Set destination</button><button class="secondary-button" data-station-board style="margin-top:10px">Passenger station board</button></section><section class="feature-panel"><h2>Trip checks</h2><div class="timeline"><div class="timeline-item"><b>GPS signal active</b><small>Last update 12 seconds ago</small></div><div class="timeline-item"><b>${passengerCount} passengers boarded</b><small>Count updated when payment is recorded</small></div><div class="timeline-item"><b>Demand insight ready</b><small>High demand at Accra Mall</small></div></div><div class="timeline"><h3 style="margin-bottom:8px">Alight requests</h3>${notifications.length ? notifications.map((notice) => `<div class="timeline-item"><b>${escapeHTML(notice.stopName || "Stop")}</b><small>${escapeHTML(notice.createdAt || "Now")}</small></div>`).join("") : `<div class="timeline-item"><b>No alight requests yet</b><small>Passengers are still on board.</small></div>`}</div><button class="secondary-button" data-view="track">Open live route</button></section></section>`;
}

function manageView() {
  const bars = [42, 61, 50, 78, 66, 90, 72].map((height, index) => `<span class="bar ${index === 5 ? "active" : ""}" style="height:${height}%"><em>${["M", "T", "W", "T", "F", "S", "S"][index]}</em></span>`).join("");
  const routesForPricing = backend.getRoutes().map((route) => `
    <div class="stat-row">
      <span><b>${route.code} · ${route.name}</b><small>Set the fare or destination for this route</small></span>
      <b>GH₵ ${Number(route.fare || route.price || 0).toFixed(2)}</b>
      <div class="route-inline-actions">
        <button class="secondary-button" data-set-price="${route.code}" style="margin-left:10px">Set price</button>
        <button class="secondary-button" data-set-destination="${route.code}" style="margin-left:8px">Set destination</button>
      </div>
    </div>
  `).join("");
  const fleet = (backend.getVehicles ? backend.getVehicles() : []).map((vehicle) => `
    <div class="stat-row">
      <span><b>${escapeHTML(vehicle.plate)} · ${escapeHTML(vehicle.model)}</b><small>${escapeHTML(vehicle.driverName)} · ${escapeHTML(vehicle.origin)} → ${escapeHTML(vehicle.destination)}</small></span>
      <img src="${escapeHTML(vehicle.photoUrl || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80")}" alt="${escapeHTML(vehicle.model)}" style="width:64px;height:48px;object-fit:cover;border-radius:8px;" />
    </div>
  `).join("");
  return `
    <div class="view-intro"><p class="eyebrow">Operations overview</p><h1>Make every route work better.</h1><p>Monitor live service, passenger demand, revenue, subscriptions, and operational trends across PicTro.</p></div>
    <section class="dashboard-grid"><article class="metric"><span>Active buses</span><strong>${(backend.getVehicles ? backend.getVehicles() : []).length}</strong><small>↑ 6% from yesterday</small></article><article class="metric"><span>Passengers today</span><strong>${backend.getRoutes().reduce((total, route) => total + Number(route.passengerCount || backend.getRoutePassengerCount(route.code)), 0)}</strong><small>Count updates after each payment</small></article><article class="metric"><span>Revenue today</span><strong>GH₵ ${(backend.getRoutes().reduce((total, route) => total + Number(route.fare || route.price || 0) * Math.max(1, Number(route.passengerCount || backend.getRoutePassengerCount(route.code))), 0)).toFixed(2)}</strong><small>Fare pricing managed here</small></article></section>
    <section class="split-panel"><section class="feature-panel"><div class="section-heading"><h2>Weekly passenger demand</h2><button class="text-button" data-export>Export report</button></div><div class="chart">${bars}</div><p>Saturday shows the strongest demand. Consider adding capacity on B12 and C21 between 08:00–11:00.</p></section><section class="feature-panel"><h2>Route pricing & destinations</h2>${routesForPricing}<button class="secondary-button" style="margin-top:16px" data-staff-assignment>Review assignments</button><button class="secondary-button" style="margin-top:10px" data-add-vehicle>Add vehicle</button><button class="secondary-button" style="margin-top:10px" data-station-board>Passenger station board</button><div class="feature-panel" style="margin-top:16px"><h3>Fleet</h3>${fleet || "<p>No vehicles added yet.</p>"}</div></section></section>`;
}

const views = { welcome: welcomeView, login: loginView, signup: signupView, home: homeView, track: trackView, details: detailsView, pass: passView, wallet: walletView, activity: activityView, staff: staffView, manage: manageView };
const publicViews = new Set(["welcome", "login", "signup"]);

function setActiveNav(view) {
  const navView = view === "details" ? "track" : view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === navView && (button.classList.contains("nav-item") || button.classList.contains("mobile-nav-item"))));
}

function openAccountMenu() {
  const user = getCurrentUser();
  if (!user) {
    renderView("welcome");
    showToast("Log in to view your PicTro account.");
    return;
  }

  const summary = backend.getAccountSummary(user.id);
  const items = [
    ["Email", user.email],
    ["Phone", user.phone],
    ["Location", user.city || "Accra"],
    ["Saved routes", (user.savedLocations || ["East Legon", "Circle"]).join(", ")]
  ];

  const list = items.map(([label, value]) => `<div class="account-item"><span>${escapeHTML(label)}</span><b>${escapeHTML(value)}</b></div>`).join("");

  openModal(`
    <div class="account-menu-panel">
      <h2>${escapeHTML(user.fullName)}</h2>
      <p>${escapeHTML(getRoleLabel(user.role))}</p>
      <div class="account-list">${list}</div>
      <div class="account-actions">
        <button class="primary-button" type="button" data-view="${getDashboardViewForUser(user)}">Dashboard</button>
        <button class="secondary-button" type="button" data-logout>Log out</button>
      </div>
    </div>
  `);
}

function renderView(view = "home") {
  const currentUser = getCurrentUser();
  let chosenView = views[view] ? view : "welcome";

  if (currentUser) {
    const allowed = getAllowedViewsForUser(currentUser);
    if (!allowed.has(chosenView)) {
      chosenView = getDashboardViewForUser(currentUser);
    }
  }

  if (!isAuthenticated && !publicViews.has(chosenView)) chosenView = "welcome";

  app.innerHTML = views[chosenView]();
  app.dataset.activeView = chosenView;
  document.querySelector(".app-shell").dataset.activeView = chosenView;
  updateProfileCard();
  applyRoleNavVisibility();
  setActiveNav(chosenView);
  ensureLiveMap();
  window.history.replaceState({}, "", `#${chosenView}`);
  app.focus({ preventScroll: true });
}

function paymentModal(route = "your selected route", method = "Mobile Money") {
  openModal(`<h2>Pay with ${escapeHTML(method)}</h2><p>You're paying for ${escapeHTML(route)}. The amount will be confirmed by PicTro after your payment provider responds.</p><div class="payment-options"><button class="payment-option" data-confirm-payment><i>✓</i><span><b>Confirm demo payment</b><small>No money is taken in this prototype.</small></span></button></div>`);
  modalContent.dataset.route = route;
  modalContent.dataset.method = method;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    const accountButton = event.target.closest(".account-menu-button");
    if (accountButton) {
      openAccountMenu();
    }
    return;
  }

  if (button.dataset.accountMenu !== undefined) { openAccountMenu(); return; }
  if (button.dataset.view) { renderView(button.dataset.view); return; }
  if (button.dataset.signinProvider) {
    openProviderAuth(button.dataset.signinProvider);
    return;
  }
  if (button.dataset.providerSubmit) {
    const provider = modalContent.dataset.provider || button.dataset.providerSubmit;
    const input = modalContent.querySelector("#provider-email");
    const validation = validateProviderEmail(provider, input ? input.value : "");
    if (!validation.ok) {
      showToast(validation.message);
      return;
    }
    const result = backend.signInWithProvider(provider, validation.email);
    if (!result || !result.ok) {
      showToast(result?.message || "We could not sign you in with this provider.");
      return;
    }
    isAuthenticated = true;
    const user = result.user;
    closeModal();
    renderView(getDashboardViewForUser(user));
    showToast(`Signed in with ${provider}. Welcome to PicTro.`);
    return;
  }
  if (button.dataset.track) { renderView("track"); showToast(`${button.dataset.track} is now being tracked.`); return; }
  if (button.dataset.alightNow) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      showToast("Log in as a passenger to send an alight request.");
      return;
    }
    const result = backend.addAlightRequest({ userId: currentUser.id, routeCode: "B12", stopName: "Accra Mall" });
    showToast(result.ok ? "Your alight request has been sent to the driver." : "Could not send the alight request.");
    return;
  }
  if (button.dataset.pay) { paymentModal(button.dataset.pay); return; }
  if (button.dataset.paymentMethod) { paymentModal("your next PicTro journey", button.dataset.paymentMethod); return; }
  if (button.dataset.subscribe) {
    const passName = button.dataset.subscribe;
    openModal(`<h2>${escapeHTML(passName)} selected</h2><p>Connect your preferred payment method to activate your PicTro Pass. You'll see its start date, expiry, payment status, and journey allowance here.</p><button class="primary-button" data-confirm-subscription>Activate demo pass</button>`);
    modalContent.dataset.passName = passName;
    return;
  }
  if (button.dataset.recordCash !== undefined) {
    openModal(`<h2>Record cash payment</h2><p>Add a fare collected by the driver or mate. This keeps passenger, staff, and management records aligned.</p><div class="field"><label for="cash-value">Fare amount</label><input id="cash-value" value="7.00" inputmode="decimal" /></div><button class="primary-button" data-confirm-cash>Record GH₵ 7.00</button>`);
    modalContent.dataset.route = "B12";
    modalContent.dataset.method = "Cash";
    return;
  }
  if (button.dataset.export !== undefined) { showToast("Your PicTro report is ready to download in the full app."); return; }
  if (button.dataset.staffAssignment !== undefined) { showToast("2 pending assignments have been highlighted for review."); return; }
  if (button.dataset.stationBoard !== undefined) {
    const notifications = backend.getFleetNotifications ? backend.getFleetNotifications() : [];
    const list = notifications.length
      ? notifications.map((item) => `<div class="stat-row"><span><b>${escapeHTML(item.type === "alight" ? "Passenger will alight" : "Station crowd")}</b><small>${escapeHTML(item.stopName || item.station || "Accra")}</small></span><b>${escapeHTML(item.createdAt || "Now")}</b></div>`).join("")
      : "<p>No live passenger alert is active right now.</p>";
    openModal(`<h2>Passenger station board</h2>${list}<button class="primary-button" data-close-modal style="margin-top:16px">Close</button>`);
    return;
  }
  if (button.dataset.addVehicle !== undefined) {
    openModal(`
      <h2>Add another vehicle</h2>
      <div class="field"><label for="vehicle-plate">Plate number</label><input id="vehicle-plate" value="GW-8801" /></div>
      <div class="field"><label for="vehicle-model">Car model</label><input id="vehicle-model" value="Toyota Hiace" /></div>
      <div class="field"><label for="vehicle-driver">Driver name</label><input id="vehicle-driver" value="Yaw Abeka" /></div>
      <div class="field"><label for="vehicle-phone">Driver phone</label><input id="vehicle-phone" value="0249876543" /></div>
      <div class="field"><label for="vehicle-capacity">Capacity</label><input id="vehicle-capacity" type="number" value="14" /></div>
      <div class="field"><label for="vehicle-photo">Vehicle photo URL</label><input id="vehicle-photo" value="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80" /></div>
      <div class="field"><label for="vehicle-origin">From</label><input id="vehicle-origin" value="Madina" /></div>
      <div class="field"><label for="vehicle-destination">To</label><input id="vehicle-destination" value="Circle" /></div>
      <button class="primary-button" data-confirm-vehicle>Add vehicle</button>
    `);
    return;
  }
  if (button.dataset.confirmVehicle !== undefined) {
    const payload = {
      plate: document.querySelector("#vehicle-plate")?.value || "GW-0000",
      model: document.querySelector("#vehicle-model")?.value || "Bus",
      driverName: document.querySelector("#vehicle-driver")?.value || "Driver",
      driverPhone: document.querySelector("#vehicle-phone")?.value || "0240000000",
      capacity: document.querySelector("#vehicle-capacity")?.value || 14,
      photoUrl: document.querySelector("#vehicle-photo")?.value || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
      origin: document.querySelector("#vehicle-origin")?.value || "Accra",
      destination: document.querySelector("#vehicle-destination")?.value || "Central",
      currentLat: 5.6072,
      currentLng: -0.1818,
      status: "active"
    };
    const result = backend.addVehicle(payload);
    closeModal();
    showToast(result.ok ? "Vehicle added to the fleet." : "Vehicle could not be added.");
    renderView("manage");
    return;
  }
  if (button.dataset.setPrice) {
    const route = backend.getRouteByCode(button.dataset.setPrice);
    openModal(`<h2>Set fare for ${escapeHTML(button.dataset.setPrice)}</h2><div class="field"><label for="route-price">Fare amount</label><input id="route-price" type="number" min="1" step="0.01" value="${Number(route ? route.fare || route.price || 0 : 0).toFixed(2)}" /></div><button class="primary-button" data-confirm-price="${button.dataset.setPrice}">Save price</button>`);
    modalContent.dataset.route = button.dataset.setPrice;
    return;
  }
  if (button.dataset.setDestination) {
    const route = backend.getRouteByCode(button.dataset.setDestination);
    const destinationValue = route && (route.destination || route.name.split("→").slice(-1)[0] || "Circle");
    const originValue = route && (route.origin || route.name.split("→")[0] || "East Legon");
    openModal(`<h2>Set route for ${escapeHTML(button.dataset.setDestination)}</h2><div class="field"><label for="route-origin">Pickup point</label><input id="route-origin" type="text" value="${escapeHTML(originValue)}" placeholder="East Legon, Madina, Kasoa" /></div><div class="field"><label for="route-destination">Destination</label><input id="route-destination" type="text" value="${escapeHTML(destinationValue)}" placeholder="Circle, Kaneshie, Madina" /></div><button class="primary-button" data-confirm-destination="${button.dataset.setDestination}">Save route</button>`);
    modalContent.dataset.route = button.dataset.setDestination;
    return;
  }
  if (button.dataset.confirmPrice) {
    const input = modalContent.querySelector("#route-price");
    const code = modalContent.dataset.route || button.dataset.confirmPrice;
    const result = backend.setRoutePrice(code, input ? input.value : 0);
    closeModal();
    showToast(result.ok ? `Fare updated for ${code}.` : result.message);
    renderView(getCurrentUser() && (String(getCurrentUser().role).toUpperCase() === "DRIVER" || String(getCurrentUser().role).toUpperCase() === "MATE") ? "staff" : "manage");
    return;
  }
  if (button.dataset.confirmDestination) {
    const originInput = modalContent.querySelector("#route-origin");
    const destinationInput = modalContent.querySelector("#route-destination");
    const code = modalContent.dataset.route || button.dataset.confirmDestination;
    const origin = originInput ? originInput.value : "";
    const destination = destinationInput ? destinationInput.value : "";
    const routeResult = backend.getRouteByCode(code) || { origin: "East Legon", destination: "Circle" };
    const safeOrigin = String(origin || routeResult.origin || "East Legon").trim();
    const safeDestination = String(destination || routeResult.destination || "Circle").trim();
    const result = backend.setRouteDestination(code, safeDestination, safeOrigin);
    closeModal();
    showToast(result.ok ? `Route updated for ${code}.` : result.message);
    renderView(getCurrentUser() && (String(getCurrentUser().role).toUpperCase() === "DRIVER" || String(getCurrentUser().role).toUpperCase() === "MATE") ? "staff" : "manage");
    return;
  }
  if (button.dataset.confirmPayment !== undefined) {
    const result = backend.recordPayment(modalContent.dataset.route || "B12", modalContent.dataset.method || "Mobile Money", 7);
    closeModal();
    showToast(result.ok ? "Payment recorded — your receipt is on its way." : result.message);
    renderView("track");
    return;
  }
  if (button.dataset.confirmSubscription !== undefined) {
    const passName = modalContent.dataset.passName || "Weekly Pass";
    const result = backend.activatePass(passName);
    closeModal();
    showToast(result.ok ? `${passName} has been activated.` : result.message);
    return;
  }
  if (button.dataset.confirmCash !== undefined) {
    const route = modalContent.dataset.route || "B12";
    const result = backend.recordPayment(route, "Cash", 7);
    closeModal();
    showToast(result.ok ? "Cash payment recorded for this trip." : result.message);
    return;
  }
  if (button.dataset.logout !== undefined) {
    backend.logoutUser();
    isAuthenticated = false;
    closeModal();
    renderView("welcome");
    showToast("You have been logged out.");
    return;
  }
  if (button.dataset.closeModal !== undefined) closeModal();
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.id === "login-form") {
    event.preventDefault();
    const identifier = form.identifier.value.trim();
    const password = form.password.value.trim();
    const result = backend.loginUser(identifier, password);
    if (!result.ok) {
      showToast(result.message);
      return;
    }
    isAuthenticated = true;
    const user = backend.getCurrentUser();
    renderView(getDashboardViewForUser(user));
    showToast(`Welcome back to PicTro.`);
    return;
  }

  if (form.id === "signup-form") {
    event.preventDefault();
    const result = backend.registerUser({
      fullName: form.fullName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value.trim(),
      role: form.role ? form.role.value : "PASSENGER"
    });

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    isAuthenticated = true;
    const user = backend.getCurrentUser();
    renderView(getDashboardViewForUser(user));
    showToast(`${getRoleLabel(user.role)} is ready.`);
    return;
  }

  if (form.id !== "journey-form") return;
  event.preventDefault();
  const from = form.from.value.trim() || "your pickup point";
  const to = form.to.value.trim() || "your destination";
  backend.updateJourney(from, to, form.when.value || "Leaving now");
  renderView("track");
  showToast(`Showing buses from ${from} to ${to}.`);
});

modalBackdrop.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));

const initialView = location.hash.slice(1) || (isAuthenticated ? "home" : "welcome");
renderView(initialView);

