// Restaurant City - Clean Rebuild
// Simple, viewable, playable game

// Game State
const game = {
    money: 500,
    level: 1,
    rating: 5.0,
    customers: [],
    tables: [],
    inventory: {},
    autoServe: false,
    nextCustomerId: 1
};

// Food Types
const foods = {
    burger: { name: 'Burger', icon: '🍔', price: 15, cookTime: 3000 },
    pizza: { name: 'Pizza', icon: '🍕', price: 25, cookTime: 5000 },
    coffee: { name: 'Coffee', icon: '☕', price: 10, cookTime: 2000 }
};

// Initialize Game
function initGame() {
    // Create initial tables
    for (let i = 0; i < 4; i++) {
        addTableToGame();
    }

    // Start customer spawning
    setInterval(spawnCustomer, 5000);

    // Update UI
    updateUI();

    showNotification('Welcome to Restaurant City! 🍽️', 'info');
}

// Cook Food
function cookFood(foodType) {
    const food = foods[foodType];
    if (!food) return;

    const statusDiv = document.getElementById('cookingStatus');
    statusDiv.innerHTML = `Cooking ${food.icon} ${food.name}...`;

    setTimeout(() => {
        // Add to inventory
        if (!game.inventory[foodType]) {
            game.inventory[foodType] = 0;
        }
        game.inventory[foodType]++;

        statusDiv.innerHTML = `${food.icon} ${food.name} ready!`;
        updateFoodInventory();
        showNotification(`${food.icon} ${food.name} is ready!`, 'success');

        // Clear status after 2s
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 2000);
    }, food.cookTime);
}

// Update Food Inventory Display
function updateFoodInventory() {
    const inventoryDiv = document.getElementById('foodInventory');
    inventoryDiv.innerHTML = '';

    for (const [foodType, count] of Object.entries(game.inventory)) {
        if (count > 0) {
            const food = foods[foodType];
            const foodDiv = document.createElement('div');
            foodDiv.className = 'food-item';
            foodDiv.innerHTML = `
                ${food.icon}
                <span class="food-count">×${count}</span>
            `;
            inventoryDiv.appendChild(foodDiv);
        }
    }
}

// Add Table
function addTable() {
    if (game.money < 100) {
        showNotification('Not enough money!', 'error');
        return;
    }

    game.money -= 100;
    addTableToGame();
    updateUI();
    showNotification('New table added! 🪑', 'success');
}

function addTableToGame() {
    const tableId = game.tables.length;
    const table = {
        id: tableId,
        occupied: false,
        customer: null
    };

    game.tables.push(table);

    // Create table element
    const diningArea = document.getElementById('diningArea');
    const tableDiv = document.createElement('div');
    tableDiv.className = 'table';
    tableDiv.id = `table-${tableId}`;
    tableDiv.innerHTML = `
        <div class="table-number">Table ${tableId + 1}</div>
    `;
    diningArea.appendChild(tableDiv);
}

// Spawn Customer
function spawnCustomer() {
    // Find empty table
    const emptyTable = game.tables.find(t => !t.occupied);
    if (!emptyTable) return;

    // Random food order
    const foodTypes = Object.keys(foods);
    const randomFood = foodTypes[Math.floor(Math.random() * foodTypes.length)];

    const customer = {
        id: game.nextCustomerId++,
        tableId: emptyTable.id,
        order: randomFood,
        patience: 100
    };

    emptyTable.occupied = true;
    emptyTable.customer = customer;
    game.customers.push(customer);

    // Update table UI
    updateTableUI(emptyTable);

    // Start patience countdown
    startPatienceCountdown(customer);

    updateUI();
}

function updateTableUI(table) {
    const tableDiv = document.getElementById(`table-${table.id}`);
    if (!tableDiv) return;

    if (table.occupied && table.customer) {
        const customer = table.customer;
        const food = foods[customer.order];
        const hasFood = game.inventory[customer.order] > 0;

        tableDiv.className = 'table occupied';
        tableDiv.innerHTML = `
            <div class="table-number">Table ${table.id + 1}</div>
            <div class="customer">👤</div>
            <div class="order">${food.icon}</div>
            <div class="patience-bar">
                <div class="patience-fill" style="width: ${customer.patience}%"></div>
            </div>
            <button class="serve-btn" onclick="serveCustomer(${table.id})" ${hasFood ? '' : 'disabled'}>
                Serve
            </button>
        `;
    } else {
        tableDiv.className = 'table';
        tableDiv.innerHTML = `
            <div class="table-number">Table ${table.id + 1}</div>
        `;
    }
}

function startPatienceCountdown(customer) {
    const interval = setInterval(() => {
        customer.patience -= 2;

        if (customer.patience <= 0) {
            clearInterval(interval);
            customerLeaves(customer, false);
        }

        // Update UI
        const table = game.tables.find(t => t.id === customer.tableId);
        if (table) {
            const patienceBar = document.querySelector(`#table-${table.id} .patience-fill`);
            if (patienceBar) {
                patienceBar.style.width = customer.patience + '%';
            }
        }
    }, 1000);

    customer.patienceInterval = interval;
}

// Serve Customer
function serveCustomer(tableId) {
    const table = game.tables[tableId];
    if (!table || !table.customer) return;

    const customer = table.customer;
    const food = foods[customer.order];

    // Check if we have the food
    if (!game.inventory[customer.order] || game.inventory[customer.order] <= 0) {
        showNotification('Food not available!', 'error');
        return;
    }

    // Remove food from inventory
    game.inventory[customer.order]--;

    // Calculate earnings
    const earnings = food.price;
    game.money += earnings;

    // Clear patience interval
    clearInterval(customer.patienceInterval);

    showNotification(`Served ${food.icon}! +$${earnings}`, 'success');

    // Customer leaves happy
    customerLeaves(customer, true);

    updateFoodInventory();
    updateUI();
}

function customerLeaves(customer, happy) {
    const table = game.tables.find(t => t.id === customer.tableId);
    if (!table) return;

    // Update rating
    if (happy) {
        game.rating = Math.min(5.0, game.rating + 0.1);
    } else {
        game.rating = Math.max(1.0, game.rating - 0.3);
        showNotification('Customer left unhappy! 😢', 'error');
    }

    // Clear table
    table.occupied = false;
    table.customer = null;

    // Remove customer
    game.customers = game.customers.filter(c => c.id !== customer.id);

    // Update table UI
    updateTableUI(table);
    updateUI();

    // Check level up
    if (game.money >= game.level * 200) {
        levelUp();
    }
}

function levelUp() {
    game.level++;
    showNotification(`🎉 Level Up! Now Level ${game.level}!`, 'success');
    updateUI();
}

// Toggle Auto Serve
function toggleAutoServe() {
    game.autoServe = !game.autoServe;
    const text = document.getElementById('autoServeText');
    text.textContent = `🤖 Auto-Serve: ${game.autoServe ? 'ON' : 'OFF'}`;
    showNotification(`Auto-Serve ${game.autoServe ? 'enabled' : 'disabled'}`, 'info');
}

// Auto-serve check
setInterval(() => {
    if (!game.autoServe) return;

    game.tables.forEach(table => {
        if (table.occupied && table.customer) {
            const hasFood = game.inventory[table.customer.order] > 0;
            if (hasFood) {
                serveCustomer(table.id);
            }
        }
    });
}, 1000);

// Hire Staff (placeholder)
function hireStaff() {
    showNotification('Staff hiring coming soon! 👥', 'info');
}

// Show Recipes (placeholder)
function showRecipes() {
    let recipeList = '';
    for (const [key, food] of Object.entries(foods)) {
        recipeList += `${food.icon} ${food.name} - $${food.price}\n`;
    }
    alert('Available Recipes:\n\n' + recipeList);
}

// Update UI
function updateUI() {
    document.getElementById('money').textContent = game.money;
    document.getElementById('level').textContent = game.level;
    document.getElementById('customers').textContent = game.customers.length;
    document.getElementById('rating').textContent = game.rating.toFixed(1);
}

// Notifications
function showNotification(message, type = 'success') {
    const notifDiv = document.createElement('div');
    notifDiv.className = `notification ${type}`;
    notifDiv.textContent = message;

    document.getElementById('notifications').appendChild(notifDiv);

    setTimeout(() => {
        notifDiv.remove();
    }, 3000);
}

// Start game when page loads
document.addEventListener('DOMContentLoaded', initGame);
