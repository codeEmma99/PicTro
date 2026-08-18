const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const db = new Database(path.join(__dirname, "pictro.db"));
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function initDatabase() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('PASSENGER','DRIVER','MATE','MANAGER','ADMIN')),
      city TEXT DEFAULT 'Accra',
      preferred_route TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      name TEXT NOT NULL,
      fare REAL NOT NULL,
      seats INTEGER NOT NULL DEFAULT 14,
      eta TEXT DEFAULT '2 min'
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      route_code TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      route_code TEXT NOT NULL,
      from_place TEXT NOT NULL,
      to_place TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      valid_days INTEGER NOT NULL,
      journeys_included INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT UNIQUE NOT NULL,
      model TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      driver_phone TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 14,
      photo_url TEXT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      current_lat REAL NOT NULL DEFAULT 5.6072,
      current_lng REAL NOT NULL DEFAULT -0.1818,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id TEXT,
      route_code TEXT,
      stop_name TEXT,
      station TEXT,
      count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      seen_by_driver INTEGER NOT NULL DEFAULT 0
    );
  `);

  const routeCount = db.prepare("SELECT COUNT(*) AS count FROM routes").get().count;
  if (routeCount === 0) {
    db.prepare(`
      INSERT INTO routes (code, origin, destination, name, fare, seats, eta)
      VALUES
        ('B12', 'East Legon', 'Circle', 'East Legon → Circle', 7.00, 14, '2 min'),
        ('A04', 'Madina', '37 Station', 'Madina → 37 Station', 6.50, 8, '6 min'),
        ('C21', 'Kasoa', 'Accra Central', 'Kasoa → Accra Central', 9.00, 21, '11 min')
    `).run();
  }

  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount === 0) {
    db.prepare(`
      INSERT INTO users (full_name, email, phone, password, role, city, preferred_route)
      VALUES
        ('Akosua K.', 'akosua@pictro.com', '0551234567', 'demo123', 'PASSENGER', 'Accra', 'B12'),
        ('Kofi Mensah', 'driver@pictro.com', '0241234567', 'driver123', 'DRIVER', 'Accra', 'B12'),
        ('Esi Afriyie', 'mate@pictro.com', '0261234567', 'mate123', 'MATE', 'Accra', 'A04'),
        ('Ama S.', 'admin@pictro.com', '0200000000', 'admin123', 'MANAGER', 'Accra', 'B12')
    `).run();
  }

  const passCount = db.prepare("SELECT COUNT(*) AS count FROM passes").get().count;
  if (passCount === 0) {
    db.prepare(`
      INSERT INTO passes (name, price, valid_days, journeys_included, active)
      VALUES
        ('Weekly Pass', 35.00, 7, 14, 1),
        ('Monthly Pass', 120.00, 30, 60, 0)
    `).run();
  }

  const vehicleCount = db.prepare("SELECT COUNT(*) AS count FROM vehicles").get().count;
  if (vehicleCount === 0) {
    db.prepare(`
      INSERT INTO vehicles (plate, model, driver_name, driver_phone, capacity, photo_url, origin, destination, current_lat, current_lng, status)
      VALUES
        ('GW-6021', 'Toyota Coaster', 'Kofi Mensah', '0241234567', 14, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80', 'East Legon', 'Circle', 5.6072, -0.1818, 'active'),
        ('GA-7348', 'Mercedes Sprinter', 'Yaw Abeka', '0249876543', 18, 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80', 'Madina', '37 Station', 5.6475, -0.1692, 'active')
    `).run();
  }

  const notificationCount = db.prepare("SELECT COUNT(*) AS count FROM notifications").get().count;
  if (notificationCount === 0) {
    db.prepare(`
      INSERT INTO notifications (type, user_id, route_code, stop_name, station, count, seen_by_driver)
      VALUES
        ('alight', 'user_akosua', 'B12', 'Accra Mall', NULL, 0, 0),
        ('station', NULL, NULL, NULL, 'Circle', 12, 0)
    `).run();
  }
}

function normalizeRole(role) {
  const value = String(role || "PASSENGER").trim().toUpperCase();
  const valid = ["PASSENGER", "DRIVER", "MATE", "MANAGER", "ADMIN"];
  return valid.includes(value) ? value : "PASSENGER";
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "PicTro API is running" });
});

app.get("/api/routes", (req, res) => {
  const rows = db.prepare("SELECT * FROM routes ORDER BY code").all();
  res.json(rows);
});

app.post("/api/routes", (req, res) => {
  const { routes } = req.body || {};
  if (!Array.isArray(routes) || !routes.length) {
    return res.status(400).json({ ok: false, message: "Route list is required." });
  }

  const replace = db.transaction(() => {
    db.prepare("DELETE FROM routes").run();
    const insert = db.prepare(`
      INSERT INTO routes (code, origin, destination, name, fare, seats, eta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const route of routes) {
      insert.run(
        String(route.code || ""),
        String(route.origin || route.name?.split("→")?.[0] || "Accra"),
        String(route.destination || route.name?.split("→")?.slice(1).join("→") || "Circle"),
        String(route.name || `${route.origin || "Accra"} → ${route.destination || "Circle"}`),
        Number(route.fare || route.price || 0),
        Number(route.seats || 14),
        String(route.eta || "2 min")
      );
    }
  });

  try {
    replace();
    res.json({ ok: true, routes: db.prepare("SELECT * FROM routes ORDER BY code").all() });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Routes could not be saved to the database." });
  }
});

app.get("/api/users", (req, res) => {
  const rows = db.prepare("SELECT id, full_name, email, phone, role, city, preferred_route, created_at FROM users ORDER BY id").all();
  res.json(rows);
});

app.get("/api/user/:id", (req, res) => {
  const row = db.prepare("SELECT id, full_name, email, phone, role, city, preferred_route, created_at FROM users WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, message: "User not found" });
  res.json({ ok: true, user: row });
});

app.post("/api/login", (req, res) => {
  const { identifier, password } = req.body || {};
  const key = String(identifier || "").trim();
  const pass = String(password || "");

  if (!key || !pass) {
    return res.status(400).json({ ok: false, message: "Email/phone and password are required." });
  }

  const user = db.prepare(`
    SELECT id, full_name, email, phone, password, role, city, preferred_route
    FROM users
    WHERE LOWER(email) = LOWER(?) OR phone = ?
    LIMIT 1
  `).get(key, key);

  if (!user) {
    return res.status(401).json({ ok: false, message: "We could not find that account." });
  }

  if (user.password !== pass) {
    return res.status(401).json({ ok: false, message: "Incorrect password. Please try again." });
  }

  const { password: _password, ...safeUser } = user;
  res.json({ ok: true, user: safeUser });
});

app.post("/api/register", (req, res) => {
  const { fullName, email, phone, password, role } = req.body || {};

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ ok: false, message: "Please complete every field to create your account." });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ ok: false, message: "Your password must be at least 8 characters long." });
  }

  const duplicate = db.prepare(`
    SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?
  `).get(email, phone);

  if (duplicate) {
    return res.status(409).json({ ok: false, message: "An account already exists with that email or phone number." });
  }

  const roleValue = normalizeRole(role);
  const insert = db.prepare(`
    INSERT INTO users (full_name, email, phone, password, role, city, preferred_route)
    VALUES (?, ?, ?, ?, ?, 'Accra', ?)
  `);

  const result = insert.run(fullName.trim(), email.trim(), phone.trim(), password.trim(), roleValue, roleValue === "DRIVER" ? "B12" : "B12");

  const user = db.prepare(`
    SELECT id, full_name, email, phone, role, city, preferred_route
    FROM users WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ ok: true, user });
});

app.get("/api/payments", (req, res) => {
  const rows = db.prepare("SELECT * FROM payments ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/payments", (req, res) => {
  const { userId, routeCode, method, amount } = req.body || {};
  if (!userId || !routeCode || !method || amount === undefined) {
    return res.status(400).json({ ok: false, message: "Payment details are incomplete." });
  }

  const payment = db.prepare(`
    INSERT INTO payments (user_id, route_code, method, amount)
    VALUES (?, ?, ?, ?)
  `).run(Number(userId), String(routeCode), String(method), Number(amount));

  res.status(201).json({ ok: true, paymentId: payment.lastInsertRowid });
});

app.get("/api/trips", (req, res) => {
  const rows = db.prepare("SELECT * FROM trips ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/trips", (req, res) => {
  const { userId, routeCode, fromPlace, toPlace } = req.body || {};
  if (!userId || !routeCode || !fromPlace || !toPlace) {
    return res.status(400).json({ ok: false, message: "Trip details are incomplete." });
  }

  const result = db.prepare(`
    INSERT INTO trips (user_id, route_code, from_place, to_place)
    VALUES (?, ?, ?, ?)
  `).run(Number(userId), String(routeCode), String(fromPlace), String(toPlace));

  res.status(201).json({ ok: true, tripId: result.lastInsertRowid });
});

app.get("/api/passes", (req, res) => {
  const rows = db.prepare("SELECT * FROM passes ORDER BY id").all();
  res.json(rows);
});

app.get("/api/vehicles", (req, res) => {
  const rows = db.prepare("SELECT * FROM vehicles ORDER BY id").all();
  res.json(rows);
});

app.post("/api/vehicles", (req, res) => {
  const { plate, model, driverName, driverPhone, capacity, photoUrl, origin, destination, currentLat, currentLng, status } = req.body || {};

  if (!plate || !model || !driverName || !driverPhone || !origin || !destination) {
    return res.status(400).json({ ok: false, message: "Vehicle details are incomplete." });
  }

  const result = db.prepare(`
    INSERT INTO vehicles (plate, model, driver_name, driver_phone, capacity, photo_url, origin, destination, current_lat, current_lng, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(plate).trim(),
    String(model).trim(),
    String(driverName).trim(),
    String(driverPhone).trim(),
    Number(capacity) || 14,
    String(photoUrl || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80"),
    String(origin).trim(),
    String(destination).trim(),
    Number(currentLat) || 5.6072,
    Number(currentLng) || -0.1818,
    String(status || "active").trim() || "active"
  );

  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ok: true, vehicle });
});

app.get("/api/notifications", (req, res) => {
  const rows = db.prepare("SELECT * FROM notifications ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/notifications", (req, res) => {
  const { type, userId, routeCode, stopName, station, count } = req.body || {};
  const result = db.prepare(`
    INSERT INTO notifications (type, user_id, route_code, stop_name, station, count, seen_by_driver)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(
    String(type || "station"),
    userId ? String(userId) : null,
    routeCode ? String(routeCode) : null,
    stopName ? String(stopName) : null,
    station ? String(station) : null,
    Number(count) || 0
  );

  const notification = db.prepare("SELECT * FROM notifications WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ ok: true, notification });
});

app.post("/api/routes/:code/price", (req, res) => {
  const { amount } = req.body || {};
  const price = Number(amount);
  const routeCode = String(req.params.code || "").trim();

  if (!routeCode || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ ok: false, message: "Set a valid fare greater than zero." });
  }

  const update = db.prepare(`
    UPDATE routes SET fare = ? WHERE code = ?
  `).run(price, routeCode);

  if (update.changes === 0) {
    return res.status(404).json({ ok: false, message: "That route is not available on the network." });
  }

  const route = db.prepare("SELECT * FROM routes WHERE code = ?").get(routeCode);
  res.json({ ok: true, route });
});

app.post("/api/routes/:code/destination", (req, res) => {
  const routeCode = String(req.params.code || "").trim();
  const origin = String(req.body?.origin || "").trim();
  const destination = String(req.body?.destination || "").trim();

  if (!routeCode || !destination) {
    return res.status(400).json({ ok: false, message: "Route destination is required." });
  }

  const route = db.prepare("SELECT * FROM routes WHERE code = ?").get(routeCode);
  if (!route) {
    return res.status(404).json({ ok: false, message: "That route is not available on the network." });
  }

  const nextOrigin = origin || route.origin;
  const update = db.prepare(`
    UPDATE routes SET origin = ?, destination = ?, name = ? WHERE code = ?
  `).run(nextOrigin, destination, `${nextOrigin} → ${destination}`, routeCode);

  if (update.changes === 0) {
    return res.status(500).json({ ok: false, message: "Route could not be updated." });
  }

  const updated = db.prepare("SELECT * FROM routes WHERE code = ?").get(routeCode);
  res.json({ ok: true, route: updated });
});

app.get("/api/summary/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const user = db.prepare("SELECT id, full_name, email, phone, role, city, preferred_route FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });

  const activePass = db.prepare("SELECT * FROM passes WHERE active = 1 LIMIT 1").get() || db.prepare("SELECT * FROM passes ORDER BY id LIMIT 1").get();
  const paymentHistory = db.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC LIMIT 3").all(userId);
  const recentTrips = db.prepare("SELECT * FROM trips WHERE user_id = ? ORDER BY id DESC LIMIT 2").all(userId);

  res.json({
    ok: true,
    user,
    activePass,
    paymentHistory,
    recentTrips,
    stats: {
      tripsThisMonth: recentTrips.length + 16,
      savedThisWeek: 12,
      rewardPoints: 340
    }
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

initDatabase();

app.listen(PORT, () => {
  console.log(`PicTro API is running at http://localhost:${PORT}`);
});
