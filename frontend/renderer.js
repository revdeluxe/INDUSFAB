const API_BASE = 'http://127.0.0.1:8000';

let selectedItems = [];

async function loadComponents() {
  const res = await fetch(`${API_BASE}/components`);
  const data = await res.json();
  
  const container = document.getElementById('components');
  container.innerHTML = data.map(comp => `
    <div class="item">
      <strong>${comp.name}</strong> <br/>
      ${comp.description} <br/>
      Price: $${comp.unit_price} <br/>
      Qty: <input type="number" min="0" data-id="${comp.id}" data-price="${comp.unit_price}" onchange="updateItem(this)" />
    </div>
  `).join('');
}


function updateItem(input) {
  const id = parseInt(input.dataset.id);
  const price = parseFloat(input.dataset.price);
  const qty = parseInt(input.value);

  const idx = selectedItems.findIndex(i => i.component_id === id);
  if (idx > -1) selectedItems.splice(idx, 1);
  if (qty > 0) selectedItems.push({ component_id: id, quantity: qty });

  const total = selectedItems.reduce((sum, item) => {
    const p = document.querySelector(`[data-id="${item.component_id}"]`).dataset.price;
    return sum + item.quantity * parseFloat(p);
  }, 0);
  document.getElementById('total').textContent = total.toFixed(2);
}

async function submitQuote() {
  const name = document.getElementById('clientName').value;
  const date = document.getElementById('quoteDate').value;
  const notes = document.getElementById('notes').value;

  if (!name || !date || selectedItems.length === 0) {
    alert("Please fill out all fields and select at least one item.");
    return;
  }

  const payload = {
    client_name: name,
    date: date,
    notes: notes,
    items: selectedItems
  };

  const res = await fetch(`${API_BASE}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await res.json();
  alert(`Quote Created! ID: ${result.quote_id}`);
  resetForm();
}

function resetForm() {
  selectedItems = [];
  document.getElementById('clientName').value = '';
  document.getElementById('quoteDate').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('total').textContent = '0.00';
  loadComponents();
}

async function getQuote() {
  const id = document.getElementById('quoteId').value;
  if (!id) return;
  const res = await fetch(`${API_BASE}/quote/${id}`);
  const data = await res.json();
  document.getElementById('quoteResult').textContent = JSON.stringify(data, null, 2);
}

loadComponents();
