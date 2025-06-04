INDUSFAB is a cross-platform desktop application designed to assist industrial machine shops in managing machine utilization and manufacturing quotations efficiently. Its primary objectives include reducing downtime, optimizing machine performance, and streamlining cost estimation for custom manufacturing jobs. By combining machine tracking with an automated quotation system, INDUSFAB empowers businesses to enhance operational efficiency, minimize costs, and deliver accurate pricing to their clients.

---

## 💡 Technology Stack

INDUSFAB leverages the following technologies:

- ⚡ **Electron**: Desktop application framework
- 📦 **Node.js**: Backend runtime environment
- 🗃️ **better-sqlite3**: High-performance SQLite library for Node.js

---

## 📁 Project Structure

```
indusfab/
├── frontend/
│   ├── main.js           # Electron main process
│   ├── index.html        # Frontend UI
│   └── package.json      # Electron configuration
├── build/                # Output directory for packaged executables
```

---

## 🖥️ Frontend: Electron

### 🔧 Development Mode

```bash
cd frontend
npm install
npm start
```

### 📦 Building the Electron App

```bash
npm run package
```

Ensure the SQLite database file (`database.db`) is included in the final build.

---

## 🗃️ SQLite Database

- The `schema.sql` file is auto-generated on the first run.
- Example table schema:

```sql
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
    FOREIGN KEY(client_name) REFERENCES clients(name)
);

-- Table for quote items
CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    component_id INTEGER,
    quantity INTEGER DEFAULT 1,
    total_price REAL,
    FOREIGN KEY(quote_id) REFERENCES quotes(id),
    FOREIGN KEY(component_id) REFERENCES components(id)
);
```

## 📜 IPC Main Handlers Summary

### 1. **get-components**
Fetches all components from the database.
- **Returns**: Array of components.

### 2. **delete-component**
Deletes a component by its ID.
- **Parameters**:
  - `id` (number): ID of the component to delete.
- **Returns**: Result of the deletion operation.

### 3. **archive-component**
Archives a component by its ID.
- **Parameters**:
  - `id` (number): ID of the component to archive.
- **Returns**: Result of the archiving operation.

### 4. **export-components**
Exports all components to a JSON file.
- **Returns**: File path of the exported JSON file.

### 5. **add-component**
Adds a new component to the database.
- **Parameters**:
  - `component` (object): Component details (name, description, unit price, etc.).
- **Returns**: Result of the addition operation.

### 6. **create-quote**
Creates a new quote in the database.
- **Parameters**:
  - `quote` (object): Quote details (items, pricing, etc.).
- **Returns**: Result of the quote creation operation.

### 7. **get-all-quotes**
Fetches all quotes from the database.
- **Returns**: Array of quotes.

### 8. **get-quote**
Fetches a specific quote by its ID.
- **Parameters**:
  - `id` (number): ID of the quote to fetch.
- **Returns**: Full quote object.

### 9. **view-quote-pdf**
Generates a PDF for a given quote and saves it to the user's documents folder.
- **Parameters**:
  - `quote` (object): Quote details to generate the PDF.
- **Returns**: File path of the generated PDF.

### 10. **import-components**
Imports components from a CSV file.
- **Returns**: Object containing success status and number of imported components.

### 11. **get-suggestions**
Provides suggestions based on the given items.
- **Parameters**:
  - `items` (array): Array of item objects (name, unit price, quantity, etc.).
- **Returns**: Array of suggestion strings.

---

## 📝 Future Enhancements

- [ ] Implement user authentication
- [ ] Save user preferences locally
- [ ] Add minimize-to-tray functionality
- [ ] Enable cloud synchronization for data

---

## 📃 References

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [Electron Framework](https://www.electronjs.org)
- [Node.js Documentation](https://nodejs.org/en/)
