// renderer.js

///////////////////////
// Initial load
///////////////////////

// This script handles the main functionality of the application, including loading components, managing quotes, and handling UI interactions.
// It uses the Electron API to interact with the main process and the database.
// Ensure the DOM is fully loaded before executing any code
// This is important to ensure all elements are available for manipulation.

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    const containers = {
      quotationContainer: document.getElementById("quotationContainer"),
      quoteManagementContainer: document.getElementById("quoteManagementContainer"),
      addComponentContainer: document.getElementById("addComponentContainer")
    };

    const toggleContainer = (showId) => {
      Object.entries(containers).forEach(([id, el]) => {
        el.style.display = (id === showId) ? "block" : "none";
      });
    };

    // Make toggleContainer available globally
    window.toggleContainer = toggleContainer;

    // Load content and wait until all sections are injected
    await loadSectionContent();

    // Now that DOM is injected, you can safely bind events
    document.getElementById("btnQuotation").addEventListener("click", () => toggleContainer("quotationContainer"));
    document.getElementById("btnManagement").addEventListener("click", () => toggleContainer("quoteManagementContainer"));
    document.getElementById("btnAddComponent").addEventListener("click", () => toggleContainer("addComponentContainer"));

    // Safe to call now since elements exist
    if (document.getElementById("components")) await loadComponents();
    if (document.getElementById("quotesTable")) await loadQuotes();
    if (document.getElementById("componentTable")) await loadComponentList();
    if (document.getElementById("quoteList")) await loadAllQuotes();

    // Initial view
    toggleContainer("quotationContainer");
  })();
});


///////////////////////
// Load components into the table (Quotation Section)
///////////////////////
async function loadComponents() {
  const container = document.getElementById("components");
  if (!container) {
    console.warn("loadComponents skipped: #components element not found.");
    return;
  }

  try {
    const components = await window.api.getComponents(false);
    container.innerHTML = "";

    components.forEach(component => {
      const row = createComponentRow(component);
      container.appendChild(row);
    });

    setupEventListeners(container);
  } catch (error) {
    console.error("Failed to load components:", error);
    alert("Error loading components. Please try again.");
    location.reload();
  }
}
window.loadComponents = loadComponents;


async function refreshComponentTable() {
  const components = await window.api.getComponents(false);
  populateComponentTable(components);
}

///////////////////////
// Export components (Quotation Section)
///////////////////////
function exportComponentsToCSV(filename = "components.csv") {
  const rows = [];
  document.querySelectorAll("#components tr").forEach(row => {
    const cols = row.querySelectorAll("td");
    const data = Array.from(cols).map(col => col.textContent);
    rows.push(data);
  });
  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

}
window.exportComponentsToCSV = exportComponentsToCSV;


async function loadSectionContent() {
  const quotationHTML = await fetch("sections/quotation.html").then(res => res.text());
  const managementHTML = await fetch("sections/management.html").then(res => res.text());
  const addComponentHTML = await fetch("sections/add-component.html").then(res => res.text());

  document.getElementById("quotationContainer").innerHTML = quotationHTML;
  document.getElementById("quoteManagementContainer").innerHTML = managementHTML;
  document.getElementById("addComponentContainer").innerHTML = addComponentHTML;
}
window.loadSectionContent = loadSectionContent;

function clearQuotationForm() {
  document.getElementById("clientName").value = "";
  document.getElementById("quoteDate").value = "";
  document.getElementById("notes").value = "";
  
  // Clear components table (if you have quantities or selected components)
  const componentsTableBody = document.getElementById("components");
  if (componentsTableBody) {
    componentsTableBody.innerHTML = "";  // or reset quantities in rows as needed
  }

  // Reset total display
  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = "0.00";
}


///////////////////////
// setupEventListeners (handles qty changes & checkbox toggles)
///////////////////////
function setupEventListeners(container) {
  container.querySelectorAll(".qty").forEach(input => {
    input.addEventListener("input", updateSubtotal);
  });

  container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener("change", handleCheckboxChange);
  });
}
window.setupEventListeners = setupEventListeners;

///////////////////////
// Create one row for a component
///////////////////////
function createComponentRow(component) {
  const row = document.createElement("tr");
  row.className = "item";
  row.innerHTML = `
    <td>
      <input type="checkbox" class="component-check"
             data-id="${component.id}"
             data-price="${component.unit_price}"
             data-name="${component.name}"
             data-description="${component.description}">
    </td>
    <td class="componentName">${component.name}</td>
    <td class="componentDescription">${component.description}</td>
    <td class="componentPrice">${component.unit_price.toFixed(2)}</td>
    <td>
      <input type="number"
             min="0"
             value="0"
             class="qty quantity">
    </td>
    <td class="subtotal">PHP 0.00</td>
  `;
  return row;
}
window.createComponentRow = createComponentRow;

///////////////////////
// Update one row’s subtotal when its quantity changes
///////////////////////
function updateSubtotal(e) {
  const item = e.target.closest(".item");
  const price = parseFloat(item.querySelector('input[type="checkbox"]').dataset.price);
  const quantity = parseInt(e.target.value || "0");
  const subtotalCell = item.querySelector(".subtotal");
  subtotalCell.textContent = `PHP ${(price * quantity).toFixed(2)}`;
  calculateTotal();
}
window.updateSubtotal = updateSubtotal;

///////////////////////
// Handle checkbox change: enable/disable qty & recalc total
///////////////////////
function handleCheckboxChange(e) {
  if (e.target.matches('input[type="checkbox"]')) {
    const qtyInput = e.target.closest(".item").querySelector(".qty");
    qtyInput.disabled = !e.target.checked;
    if (!e.target.checked) {
      qtyInput.value = 0;
      e.target.closest(".item").querySelector(".subtotal").textContent = "PHP 0.00";
    }
    calculateTotal();
  }
}
window.handleCheckboxChange = handleCheckboxChange;

///////////////////////
// Calculate total price for all checked rows
///////////////////////
function calculateTotal() {
  let total = 0;
  document.querySelectorAll("#components input[type=checkbox]").forEach(cb => {
    if (cb.checked) {
      const qty = parseInt(cb.closest(".item").querySelector(".qty").value || "0");
      const price = parseFloat(cb.dataset.price);
      total += qty * price;
    }
  });
  document.getElementById("total").textContent = total.toFixed(2);
}
window.calculateTotal = calculateTotal;

///////////////////////
// Submit a quote (called by Submit Quote button)
///////////////////////
async function submitQuote() {
  const name = document.getElementById("clientName").value;
  const date = document.getElementById("quoteDate").value;
  const notes = document.getElementById("notes").value;

  const items = [];
  document.querySelectorAll(".component-check").forEach(checkbox => {
    if (checkbox.checked) {
      const row = checkbox.closest("tr");
      const quantity = parseInt(row.querySelector(".qty").value || "0");
      const price = parseFloat(checkbox.dataset.price);
      const component_id = parseInt(checkbox.dataset.id);

      if (quantity > 0) {
        items.push({
          component_id,
          quantity,
          unit_price: price
        });
      }
    }
  });

  if (!items.length) {
    alert("No components selected!");
    return;
  }

  const quoteObj = {
    client_name: name,
    date,
    notes,
    items
  };
  
  
  window.electron.invoke("create-quote", quoteObj)
  .then(quoteId => {
    alert(`Quote submitted with ID: ${quoteId}`);
    // If you have a modal, hide it. Otherwise, just reset the form.
    if (document.getElementById("modal")) {
      document.getElementById("modal").style.display = "none";
    }
    refreshComponentTable();
  })
  .catch(err => {
    console.error("Error submitting quote:", err);
    alert("Something went wrong while submitting the quote.");
    if (document.getElementById("modal")) {
      document.getElementById("modal").style.display = "none";
    }
    refreshComponentTable();
  });
  clearAddComponentForm(); // Clear the add component form
  document.getElementById("clientName").value = ""; // Clear client name input
  document.getElementById("notes").value = ""; // Clear notes input
  clearQuotationForm();
  calculateTotal(); // Reset total display
  document.getElementById("quoteId").value = ""; // Clear quote ID input
  document.getElementById("quoteDate").value = ""; // Clear date input  
}
window.submitQuote = submitQuote;

///////////////////////
// Wrapper for the Submit button (HTML calls this)
///////////////////////
function submitQuoteHandler() {
  submitQuote();
}
window.submitQuoteHandler = submitQuoteHandler;

///////////////////////
// Get selected items (not directly used by HTML, but available)
///////////////////////
function getSelectedItems() {
  const items = [];
  document.querySelectorAll("#components input[type=checkbox]").forEach(cb => {
    if (cb.checked) {
      const qty = parseInt(cb.closest(".item").querySelector(".qty").value || "0");
      if (qty > 0) {
        items.push({
          component_id: parseInt(cb.dataset.id),
          name: cb.dataset.name,
          unit_price: parseFloat(cb.dataset.price),
          quantity: qty
        });
      }
    }
  });
  return items;
}
window.getSelectedItems = getSelectedItems;

///////////////////////
// Reset the quote form
///////////////////////
function resetForm() {
  document.getElementById("clientName").value = "";
  document.getElementById("quoteDate").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("total").textContent = "0.00";
  loadComponents();
}
window.resetForm = resetForm;

///////////////////////
// Add a new component (called by “Add Component” form)
///////////////////////
async function addComponent() {
  const name = document.getElementById("newName").value.trim();
  const description = document.getElementById("newDescription").value.trim();
  const unit_price = parseFloat(document.getElementById("newPrice").value);

  if (!name || isNaN(unit_price)) {
    alert("Please enter valid component name and price.");
    return;
  }

  await window.api.addComponent({ name, description, unit_price });
  alert("Component added!");
  loadComponents();
  clearAddComponentForm(); // Clear the add component form
  document.getElementById("clientName").value = ""; // Clear client name input
  document.getElementById("notes").value = ""; // Clear notes input
  clearQuotationForm();
  calculateTotal(); // Reset total display
  document.getElementById("quoteId").value = ""; // Clear quote ID input
  document.getElementById("quoteDate").value = ""; // Clear date input  
}
window.addComponent = addComponent;

///////////////////////
// Clear Add Component form
///////////////////////
function clearAddComponentForm() {
  document.getElementById("newName").value = "";
  document.getElementById("newDescription").value = "";
  document.getElementById("newPrice").value = "";
  document.getElementById("newQuantity").value = "";
}
window.clearAddComponentForm = clearAddComponentForm;

///////////////////////	
// Submit the Add Quote form
///////////////////////
async function createQuote() {
  const clientName = document.getElementById("clientName").value.trim();
  const date = document.getElementById("quoteDate").value;
  const notes = document.getElementById("notes").value.trim();

  if (!clientName || !date) {
    alert("Please fill in all required fields.");
    return;
  }

  const items = getSelectedItems();
  if (items.length === 0) {
    alert("Please select at least one component.");
    return;
  }

  const quoteData = {
    client_name: clientName,
    date,
    notes,
    total_price: items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    status: "draft",
    items: items.map(item => ({
      component_id: item.component_id,
      quantity: item.quantity,
      total_price: item.unit_price * item.quantity
    }))
  };

  try {
    const quoteId = await window.api.createQuote(quoteData);
    alert(`Quote created successfully with ID: ${quoteId}`);
    resetForm();
  } catch (error) {
    console.error("Error creating quote:", error);
    alert("Failed to create quote. Please try again.");
  }
}

///////////////////////
// Manually export a single quote as PDF
///////////////////////
async function manualExport() {
  const id = parseInt(document.getElementById("quoteId").value);
  const data = await window.api.getQuote(id);
  if (!data) {
    alert("Quote not found.");
    return;
  }
  await window.api.exportQuote(data);
  alert("Quote exported.");
}
window.manualExport = manualExport;

function loadQuote(id) {
  document.getElementById("quoteId").value = id;
  getQuote();
}
window.loadQuote = loadQuote;


///////////////////////
// Load all available quotes into #quoteList
///////////////////////
async function loadAllQuotes() {
  const quoteContainer = document.getElementById("quoteList");
  const quotes = await window.api.getAllQuotes();
  if (!quotes.length) {
    quoteContainer.innerHTML = "<p>No quotes available.</p>";
    return;
  }

  quoteContainer.innerHTML = `
    <h3>All Quotes</h3>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Client Name</th>
          <th>Date</th>
          <th>Total Price</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${quotes.map(quote => `
          <tr>
            <td>${quote.id}</td>
            <td>${quote.client_name}</td>
            <td>${quote.date}</td>
            <td>PHP ${quote.items.reduce((total, item) => total + item.quantity * item.unit_price, 0).toFixed(2)}</td>
            <td>
              <button onclick="loadQuote(${quote.id})">View</button>
              <button onclick="viewQuoteAsPDF(${quote.id})">Export PDF</button>
              <button onclick="deleteQuote(${quote.id})">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  console.log("Loaded all quotes:", quotes);
}
window.loadAllQuotes = loadAllQuotes;

///////////////////////
// Just fetch quote data & alert (used by “Fetch Quote” button)
///////////////////////
function getQuote() {
  const id = parseInt(document.getElementById("quoteId").value);
  if (isNaN(id)) {
    alert("Invalid quote ID");
    return;
  }

  window.electron.invoke("get-quote", id)
    .then(quote => {
      if (!quote) {
        alert("Quote not found");
        return;
      }

      // Instead of just alerting...
      window.electron.invoke("preview-quote", quote); // Show the quote visually
    })
    .catch(err => {
      console.error("Error fetching quote", err);
    });
}
window.getQuote = getQuote;

async function deleteQuote(id) {
  if (confirm("Are you sure you want to delete this quote?")) {
    try {
      await window.api.deleteQuote(id);
      alert("Quote deleted successfully.");
      loadAllQuotes(); // Refresh the list
    } catch (error) {
      console.error("Error deleting quote:", error);
      alert("Failed to delete quote. Please try again.");
    }
  }
}

///////////////////////
// View a quote as PDF (called by “View as PDF”)
///////////////////////
function viewQuoteAsPDF() {
  const id = parseInt(document.getElementById("quoteId").value);
  if (isNaN(id)) {
    alert("Enter a valid Quote ID.");
    return;
  }

  window.electron.invoke("get-quote", id)
    .then(quote => {
      if (!quote) {
        alert("Quote not found.");
        return;
      }
      return window.electron.invoke("view-quote-pdf", quote);
    })
    .then(filePath => {
      if (filePath) {
        alert(`PDF saved to: ${filePath}`);
      }
    })
    .catch(err => {
      console.error("Failed to generate PDF:", err);
      alert("Error generating PDF.");
    });
}
window.viewQuoteAsPDF = viewQuoteAsPDF;

///////////////////////
// Load (active or archived) component list (Quote Management section)
///////////////////////

let arrayedComponents = [];

async function loadComponentList(archived = false) {
  const list = document.getElementById("componentList");
  const components = await window.api.getComponents(archived);
  console.log("Components loaded:", components, Array.isArray(components));

  arrayedComponents = components;

  list.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Unit Price</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${components.map(createComponentListRow).join("")}
      </tbody>
    </table>
  `;
  return arrayedComponents;
}
window.loadComponentList = loadComponentList;

///////////////////////
// Create one row for the component-management table
///////////////////////
function createComponentListRow(component) {
  return `
    <tr>
      <td>${component.name}</td>
      <td>PHP ${component.unit_price.toFixed(2)}</td>
      <td>
        <button onclick="archiveComponent(${component.id})">Archive</button>
        <button onclick="deleteComponent(${component.id})">Delete</button>
      </td>
    </tr>
  `;
}
window.createComponentListRow = createComponentListRow;

///////////////////////
// Delete a component (Quote Management)
///////////////////////
async function deleteComponent(id) {
  if (confirm("Delete this component?")) {
    await window.api.deleteComponent(id);
    loadComponentList();
  }
}
window.deleteComponent = deleteComponent;

///////////////////////
// Archive a component (Quote Management)
///////////////////////
async function archiveComponent(id) {
  if (confirm("Archive this component?")) {
    await window.api.archiveComponent(id);
    loadComponentList();
  }
}
window.archiveComponent = archiveComponent;

///////////////////////
// Export the component list (Quote Management)
///////////////////////
async function exportComponentList() {
  const file = await window.api.exportComponents();
  if (file) {
    alert("Component list exported to:\n" + file);
  }
}
window.exportComponentList = exportComponentList;

///////////////////////
// Import quotes from CSV (Quote Management)
///////////////////////
async function importQuotesFromCSV(event) {
  const input = document.getElementById("importQuotesFromCSV");
  if (!input.files.length) {
    alert("Please select a CSV file to import.");
    return;
  }

  const file = input.files[0];
  const text = await file.text();
  // Assuming you have a parseCSV() helper:
  const quotes = parseCSV(text);
  await window.api.importQuotes(quotes);
  alert("Quotes imported successfully.");
}
window.importQuotesFromCSV = importQuotesFromCSV;

///////////////////////
// Export all quotes to CSV (Quote Management)
///////////////////////
async function exportQuotesToCSV() {
  const quotes = await window.api.getAllQuotes();
  if (!quotes.length) {
    alert("No quotes available to export.");
    return;
  }

  const csvRows = ["ID,Client Name,Date,Notes,Items"];
  quotes.forEach(quote => {
    const items = quote.items.map(item => `${item.component_id} (${item.quantity})`).join("; ");
    csvRows.push(`${quote.id},${quote.client_name},${quote.date},${quote.notes || ""},"${items}"`);
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "quotes.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
window.exportQuotesToCSV = exportQuotesToCSV;

///////////////////////
// Helper: parseCSV (very basic, assumes no commas inside fields)
///////////////////////
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const id = parseInt(cols[0]);
    const client_name = cols[1];
    const date = cols[2];
    const notes = cols[3];
    const itemsField = cols[4].replace(/(^")|("$)/g, "");
    const itemsArr = itemsField.split("; ").map(pair => {
      const [compIdPart, qtyPart] = pair.split(" ");
      const component_id = parseInt(compIdPart);
      const quantity = parseInt(qtyPart.replace(/[()]/g, ""));
      return { component_id, quantity };
    });

    result.push({ id, client_name, date, notes, items: itemsArr });
  }

  return result;
}
window.parseCSV = parseCSV;
///////////////////////


///////////////////////
// User Management
///////////////////////
async function addUser() {
  const userName = prompt("Enter new user name:");
  if (!userName) {
    alert("User name cannot be empty.");
    return;
  }
  try {
    await window.api.addUser({ name: userName });
    alert("User added successfully.");
    viewUsers();
  } catch (error) {
    console.error("Error adding user:", error);
    alert("Failed to add user.");
  }
}
window.addUser = addUser;

async function removeUser() {
  const userId = prompt("Enter user ID to remove:");
  if (!userId) {
    alert("User ID cannot be empty.");
    return;
  }
  try {
    await window.api.removeUser(parseInt(userId));
    alert("User removed successfully.");
    viewUsers();
  } catch (error) {
    console.error("Error removing user:", error);
    alert("Failed to remove user.");
  }
}
window.removeUser = removeUser;

async function viewUsers() {
  try {
    const users = await window.api.getUsers();
    alert("Users:\n" + users.map(user => `${user.id}: ${user.name}`).join("\n"));
  } catch (error) {
    console.error("Error viewing users:", error);
    alert("Failed to retrieve users.");
  }
}
window.viewUsers = viewUsers;

///////////////////////
// Content Management
///////////////////////
async function addContent() {
  const content = prompt("Enter new content:");
  if (!content) {
    alert("Content cannot be empty.");
    return;
  }
  try {
    await window.api.addContent({ content });
    alert("Content added successfully.");
  } catch (error) {
    console.error("Error adding content:", error);
    alert("Failed to add content.");
  }
}
window.addContent = addContent;

async function editContent() {
  const contentId = prompt("Enter content ID to edit:");
  const newContent = prompt("Enter new content:");
  if (!contentId || !newContent) {
    alert("Content ID and new content cannot be empty.");
    return;
  }
  try {
    await window.api.editContent(parseInt(contentId), { content: newContent });
    alert("Content edited successfully.");
  } catch (error) {
    console.error("Error editing content:", error);
    alert("Failed to edit content.");
  }
}
window.editContent = editContent;

async function deleteContent() {
  const contentId = prompt("Enter content ID to delete:");
  if (!contentId) {
    alert("Content ID cannot be empty.");
    return;
  }
  try {
    await window.api.deleteContent(parseInt(contentId));
    alert("Content deleted successfully.");
  } catch (error) {
    console.error("Error deleting content:", error);
    alert("Failed to delete content.");
  }
}
window.deleteContent = deleteContent;

///////////////////////
// System Settings
///////////////////////
async function updateSettings() {
  const settings = prompt("Enter new settings (JSON format):");
  try {
    const parsedSettings = JSON.parse(settings);
    await window.api.updateSettings(parsedSettings);
    alert("Settings updated successfully.");
  } catch (error) {
    console.error("Error updating settings:", error);
    alert("Failed to update settings.");
  }
}
window.updateSettings = updateSettings;

async function viewLogs() {
  try {
    const logs = await window.api.getLogs();
    alert("Logs:\n" + logs.join("\n"));
  } catch (error) {
    console.error("Error viewing logs:", error);
    alert("Failed to retrieve logs.");
  }
}
window.viewLogs = viewLogs;

async function backupData() {
  try {
    const backupPath = await window.api.backupData();
    alert(`Data backed up successfully to: ${backupPath}`);
  } catch (error) {
    console.error("Error backing up data:", error);
    alert("Failed to backup data.");
  }
}
window.backupData = backupData;

///////////////////////
// Database Settings
///////////////////////
async function configureDatabase() {
  const config = prompt("Enter database configuration (JSON format):");
  try {
    const parsedConfig = JSON.parse(config);
    await window.api.configureDatabase(parsedConfig);
    alert("Database configured successfully.");
  } catch (error) {
    console.error("Error configuring database:", error);
    alert("Failed to configure database.");
  }
}
window.configureDatabase = configureDatabase;

async function optimizeDatabase() {
  try {
    await window.api.optimizeDatabase();
    alert("Database optimized successfully.");
  } catch (error) {
    console.error("Error optimizing database:", error);
    alert("Failed to optimize database.");
  }
}
window.optimizeDatabase = optimizeDatabase;

async function clearDatabase() {
  if (confirm("Are you sure you want to clear the database? This action cannot be undone.")) {
    try {
      await window.api.clearDatabase();
      alert("Database cleared successfully.");
    } catch (error) {
      console.error("Error clearing database:", error);
      alert("Failed to clear database.");
    }
  }
}
const modal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginConfirm');
const cancelBtn = document.getElementById('loginCancel');

function showLoginModal() {
  modal.classList.remove('hidden');
  document.getElementById('loginUsername').focus();
}

function hideLoginModal() {
  modal.classList.add('hidden');
}

loginBtn.onclick = () => {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  // Send to main process if needed (example below)
  window.api.send('login-attempt', { username, password });

  hideLoginModal();
};

cancelBtn.onclick = hideLoginModal;

// Optionally close modal on ESC key or clicking outside
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideLoginModal();
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) hideLoginModal(); // outside click
});
