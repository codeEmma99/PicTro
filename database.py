import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "pictro.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.executescript(
        """
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
        """
    )

    if conn.execute("SELECT COUNT(*) FROM routes").fetchone()[0] == 0:
        conn.executemany(
            """
            INSERT INTO routes (code, origin, destination, name, fare, seats, eta)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("B12", "East Legon", "Circle", "East Legon → Circle", 7.00, 14, "2 min"),
                ("A04", "Madina", "37 Station", "Madina → 37 Station", 6.50, 8, "6 min"),
                ("C21", "Kasoa", "Accra Central", "Kasoa → Accra Central", 9.00, 21, "11 min"),
            ],
        )

    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        conn.executemany(
            """
            INSERT INTO users (full_name, email, phone, password, role, city, preferred_route)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("Akosua K.", "akosua@pictro.com", "0551234567", "demo123", "PASSENGER", "Accra", "B12"),
                ("Kofi Mensah", "driver@pictro.com", "0241234567", "driver123", "DRIVER", "Accra", "B12"),
                ("Esi Afriyie", "mate@pictro.com", "0261234567", "mate123", "MATE", "Accra", "A04"),
                ("Ama S.", "admin@pictro.com", "0200000000", "admin123", "MANAGER", "Accra", "B12"),
            ],
        )

    if conn.execute("SELECT COUNT(*) FROM passes").fetchone()[0] == 0:
        conn.executemany(
            """
            INSERT INTO passes (name, price, valid_days, journeys_included, active)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                ("Weekly Pass", 35.00, 7, 14, 1),
                ("Monthly Pass", 120.00, 30, 60, 0),
            ],
        )

    if conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0] == 0:
        conn.executemany(
            """
            INSERT INTO vehicles (plate, model, driver_name, driver_phone, capacity, photo_url, origin, destination, current_lat, current_lng, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("GW-6021", "Toyota Coaster", "Kofi Mensah", "0241234567", 14, "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80", "East Legon", "Circle", 5.6072, -0.1818, "active"),
                ("GA-7348", "Mercedes Sprinter", "Yaw Abeka", "0249876543", 18, "https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=900&q=80", "Madina", "37 Station", 5.6475, -0.1692, "active"),
            ],
        )

    if conn.execute("SELECT COUNT(*) FROM notifications").fetchone()[0] == 0:
        conn.executemany(
            """
            INSERT INTO notifications (type, user_id, route_code, stop_name, station, count, seen_by_driver)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                ("alight", "user_akosua", "B12", "Accra Mall", None, 0, 0),
                ("station", None, None, None, "Circle", 12, 0),
            ],
        )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
