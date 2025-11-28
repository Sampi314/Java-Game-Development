// Simple Restaurant City Game

let money = 100;
let level = 1;
let inventory = {};
let tables = [];
let customers = [];

// Initialize
window.onload = function() {
    // Create 4 tables
    for (let i = 0; i < 4; i++) {
        createTable(i);
    }

    // Spawn customers every 5 seconds
    setInterval(spawnCustomer, 5000);

    updateUI();
};

// Cook food
function cook(food) {
    setTimeout(() => {
        if (!inventory[food]) inventory[food] = 0;
        inventory[food]++;
        updateInventory();
        alert(food + ' ready!');
    }, 2000);
}

// Update inventory display
function updateInventory() {
    let html = '';
    for (let food in inventory) {
        if (inventory[food] > 0) {
            let icon = food === 'burger' ? '🍔' : '🍕';
            html += `<div class="food-item">${icon} x${inventory[food]}</div>`;
        }
    }
    document.getElementById('inventory').innerHTML = html;
}

// Create table
function createTable(id) {
    tables[id] = { occupied: false, customer: null };

    let tableDiv = document.createElement('div');
    tableDiv.className = 'table';
    tableDiv.id = 'table-' + id;
    tableDiv.innerHTML = `
        <div>Table ${id + 1}</div>
    `;
    document.getElementById('tables').appendChild(tableDiv);
}

// Spawn customer
function spawnCustomer() {
    // Find empty table
    let emptyTable = -1;
    for (let i = 0; i < tables.length; i++) {
        if (!tables[i].occupied) {
            emptyTable = i;
            break;
        }
    }

    if (emptyTable === -1) return;

    // Random order
    let orders = ['burger', 'pizza'];
    let order = orders[Math.floor(Math.random() * orders.length)];

    // Create customer
    let customer = {
        table: emptyTable,
        order: order,
        patience: 60
    };

    tables[emptyTable].occupied = true;
    tables[emptyTable].customer = customer;
    customers.push(customer);

    updateTable(emptyTable);

    // Patience countdown
    let interval = setInterval(() => {
        customer.patience--;
        if (customer.patience <= 0) {
            clearInterval(interval);
            customerLeave(customer, false);
        }
    }, 1000);
    customer.interval = interval;
}

// Update table display
function updateTable(id) {
    let table = tables[id];
    let div = document.getElementById('table-' + id);

    if (table.occupied) {
        let order = table.customer.order;
        let icon = order === 'burger' ? '🍔' : '🍕';
        let hasFood = inventory[order] && inventory[order] > 0;

        div.className = 'table occupied';
        div.innerHTML = `
            <div>Table ${id + 1}</div>
            <div class="customer">👤</div>
            <div>Wants: ${icon}</div>
            <div>⏱️ ${table.customer.patience}s</div>
            <button onclick="serve(${id})" ${hasFood ? '' : 'disabled'}>Serve</button>
        `;
    } else {
        div.className = 'table';
        div.innerHTML = `<div>Table ${id + 1}</div>`;
    }
}

// Serve customer
function serve(tableId) {
    let table = tables[tableId];
    if (!table.occupied) return;

    let customer = table.customer;
    let order = customer.order;

    if (!inventory[order] || inventory[order] <= 0) return;

    // Remove food
    inventory[order]--;
    updateInventory();

    // Add money
    money += 20;

    // Customer leaves happy
    clearInterval(customer.interval);
    customerLeave(customer, true);

    updateUI();
}

// Customer leaves
function customerLeave(customer, happy) {
    let tableId = customer.table;
    tables[tableId].occupied = false;
    tables[tableId].customer = null;

    customers = customers.filter(c => c !== customer);

    updateTable(tableId);

    if (!happy) {
        alert('Customer left unhappy!');
    }
}

// Update UI
function updateUI() {
    document.getElementById('money').textContent = money;
    document.getElementById('level').textContent = level;
}
