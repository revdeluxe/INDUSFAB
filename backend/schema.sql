-- Table for components
CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    unit_price REAL,
    quantity INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0
);

-- Table for quotes
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT,
    date TEXT,
    notes TEXT,
    total_price REAL,
    status TEXT CHECK(status IN ('draft', 'sent', 'accepted', 'rejected')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    archived INTEGER DEFAULT 0
);

-- Table for quote items
CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    component_id INTEGER,
    quantity INTEGER DEFAULT 1,
    total_price REAL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
);

-- Table for users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE,
    role TEXT CHECK(role IN ('admin', 'user')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    max_login_attempts INTEGER DEFAULT 3
);

CREATE TABLE IF NOT EXISTS otps (
  username TEXT,
  otp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    timestamp INTEGER,
    success INTEGER
);
CREATE TABLE IF NOT EXISTS locked_users (
    username TEXT PRIMARY KEY,
    locked_until INTEGER
);