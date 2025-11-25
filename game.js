// Game State
const gameState = {
    money: 100,
    level: 1,
    customersServed: 0,
    inventory: [],
    tables: [],
    stations: {
        1: { unlocked: true, cooking: false, currentFood: null, progress: 0 },
        2: { unlocked: false, cooking: false, currentFood: null, progress: 0 }
    },
    upgrades: {
        cookingSpeed: 0,
        tables: 3,
        earnings: 0
    },
    customers: [],
    nextCustomerId: 1
};

// Food Data
const foodData = {
    burger: { name: 'Burger', icon: '🍔', cookTime: 5000, price: 15 },
    pizza: { name: 'Pizza', icon: '🍕', cookTime: 8000, price: 25 },
    coffee: { name: 'Coffee', icon: '☕', cookTime: 3000, price: 10 }
};

// Customer Icons
const customerIcons = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🧔'];

// Initialize Game
function initGame() {
    updateUI();
    createTables();
    setupEventListeners();
    startCustomerSpawning();

    // Load saved game if exists
    loadGame();
}

// Create Tables
function createTables() {
    const tablesContainer = document.getElementById('tablesContainer');
    tablesContainer.innerHTML = '';

    for (let i = 0; i < gameState.upgrades.tables; i++) {
        const table = {
            id: i,
            occupied: false,
            customer: null
        };
        gameState.tables.push(table);

        const tableElement = createTableElement(table);
        tablesContainer.appendChild(tableElement);
    }
}

function createTableElement(table) {
    const div = document.createElement('div');
    div.className = 'table empty';
    div.id = `table-${table.id}`;
    div.innerHTML = `
        <div class="table-base">
            <div class="table-top"></div>
        </div>
        <div class="table-content">
            <div class="table-number">Table ${table.id + 1}</div>
        </div>
    `;
    return div;
}

// Setup Event Listeners
function setupEventListeners() {
    // Cooking buttons
    document.querySelectorAll('.cook-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const food = e.currentTarget.dataset.food;
            const station = e.currentTarget.dataset.station;
            startCooking(food, station);
        });
    });

    // Unlock station buttons
    document.querySelectorAll('.unlock-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const station = e.currentTarget.dataset.station;
            unlockStation(station);
        });
    });

    // Upgrade buttons
    document.getElementById('speedUpgrade').addEventListener('click', () => upgradeSpeed());
    document.getElementById('tableUpgrade').addEventListener('click', () => upgradeTable());
    document.getElementById('earningsUpgrade').addEventListener('click', () => upgradeEarnings());
}

// Cooking System
function startCooking(foodType, stationId) {
    const station = gameState.stations[stationId];

    if (!station.unlocked) {
        showNotification('This station is locked!', 'error');
        return;
    }

    if (station.cooking) {
        showNotification('Station is busy!', 'error');
        return;
    }

    const food = foodData[foodType];
    const cookTime = food.cookTime * (1 - gameState.upgrades.cookingSpeed * 0.1);

    station.cooking = true;
    station.currentFood = foodType;
    station.progress = 0;

    // Update UI
    const stationElement = document.getElementById(`station${stationId}`);
    const progressBar = stationElement.querySelector('.progress-fill');
    const cookingItem = stationElement.querySelector('.cooking-item');
    const serveBtnElement = stationElement.querySelector('.serve-btn');
    const cookButtons = stationElement.querySelectorAll('.cook-btn');

    cookButtons.forEach(btn => btn.disabled = true);
    cookingItem.textContent = `Cooking ${food.icon}`;

    // Animate progress
    const startTime = Date.now();
    const cookingInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / cookTime) * 100, 100);
        station.progress = progress;
        progressBar.style.width = progress + '%';

        if (progress >= 100) {
            clearInterval(cookingInterval);
            finishCooking(stationId);
        }
    }, 50);
}

function finishCooking(stationId) {
    const station = gameState.stations[stationId];
    const stationElement = document.getElementById(`station${stationId}`);
    const progressBar = stationElement.querySelector('.progress-fill');
    const cookingItem = stationElement.querySelector('.cooking-item');
    const serveBtnElement = stationElement.querySelector('.serve-btn');
    const cookButtons = stationElement.querySelectorAll('.cook-btn');

    const food = foodData[station.currentFood];
    cookingItem.textContent = `${food.icon} Ready!`;
    serveBtnElement.style.display = 'block';

    // Add to inventory button
    serveBtnElement.onclick = () => {
        gameState.inventory.push(station.currentFood);
        updateInventoryUI();

        // Reset station
        station.cooking = false;
        station.currentFood = null;
        station.progress = 0;
        progressBar.style.width = '0%';
        cookingItem.textContent = '';
        serveBtnElement.style.display = 'none';
        cookButtons.forEach(btn => btn.disabled = false);

        showNotification(`${food.icon} ${food.name} ready to serve!`, 'success');
    };
}

function unlockStation(stationId) {
    const cost = 200;

    if (gameState.money < cost) {
        showNotification('Not enough money!', 'error');
        return;
    }

    gameState.money -= cost;
    gameState.stations[stationId].unlocked = true;

    const stationElement = document.getElementById(`station${stationId}`);
    stationElement.classList.remove('locked');
    stationElement.querySelector('.unlock-message').style.display = 'none';
    stationElement.querySelector('.food-buttons').style.display = 'flex';

    updateUI();
    showNotification('Station unlocked!', 'success');
}

// Inventory Management
function updateInventoryUI() {
    const inventoryElement = document.getElementById('inventory');
    inventoryElement.innerHTML = '';

    if (gameState.inventory.length === 0) {
        inventoryElement.innerHTML = '<div class="inventory-placeholder">Cook food to fill your tray!</div>';
        return;
    }

    const foodCount = {};
    gameState.inventory.forEach(food => {
        foodCount[food] = (foodCount[food] || 0) + 1;
    });

    Object.keys(foodCount).forEach(foodType => {
        const food = foodData[foodType];
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.textContent = `${food.icon} x${foodCount[foodType]}`;
        div.title = `Click to serve ${food.name}`;
        inventoryElement.appendChild(div);
    });
}

// Customer System
function startCustomerSpawning() {
    setInterval(() => {
        if (Math.random() < 0.3) { // 30% chance every interval
            spawnCustomer();
        }
    }, 5000);
}

function spawnCustomer() {
    const emptyTable = gameState.tables.find(t => !t.occupied);

    if (!emptyTable) {
        return; // No empty tables
    }

    const foodTypes = Object.keys(foodData);
    const randomFood = foodTypes[Math.floor(Math.random() * foodTypes.length)];
    const customerIcon = customerIcons[Math.floor(Math.random() * customerIcons.length)];

    const customer = {
        id: gameState.nextCustomerId++,
        icon: customerIcon,
        order: randomFood,
        patience: 100,
        tableId: emptyTable.id,
        satisfied: true
    };

    emptyTable.occupied = true;
    emptyTable.customer = customer;
    gameState.customers.push(customer);

    updateTableUI(emptyTable);
    startPatienceDecrease(customer);

    showNotification(`New customer at Table ${emptyTable.id + 1}!`, 'info');
}

function startPatienceDecrease(customer) {
    const interval = setInterval(() => {
        customer.patience -= 2;

        if (customer.patience <= 0) {
            clearInterval(interval);
            customerLeaves(customer, false);
        }

        if (customer.patience <= 30) {
            customer.satisfied = false;
        }

        updatePatienceBar(customer);
    }, 1000);

    customer.patienceInterval = interval;
}

function updatePatienceBar(customer) {
    const table = gameState.tables.find(t => t.id === customer.tableId);
    if (!table) return;

    const tableElement = document.getElementById(`table-${table.id}`);
    const patienceBar = tableElement.querySelector('.patience-fill');
    if (patienceBar) {
        patienceBar.style.width = customer.patience + '%';
    }
}

function updateTableUI(table) {
    const tableElement = document.getElementById(`table-${table.id}`);

    if (table.occupied && table.customer) {
        const customer = table.customer;
        const food = foodData[customer.order];

        tableElement.className = 'table occupied';
        tableElement.innerHTML = `
            <div class="table-base">
                <div class="table-top"></div>
            </div>
            <div class="table-content">
                <div class="table-number">Table ${table.id + 1}</div>
                <div class="customer">${customer.icon}</div>
                <div class="order-label">Wants</div>
                <div class="customer-order">${food.icon}</div>
                <div class="patience-bar">
                    <div class="patience-fill"></div>
                </div>
                <button class="serve-table-btn" onclick="serveCustomer(${table.id})" ${
                    gameState.inventory.includes(customer.order) ? '' : 'disabled'
                }>Serve</button>
            </div>
        `;
    } else {
        tableElement.className = 'table empty';
        tableElement.innerHTML = `
            <div class="table-base">
                <div class="table-top"></div>
            </div>
            <div class="table-content">
                <div class="table-number">Table ${table.id + 1}</div>
            </div>
        `;
    }
}

function serveCustomer(tableId) {
    const table = gameState.tables[tableId];
    if (!table || !table.customer) return;

    const customer = table.customer;
    const foodIndex = gameState.inventory.indexOf(customer.order);

    if (foodIndex === -1) {
        showNotification('You don\'t have that food!', 'error');
        return;
    }

    // Remove food from inventory
    gameState.inventory.splice(foodIndex, 1);
    updateInventoryUI();

    // Calculate earnings
    const basePrice = foodData[customer.order].price;
    const earningsMultiplier = 1 + (gameState.upgrades.earnings * 0.2);
    const satisfactionBonus = customer.satisfied ? 1.5 : 1;
    const earnings = Math.floor(basePrice * earningsMultiplier * satisfactionBonus);

    gameState.money += earnings;
    gameState.customersServed++;

    // Level up
    if (gameState.customersServed % 10 === 0) {
        gameState.level++;
        showNotification(`🎉 Level Up! Now level ${gameState.level}!`, 'success');
    }

    // Clear patience interval
    clearInterval(customer.patienceInterval);

    // Show earnings
    showNotification(`+$${earnings} ${customer.satisfied ? '⭐' : ''}`, 'success');

    // Remove customer
    customerLeaves(customer, true);

    updateUI();
    saveGame();
}

function customerLeaves(customer, served) {
    const table = gameState.tables.find(t => t.id === customer.tableId);
    if (!table) return;

    table.occupied = false;
    table.customer = null;

    gameState.customers = gameState.customers.filter(c => c.id !== customer.id);

    if (!served) {
        showNotification('Customer left unhappy! 😢', 'error');
    }

    updateTableUI(table);
}

// Expose serveCustomer to global scope
window.serveCustomer = serveCustomer;

// Upgrades System
function upgradeSpeed() {
    const cost = 150 * (gameState.upgrades.cookingSpeed + 1);

    if (gameState.money < cost) {
        showNotification('Not enough money!', 'error');
        return;
    }

    gameState.money -= cost;
    gameState.upgrades.cookingSpeed++;

    document.getElementById('speedUpgradeCost').textContent = 150 * (gameState.upgrades.cookingSpeed + 1);

    updateUI();
    showNotification('Cooking speed upgraded! ⚡', 'success');
    saveGame();
}

function upgradeTable() {
    const cost = 300 * gameState.upgrades.tables;

    if (gameState.money < cost) {
        showNotification('Not enough money!', 'error');
        return;
    }

    gameState.money -= cost;
    gameState.upgrades.tables++;

    // Add new table
    const newTable = {
        id: gameState.tables.length,
        occupied: false,
        customer: null
    };
    gameState.tables.push(newTable);

    const tablesContainer = document.getElementById('tablesContainer');
    const tableElement = createTableElement(newTable);
    tablesContainer.appendChild(tableElement);

    document.getElementById('tableUpgradeCost').textContent = 300 * gameState.upgrades.tables;

    updateUI();
    showNotification('New table added! 💺', 'success');
    saveGame();
}

function upgradeEarnings() {
    const cost = 250 * (gameState.upgrades.earnings + 1);

    if (gameState.money < cost) {
        showNotification('Not enough money!', 'error');
        return;
    }

    gameState.money -= cost;
    gameState.upgrades.earnings++;

    document.getElementById('earningsUpgradeCost').textContent = 250 * (gameState.upgrades.earnings + 1);

    updateUI();
    showNotification('Earnings upgraded! 💵', 'success');
    saveGame();
}

// UI Updates
function updateUI() {
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('customersServed').textContent = gameState.customersServed;

    // Update serve buttons based on inventory
    gameState.tables.forEach(table => {
        if (table.occupied && table.customer) {
            const hasFood = gameState.inventory.includes(table.customer.order);
            const btn = document.querySelector(`#table-${table.id} .serve-table-btn`);
            if (btn) {
                btn.disabled = !hasFood;
            }
        }
    });
}

// Notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Save/Load Game
function saveGame() {
    const saveData = {
        money: gameState.money,
        level: gameState.level,
        customersServed: gameState.customersServed,
        upgrades: gameState.upgrades,
        stations: gameState.stations
    };
    localStorage.setItem('happyRestaurantSave', JSON.stringify(saveData));
}

function loadGame() {
    const savedData = localStorage.getItem('happyRestaurantSave');
    if (savedData) {
        const data = JSON.parse(savedData);
        gameState.money = data.money || 100;
        gameState.level = data.level || 1;
        gameState.customersServed = data.customersServed || 0;

        if (data.upgrades) {
            gameState.upgrades = data.upgrades;

            // Update costs in UI
            document.getElementById('speedUpgradeCost').textContent =
                150 * (gameState.upgrades.cookingSpeed + 1);
            document.getElementById('tableUpgradeCost').textContent =
                300 * gameState.upgrades.tables;
            document.getElementById('earningsUpgradeCost').textContent =
                250 * (gameState.upgrades.earnings + 1);

            // Recreate tables if needed
            if (gameState.upgrades.tables !== 3) {
                gameState.tables = [];
                createTables();
            }
        }

        if (data.stations) {
            // Restore unlocked stations
            if (data.stations[2]?.unlocked) {
                gameState.stations[2].unlocked = true;
                const station2 = document.getElementById('station2');
                station2.classList.remove('locked');
                station2.querySelector('.unlock-message').style.display = 'none';
                station2.querySelector('.food-buttons').style.display = 'flex';
            }
        }

        updateUI();
        showNotification('Game loaded! Welcome back! 🎮', 'success');
    }
}

// Auto-save every 30 seconds
setInterval(() => {
    saveGame();
}, 30000);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
