(function () {
  const STORAGE_KEY = "pictro_app_state_v1";

  const defaultRoutes = [
    { code: "B12", origin: "East Legon", destination: "Circle", name: "East Legon → Circle", eta: "2 min", meta: "Accra Mall · 8 stops", fare: 7, seats: 14, destinations: ["Circle", "Accra Mall", "37 Station", "Kaneshie"] },
    { code: "A04", origin: "Madina", destination: "37 Station", name: "Madina → 37 Station", eta: "6 min", meta: "Legon · 11 stops", fare: 6.5, seats: 8, destinations: ["37 Station", "Legon", "Madina", "Accra Central"] },
    { code: "C21", origin: "Kasoa", destination: "Accra Central", name: "Kasoa → Accra Central", eta: "11 min", meta: "Kaneshie · 13 stops", fare: 9, seats: 21, destinations: ["Accra Central", "Kaneshie", "Abeka", "Kasoa"] }
  ];

  const defaultUsers = [
    {
      id: "user_akosua",
      fullName: "Akosua K.",
      email: "akosua@pictro.com",
      phone: "0551234567",
      password: "demo123",
      role: "PASSENGER",
      city: "Accra",
      preferredRoute: "B12",
      savedLocations: ["East Legon", "Circle", "Madina"],
      paymentMethods: ["Mobile Money", "Card"],
      createdAt: "2026-08-01"
    },
    {
      id: "user_driver",
      fullName: "Kofi Mensah",
      email: "driver@pictro.com",
      phone: "0241234567",
      password: "driver123",
      role: "DRIVER",
      city: "Accra",
      preferredRoute: "B12",
      savedLocations: ["East Legon Depot", "Circle Terminal"],
      paymentMethods: ["Cash", "MoMo", "Card"],
      createdAt: "2026-08-01"
    },
    {
      id: "user_mate",
      fullName: "Esi Afriyie",
      email: "mate@pictro.com",
      phone: "0261234567",
      password: "mate123",
      role: "MATE",
      city: "Accra",
      preferredRoute: "A04",
      savedLocations: ["Madina Depot", "37 Station"],
      paymentMethods: ["Cash", "MoMo"],
      createdAt: "2026-08-01"
    },
    {
      id: "user_admin",
      fullName: "Ama S.",
      email: "admin@pictro.com",
      phone: "0200000000",
      password: "admin123",
      role: "MANAGER",
      city: "Accra",
      savedLocations: ["Head Office", "Central Depot"],
      paymentMethods: ["Bank Transfer"],
      createdAt: "2026-08-01"
    }
  ];

  const defaultPasses = [
    { id: "pass_weekly", name: "Weekly Pass", price: 35, validDays: 7, journeysIncluded: 14, active: true },
    { id: "pass_monthly", name: "Monthly Pass", price: 120, validDays: 30, journeysIncluded: 60, active: false }
  ];

  const defaultVehicles = [
    {
      id: "veh_1",
      plate: "GW-6021",
      model: "Toyota Coaster",
      driverName: "Kofi Mensah",
      driverPhone: "0241234567",
      capacity: 14,
      photoUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
      origin: "East Legon",
      destination: "Circle",
      currentLat: 5.6072,
      currentLng: -0.1818,
      status: "active"
    },
    {
      id: "veh_2",
      plate: "GA-7348",
      model: "Mercedes Sprinter",
      driverName: "Yaw Abeka",
      driverPhone: "0249876543",
      capacity: 18,
      photoUrl: "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80",
      origin: "Madina",
      destination: "37 Station",
      currentLat: 5.6475,
      currentLng: -0.1692,
      status: "active"
    }
  ];

  const defaultNotifications = [
    { id: "notice_1", type: "alight", userId: "user_akosua", routeCode: "B12", stopName: "Accra Mall", createdAt: "Today, 08:41", seenByDriver: false },
    { id: "notice_2", type: "station", station: "Circle", count: 12, createdAt: "Today, 08:10", seenByDriver: false }
  ];

  const createDefaultState = () => ({
    currentUserId: null,
    users: JSON.parse(JSON.stringify(defaultUsers)),
    routes: JSON.parse(JSON.stringify(defaultRoutes)),
    passes: JSON.parse(JSON.stringify(defaultPasses)),
    vehicles: JSON.parse(JSON.stringify(defaultVehicles)),
    notifications: JSON.parse(JSON.stringify(defaultNotifications)),
    payments: [
      { id: "pay_1", userId: "user_akosua", routeCode: "B12", method: "MoMo", amount: 7, date: "Today, 08:41" },
      { id: "pay_2", userId: "user_akosua", routeCode: "A04", method: "Cash", amount: 6.5, date: "Yesterday, 18:12" },
      { id: "pay_3", userId: "user_akosua", routeCode: "Weekly Pass", method: "MoMo", amount: 35, date: "12 Aug" }
    ],
    trips: [
      { id: "trip_1", userId: "user_akosua", from: "East Legon", to: "Circle", routeCode: "B12", time: "Today at 08:41" },
      { id: "trip_2", userId: "user_akosua", from: "Madina", to: "37 Station", routeCode: "A04", time: "Yesterday at 18:12" }
    ]
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createDefaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.users) {
        const initial = createDefaultState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return parsed;
    } catch (error) {
      console.warn("Using in-memory fallback state because localStorage is unavailable.", error);
      return createDefaultState();
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to persist state.", error);
    }
  }

  async function hydrateStateFromDatabase() {
    try {
      const baseUrl = typeof window !== "undefined" && window.location && window.location.origin ? window.location.origin : "";
      const [routesResult, usersResult, passesResult, paymentsResult, tripsResult] = await Promise.all([
        fetch(`${baseUrl}/api/routes`).then((res) => res.ok ? res.json() : []) .catch(() => []),
        fetch(`${baseUrl}/api/users`).then((res) => res.ok ? res.json() : []) .catch(() => []),
        fetch(`${baseUrl}/api/passes`).then((res) => res.ok ? res.json() : []) .catch(() => []),
        fetch(`${baseUrl}/api/payments`).then((res) => res.ok ? res.json() : []) .catch(() => []),
        fetch(`${baseUrl}/api/trips`).then((res) => res.ok ? res.json() : []) .catch(() => [])
      ]);

      const current = readState();
      const nextState = {
        ...createDefaultState(),
        ...current,
        routes: Array.isArray(routesResult) && routesResult.length ? routesResult : current.routes || createDefaultState().routes,
        users: Array.isArray(usersResult) && usersResult.length ? usersResult.map((user) => ({
          ...user,
          fullName: user.full_name || user.fullName,
          email: user.email,
          phone: user.phone,
          password: user.password || "demo123",
          role: user.role || "PASSENGER",
          city: user.city || "Accra",
          preferredRoute: user.preferred_route || user.preferredRoute || "B12"
        })) : current.users || createDefaultState().users,
        passes: Array.isArray(passesResult) && passesResult.length ? passesResult : current.passes || createDefaultState().passes,
        payments: Array.isArray(paymentsResult) && paymentsResult.length ? paymentsResult : current.payments || createDefaultState().payments,
        trips: Array.isArray(tripsResult) && tripsResult.length ? tripsResult : current.trips || createDefaultState().trips,
        currentUserId: current.currentUserId || null
      };

      writeState(nextState);
      return nextState;
    } catch (error) {
      console.warn("Database hydration was unavailable; using local state.", error);
      return readState();
    }
  }

  async function persistStateToDatabase(state = readState()) {
    try {
      const baseUrl = typeof window !== "undefined" && window.location && window.location.origin ? window.location.origin : "";
      const payload = {
        ...state,
        users: state.users.map((user) => ({
          ...user,
          full_name: user.fullName || user.full_name,
          fullName: user.fullName || user.full_name,
          preferred_route: user.preferredRoute || user.preferred_route || "B12"
        }))
      };

      await fetch(`${baseUrl}/api/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: payload.routes })
      }).catch(() => null);
    } catch (error) {
      console.warn("Background sync to database failed.", error);
    }
  }

  function createUserId() {
    return `user_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function normalizeIdentifier(value) {
    return String(value || "").trim().toLowerCase();
  }

  function findUserByIdentifier(identifier) {
    const state = readState();
    const key = normalizeIdentifier(identifier);
    return state.users.find((user) => {
      const emailMatch = normalizeIdentifier(user.email) === key;
      const phoneMatch = normalizeIdentifier(user.phone) === key;
      return emailMatch || phoneMatch;
    }) || null;
  }

  function setCurrentUserId(userId) {
    const state = readState();
    state.currentUserId = userId;
    writeState(state);
  }

  function getCurrentUser() {
    const state = readState();
    return state.users.find((user) => user.id === state.currentUserId) || null;
  }

  function getRoutes() {
    return readState().routes;
  }

  function getVehicles() {
    return readState().vehicles || [];
  }

  function addVehicle(vehicleInput) {
    const state = readState();
    const safeVehicle = {
      id: `veh_${Date.now()}`,
      plate: String(vehicleInput?.plate || "").trim() || "GW-0000",
      model: String(vehicleInput?.model || "").trim() || "Bus",
      driverName: String(vehicleInput?.driverName || "").trim() || "Driver",
      driverPhone: String(vehicleInput?.driverPhone || "").trim() || "0240000000",
      capacity: Number(vehicleInput?.capacity) || 14,
      photoUrl: String(vehicleInput?.photoUrl || "").trim() || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80",
      origin: String(vehicleInput?.origin || "Accra").trim() || "Accra",
      destination: String(vehicleInput?.destination || "Central").trim() || "Central",
      currentLat: Number(vehicleInput?.currentLat) || 5.6072,
      currentLng: Number(vehicleInput?.currentLng) || -0.1818,
      status: String(vehicleInput?.status || "active").trim() || "active"
    };

    state.vehicles = [...(state.vehicles || []), safeVehicle];
    writeState(state);
    return { ok: true, vehicle: safeVehicle };
  }

  function getFleetNotifications() {
    return readState().notifications || [];
  }

  function addAlightRequest({ userId, routeCode, stopName }) {
    const state = readState();
    state.notifications = [{
      id: `notice_${Date.now()}`,
      type: "alight",
      userId: String(userId || ""),
      routeCode: String(routeCode || "B12"),
      stopName: String(stopName || "").trim() || "Central Station",
      createdAt: "Now",
      seenByDriver: false
    }, ...(state.notifications || [])];
    writeState(state);
    return { ok: true };
  }

  function getRouteByCode(routeCode) {
    const code = String(routeCode || "").trim().toUpperCase();
    return readState().routes.find((route) => String(route.code || "").toUpperCase() === code) || null;
  }

  function getRoutePassengerCount(routeCode) {
    const state = readState();
    const code = String(routeCode || "").trim().toUpperCase();
    return state.payments.filter((payment) => String(payment.routeCode || "").toUpperCase() === code).length;
  }

  function setRoutePrice(routeCode, amount) {
    const state = readState();
    const route = state.routes.find((item) => String(item.code || "").toUpperCase() === String(routeCode || "").trim().toUpperCase());
    if (!route) {
      return { ok: false, message: "That route is not available on the network." };
    }

    const price = Number(amount);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, message: "Set a valid fare greater than zero." };
    }

    route.fare = price;
    route.price = price;
    writeState(state);
    void persistStateToDatabase(state);
    return { ok: true, route };
  }

  function setRouteOrigin(routeCode, origin) {
    const state = readState();
    const route = state.routes.find((item) => String(item.code || "").toUpperCase() === String(routeCode || "").trim().toUpperCase());
    if (!route) {
      return { ok: false, message: "That route is not available on the network." };
    }

    const value = String(origin || "").trim();
    if (!value) {
      return { ok: false, message: "Enter a valid pickup point for this route." };
    }

    route.origin = value;
    const destination = route.destination || String(route.name || "").split("→").slice(1).join("→").trim() || "Circle";
    route.name = `${value} → ${destination}`;
    writeState(state);
    return { ok: true, route };
  }

  function setRouteDestination(routeCode, destination, originOverride = null) {
    const state = readState();
    const route = state.routes.find((item) => String(item.code || "").toUpperCase() === String(routeCode || "").trim().toUpperCase());
    if (!route) {
      return { ok: false, message: "That route is not available on the network." };
    }

    const value = String(destination || "").trim();
    if (!value) {
      return { ok: false, message: "Enter a valid destination for this route." };
    }

    route.destination = value;
    const origin = originOverride && String(originOverride).trim() ? String(originOverride).trim() : route.origin || String(route.name || "").split("→")[0].trim() || "Accra";
    route.origin = origin;
    route.name = `${origin} → ${value}`;
    if (!Array.isArray(route.destinations)) route.destinations = [];
    if (!route.destinations.some((item) => String(item).toLowerCase() === value.toLowerCase())) {
      route.destinations.push(value);
    }

    writeState(state);
    void persistStateToDatabase(state);
    return { ok: true, route };
  }

  function getPassPlans() {
    return readState().passes;
  }

  function validateProviderEmail(provider, emailAddress) {
    const providerName = String(provider || "Gmail").trim();
    const value = String(emailAddress || "").trim().toLowerCase();
    const isGmail = providerName.toLowerCase() === "gmail";
    const isICloud = providerName.toLowerCase() === "icloud";
    const pattern = isGmail ? /^[^\s@]+@gmail\.com$/i : isICloud ? /^[^\s@]+@icloud\.com$/i : null;

    if (!value) {
      return { ok: false, message: `Please enter a valid ${providerName} address.` };
    }

    if (!pattern || !pattern.test(value)) {
      return { ok: false, message: `Use a valid ${providerName} email ending in ${isGmail ? "@gmail.com" : "@icloud.com"}.` };
    }

    return { ok: true, email: value };
  }

  function signInWithProvider(provider, emailAddress) {
    const state = readState();
    const providerName = String(provider || "Gmail").trim();
    const validation = validateProviderEmail(providerName, emailAddress);
    if (!validation.ok) {
      return { ok: false, message: validation.message };
    }

    const existing = state.users.find((user) => normalizeIdentifier(user.email) === normalizeIdentifier(validation.email));
    if (existing) {
      setCurrentUserId(existing.id);
      return { ok: true, user: existing };
    }

    const providerKey = providerName.toLowerCase();
    const displayName = providerKey === "gmail" ? "Gmail User" : providerKey === "icloud" ? "iCloud User" : "PicTro User";
    const user = {
      id: createUserId(),
      fullName: displayName,
      email: validation.email,
      phone: `050${Math.floor(Math.random() * 900000 + 100000)}`,
      password: providerKey === "gmail" ? "gmail123" : "icloud123",
      role: "PASSENGER",
      city: "Accra",
      preferredRoute: "B12",
      savedLocations: ["East Legon", "Circle"],
      paymentMethods: ["Mobile Money"],
      createdAt: new Date().toISOString().slice(0, 10)
    };

    state.users.push(user);
    state.currentUserId = user.id;
    writeState(state);
    return { ok: true, user };
  }

  function normalizeRole(role) {
    const value = String(role || "PASSENGER").trim().toUpperCase();
    const validRoles = ["PASSENGER", "DRIVER", "MATE", "MANAGER", "ADMIN"];
    return validRoles.includes(value) ? value : "PASSENGER";
  }

  function registerUser(details) {
    const state = readState();
    const fullName = String(details.fullName || "").trim();
    const email = String(details.email || "").trim();
    const phone = String(details.phone || "").trim();
    const password = String(details.password || "").trim();
    const role = normalizeRole(details.role);

    if (!fullName || !email || !phone || !password) {
      return { ok: false, message: "Please complete every field to create your account." };
    }

    if (password.length < 8) {
      return { ok: false, message: "Your password must be at least 8 characters long." };
    }

    const duplicate = state.users.find((user) => {
      return normalizeIdentifier(user.email) === normalizeIdentifier(email) || normalizeIdentifier(user.phone) === normalizeIdentifier(phone);
    });

    if (duplicate) {
      return { ok: false, message: "An account already exists with that email or phone number." };
    }

    const user = {
      id: createUserId(),
      fullName,
      email,
      phone,
      password,
      role,
      city: "Accra",
      preferredRoute: role === "DRIVER" ? "B12" : role === "MATE" ? "A04" : "B12",
      savedLocations: ["East Legon", "Circle"],
      paymentMethods: ["Mobile Money"],
      createdAt: new Date().toISOString().slice(0, 10)
    };

    state.users.push(user);
    state.currentUserId = user.id;
    writeState(state);
    return { ok: true, user };
  }

  function loginUser(identifier, password) {
    const user = findUserByIdentifier(identifier);
    if (!user) {
      return { ok: false, message: "We could not find that account. Please try again." };
    }

    if (String(password || "") !== String(user.password || "")) {
      return { ok: false, message: "Incorrect password. Please try again." };
    }

    setCurrentUserId(user.id);
    void persistStateToDatabase(readState());
    return { ok: true, user };
  }

  function logoutUser() {
    const state = readState();
    state.currentUserId = null;
    writeState(state);
    void persistStateToDatabase(state);
    return true;
  }

  function getAccountSummary(userId) {
    const state = readState();
    const user = state.users.find((item) => item.id === userId) || state.users[0];
    const activePass = state.passes.find((pass) => pass.active) || state.passes[0];
    const paymentHistory = state.payments.filter((item) => item.userId === user.id).slice(0, 3);
    const recentTrips = state.trips.filter((trip) => trip.userId === user.id).slice(0, 2);

    return {
      user,
      activePass,
      paymentHistory,
      recentTrips,
      stats: {
        tripsThisMonth: recentTrips.length + 16,
        savedThisWeek: 12,
        rewardPoints: 340
      }
    };
  }

  function updateJourney(from, to, when) {
    const state = readState();
    const user = getCurrentUser();
    if (!user) return null;

    const trip = {
      id: `trip_${Date.now()}`,
      userId: user.id,
      from: String(from || "East Legon").trim() || "East Legon",
      to: String(to || "Circle").trim() || "Circle",
      routeCode: "B12",
      time: String(when || "Leaving now")
    };

    state.trips.unshift(trip);
    writeState(state);
    return trip;
  }

  function activatePass(passName) {
    const state = readState();
    const user = getCurrentUser();
    if (!user) return { ok: false, message: "Please log in to activate a pass." };

    state.passes = state.passes.map((pass) => ({
      ...pass,
      active: pass.name === passName
    }));

    state.payments.unshift({
      id: `pay_${Date.now()}`,
      userId: user.id,
      routeCode: passName,
      method: "MoMo",
      amount: state.passes.find((pass) => pass.name === passName)?.price || 35,
      date: "Today"
    });

    writeState(state);
    void persistStateToDatabase(state);
    return { ok: true, activePass: passName };
  }

  function recordPayment(routeCode, method, amount) {
    const state = readState();
    const user = getCurrentUser();
    if (!user) return { ok: false, message: "Please log in to record a payment." };

    const route = state.routes.find((item) => String(item.code || "").toUpperCase() === String(routeCode || "B12").trim().toUpperCase());
    const payment = {
      id: `pay_${Date.now()}`,
      userId: user.id,
      routeCode: routeCode || "B12",
      method: method || "Mobile Money",
      amount: Number(amount) || 7,
      date: "Today"
    };

    state.payments.unshift(payment);

    if (route) {
      route.passengerCount = (Number(route.passengerCount) || 0) + 1;
    }

    writeState(state);
    void persistStateToDatabase(state);
    return { ok: true, payment };
  }

  function isAuthenticated() {
    return Boolean(getCurrentUser());
  }

  const API = {
    STORAGE_KEY,
    readState,
    writeState,
    createDefaultState,
    getCurrentUser,
    getRoutes,
    getRouteByCode,
    getRoutePassengerCount,
    setRoutePrice,
    setRouteOrigin,
    setRouteDestination,
    getVehicles,
    addVehicle,
    getFleetNotifications,
    addAlightRequest,
    getPassPlans,
    registerUser,
    loginUser,
    logoutUser,
    signInWithProvider,
    validateProviderEmail,
    isAuthenticated,
    getAccountSummary,
    updateJourney,
    activatePass,
    recordPayment,
    findUserByIdentifier,
    setCurrentUserId,
    getUserById: (userId) => readState().users.find((user) => user.id === userId) || null
  };

  window.SmartBusBackend = API;
  window.PicTroBackend = API;

  if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
      void hydrateStateFromDatabase();
    });
  }
})();
