const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const appDataPath = app.getPath("appData");
const dbPath = path.join(appDataPath, "IQS.sqlite3");

// Check if the database file exists, if not create a new one
if (!fs.existsSync(dbPath)) {
  console.log("Database not found. Creating new database at:", dbPath);
  fs.writeFileSync(dbPath, ""); // Create an empty file
}

const db = new Database(dbPath);

// For SELECTs use db.prepare(...).all() or .get()
// For INSERT, UPDATE, DELETE use db.prepare(...).run()

function getComponents() {
  return db.prepare("SELECT * FROM components WHERE archived = 0").all();
}

function exportComponentsToJSON(filePath) {
  const components = db.prepare("SELECT * FROM components").all();
  fs.writeFileSync(filePath, JSON.stringify(components, null, 2));
  return filePath;
}

function exportComponentsToCSV(filePath) {
  const components = db.prepare("SELECT * FROM components").all();
  const csv = [
    "ID,Name,Description,Price,Archived",
    ...components.map(c =>
      `${c.id},"${c.name}","${c.description}",${c.unit_price},${c.archived}`
    )
  ].join("\n");
  fs.writeFileSync(filePath, csv);
  return filePath;
}

function addComponent({ name, description, unit_price }) {
  const stmt = db.prepare("INSERT INTO components (name, description, unit_price) VALUES (?, ?, ?)");
  const info = stmt.run(name, description, unit_price);
  return info.lastInsertRowid;
}

function getComponent(id) {
  return db.prepare("SELECT * FROM components WHERE id = ?").get(id);
}

function deleteComponent(id) {
  const stmt = db.prepare("DELETE FROM components WHERE id = ?");
  stmt.run(id);
}

function archiveComponent(id) {
  const stmt = db.prepare("UPDATE components SET archived = 1 WHERE id = ?");
  stmt.run(id);
}

function initDatabase() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

function createQuote(quote) {
  const stmt = db.prepare(`
    INSERT INTO quotes (client_name, date, notes, total_price, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const totalPrice = quote.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const info = stmt.run(quote.client_name, quote.date, quote.notes, totalPrice, quote.status || 'draft');
  const quoteId = info.lastInsertRowid;

  const itemStmt = db.prepare(`
    INSERT INTO quote_items (quote_id, component_id, quantity, total_price)
    VALUES (?, ?, ?, ?)
  `);

  quote.items.forEach(item => {
    itemStmt.run(quoteId, item.component_id, item.quantity, item.quantity * item.unit_price);
  });

  // Update the total price in the quotes table after inserting items
  db.prepare(`
    UPDATE quotes
    SET total_price = (SELECT SUM(total_price) FROM quote_items WHERE quote_id = ?),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(quoteId, quoteId);

  return quoteId;
}

function getAllQuotes() {
  const quotes = db.prepare(`SELECT * FROM quotes`).all();

  const itemStmt = db.prepare(`
    SELECT qi.*, c.name, c.description, c.unit_price
    FROM quote_items qi 
    JOIN components c ON c.id = qi.component_id 
    WHERE qi.quote_id = ?
  `);

  return quotes.map(quote => {
    const items = itemStmt.all(quote.id);
    return { ...quote, items };
  });
}


function getQuote(id) {
  const quote = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
  if (!quote) return null;

  const items = db.prepare(`
    SELECT qi.*, c.name, c.description, c.unit_price
    FROM quote_items qi 
    JOIN components c ON c.id = qi.component_id 
    WHERE qi.quote_id = ?
  `).all(id);

  quote.items = items;
  return quote;
}


module.exports = {
  getComponents,
  exportComponentsToJSON,
  exportComponentsToCSV,
  addComponent,
  getComponent,
  deleteComponent,
  archiveComponent,
  initDatabase,
  createQuote,
  getAllQuotes,
  getQuote
};