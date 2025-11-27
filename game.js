// Game State
const gameState = {
    money: 100,
    level: 1,
    customersServed: 0,
    inventory: [],
    tables: [],
    stations: {
        1: {
            unlocked: true,
            cookingSlots: [
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null }
            ],
            autoCook: false,
            autoCookFood: null
        },
        2: {
            unlocked: false,
            cookingSlots: [
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null }
            ],
            autoCook: false,
            autoCookFood: null
        }
    },
    upgrades: {
        cookingSpeed: 0,
        tables: 3,
        earnings: 0
    },
    customers: [],
    nextCustomerId: 1,
    waiter: {
        position: { x: 50, y: 50 },
        currentFood: null,
        status: 'idle', // idle, moving_to_table, serving, moving_to_kitchen
        targetTable: null,
        servingQueue: []
    },
    autoServe: false
};

// Food Data
const foodData = {
    burger: { name: 'Burger', icon: '🍔', cookTime: 5000, price: 15 },
    pizza: { name: 'Pizza', icon: '🍕', cookTime: 8000, price: 25 },
    coffee: { name: 'Coffee', icon: '☕', cookTime: 3000, price: 10 }
};

// Customer shirt colors for variety
const customerShirtColors = [
    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', // Red
    'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', // Blue
    'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', // Green
    'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', // Orange
    'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', // Purple
    'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)', // Teal
    'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)', // Pink
    'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)'  // Gray
];

// Generate 3D Food Models
function get3DFoodHTML(foodType) {
    switch(foodType) {
        case 'burger':
            return `
                <div class="food-3d burger-3d">
                    <div class="burger-top-bun"></div>
                    <div class="burger-lettuce"></div>
                    <div class="burger-cheese"></div>
                    <div class="burger-patty"></div>
                    <div class="burger-bottom-bun"></div>
                </div>
            `;
        case 'pizza':
            return `
                <div class="food-3d pizza-3d">
                    <div class="pizza-slice">
                        <div class="pizza-cheese"></div>
                        <div class="pizza-pepperoni pepperoni-1"></div>
                        <div class="pizza-pepperoni pepperoni-2"></div>
                        <div class="pizza-pepperoni pepperoni-3"></div>
                    </div>
                </div>
            `;
        case 'coffee':
            return `
                <div class="food-3d coffee-3d">
                    <div class="coffee-cup">
                        <div class="coffee-liquid"></div>
                        <div class="coffee-handle"></div>
                    </div>
                    <div class="coffee-steam">
                        <div class="steam-line steam-1"></div>
                        <div class="steam-line steam-2"></div>
                        <div class="steam-line steam-3"></div>
                    </div>
                </div>
            `;
        default:
            return foodData[foodType]?.icon || '';
    }
}

// Initialize Game
function initGame() {
    updateUI();
    createTables();
    setupEventListeners();
    startCustomerSpawning();
    initializeWaiter();

    // Load saved game if exists
    loadGame();
}

// Initialize Waiter
function initializeWaiter() {
    const waiter = document.getElementById('waiter');
    if (waiter) {
        waiter.style.left = '50%';
        waiter.style.top = '50%';
    }
    updateWaiterTray();
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

    // Auto-cook toggle
    document.querySelectorAll('.auto-cook-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const stationId = e.currentTarget.dataset.station;
            const station = gameState.stations[stationId];
            station.autoCook = e.currentTarget.checked;

            if (station.autoCook) {
                const select = document.querySelector(`.auto-cook-select[data-station="${stationId}"]`);
                if (select.value) {
                    station.autoCookFood = select.value;
                    // Start cooking in all available slots
                    fillAutoCookSlots(stationId);
                    showNotification(`Auto-cook enabled for ${foodData[select.value].name}!`, 'success');
                } else {
                    e.currentTarget.checked = false;
                    station.autoCook = false;
                    showNotification('Please select a food first!', 'error');
                }
            } else {
                showNotification('Auto-cook disabled', 'info');
            }
        });
    });

    // Auto-cook food selection
    document.querySelectorAll('.auto-cook-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const stationId = e.currentTarget.dataset.station;
            const station = gameState.stations[stationId];
            station.autoCookFood = e.currentTarget.value;

            // If auto-cook is enabled, restart with new food
            if (station.autoCook && e.currentTarget.value) {
                showNotification(`Auto-cook updated to ${foodData[e.currentTarget.value].name}`, 'info');
            }
        });
    });

    // Upgrade buttons
    document.getElementById('speedUpgrade').addEventListener('click', () => upgradeSpeed());
    document.getElementById('tableUpgrade').addEventListener('click', () => upgradeTable());
    document.getElementById('earningsUpgrade').addEventListener('click', () => upgradeEarnings());

    // Auto-serve toggle
    const autoServeToggle = document.getElementById('autoServeToggle');
    if (autoServeToggle) {
        autoServeToggle.addEventListener('change', (e) => {
            gameState.autoServe = e.target.checked;
            if (gameState.autoServe) {
                showNotification('🤖 Auto-Serve enabled! Waiter will automatically serve customers.', 'success');
            } else {
                showNotification('Auto-Serve disabled', 'info');
            }
        });
    }
}

// Cooking System
function startCooking(foodType, stationId) {
    const station = gameState.stations[stationId];

    if (!station.unlocked) {
        showNotification('This station is locked!', 'error');
        return;
    }

    // Find an available cooking slot
    const availableSlot = station.cookingSlots.find(slot => !slot.cooking);
    if (!availableSlot) {
        return; // Silently return if no slots available
    }

    const slotIndex = station.cookingSlots.indexOf(availableSlot);
    const food = foodData[foodType];
    const cookTime = food.cookTime * (1 - gameState.upgrades.cookingSpeed * 0.1);

    availableSlot.cooking = true;
    availableSlot.currentFood = foodType;
    availableSlot.progress = 0;

    // Only show notification if not auto-cooking
    if (!station.autoCook) {
        showNotification(`Started cooking ${food.name}!`, 'info');
    }

    // Animate progress
    const startTime = Date.now();
    const cookingInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / cookTime) * 100, 100);
        availableSlot.progress = progress;

        if (progress >= 100) {
            clearInterval(cookingInterval);
            availableSlot.intervalId = null;
            finishCooking(stationId, slotIndex);
        }
    }, 50);

    availableSlot.intervalId = cookingInterval;
    updateStationUI(stationId);
}

// Fill all available slots with auto-cook food
function fillAutoCookSlots(stationId) {
    const station = gameState.stations[stationId];

    if (!station.autoCook || !station.autoCookFood) {
        return;
    }

    // Start cooking in all available slots
    station.cookingSlots.forEach(() => {
        if (station.autoCook && station.autoCookFood) {
            startCooking(station.autoCookFood, stationId);
        }
    });
}

function finishCooking(stationId, slotIndex) {
    const station = gameState.stations[stationId];
    const slot = station.cookingSlots[slotIndex];
    const food = foodData[slot.currentFood];

    // Automatically add to inventory
    gameState.inventory.push(slot.currentFood);
    updateInventoryUI();
    updateUI(); // Update serve buttons when inventory changes

    // Only show notification if not auto-cooking
    if (!station.autoCook) {
        showNotification(`${food.name} ready to serve!`, 'success');
    }

    // Store the cooked food type before resetting
    const cookedFoodType = slot.currentFood;

    // Reset slot
    slot.cooking = false;
    slot.currentFood = null;
    slot.progress = 0;

    updateStationUI(stationId);

    // Auto-cook if enabled - immediately restart in this slot
    if (station.autoCook && station.autoCookFood) {
        setTimeout(() => startCooking(station.autoCookFood, stationId), 300);
    }
}

// Update station UI to show all cooking slots
function updateStationUI(stationId) {
    const station = gameState.stations[stationId];
    const stationElement = document.getElementById(`station${stationId}`);
    const cookingProgress = stationElement.querySelector('.cooking-progress');

    // Create slots display
    let slotsHTML = '';
    station.cookingSlots.forEach((slot, index) => {
        if (slot.cooking) {
            slotsHTML += `
                <div class="cooking-slot" style="margin-bottom: 10px;">
                    <div class="cooking-item-label" style="font-size: 0.85em; margin-bottom: 5px;">
                        <div style="transform: scale(0.6); display: inline-block; vertical-align: middle;">${get3DFoodHTML(slot.currentFood)}</div>
                        Cooking ${foodData[slot.currentFood].name}...
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${slot.progress}%"></div>
                    </div>
                </div>
            `;
        }
    });

    if (slotsHTML) {
        cookingProgress.innerHTML = slotsHTML;
        cookingProgress.style.display = 'block';
    } else {
        cookingProgress.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="cooking-item"></div>
        `;
    }
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

    const unlockMessage = stationElement.querySelector('.unlock-message');
    const autoCookControls = stationElement.querySelector('.auto-cook-controls');
    const foodButtons = stationElement.querySelector('.food-buttons');
    const stationIcon = stationElement.querySelector('.station-icon');

    if (unlockMessage) unlockMessage.style.display = 'none';
    if (autoCookControls) autoCookControls.style.display = 'flex';
    if (foodButtons) foodButtons.style.display = 'flex';
    if (stationIcon) stationIcon.textContent = '👨‍🍳'; // Change to chef icon

    updateUI();
    showNotification('Station unlocked! You can now cook 3 items simultaneously!', 'success');
}

// Periodically update cooking progress bars
setInterval(() => {
    Object.keys(gameState.stations).forEach(stationId => {
        const station = gameState.stations[stationId];
        if (station.unlocked) {
            const hasActiveCooking = station.cookingSlots.some(slot => slot.cooking);
            if (hasActiveCooking) {
                updateStationUI(stationId);
            }
        }
    });
}, 100);

// Auto-serve customers periodically
setInterval(() => {
    if (gameState.autoServe) {
        autoServeCustomers();
    }
}, 1000);

function autoServeCustomers() {
    // Find customers whose orders are available in inventory
    gameState.tables.forEach(table => {
        if (table.occupied && table.customer) {
            const customer = table.customer;
            const hasFood = gameState.inventory.includes(customer.order);

            // Check if this table is already in serving queue
            const alreadyQueued = gameState.waiter.servingQueue.some(task => task.tableId === table.id);

            if (hasFood && !alreadyQueued) {
                // Add to serving queue
                gameState.waiter.servingQueue.push({
                    tableId: table.id,
                    foodType: customer.order
                });
            }
        }
    });

    // Always try to process queue if there are items and waiter is idle
    if (gameState.waiter.servingQueue.length > 0 && gameState.waiter.status === 'idle') {
        processServingQueue();
    }
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
        div.innerHTML = `${get3DFoodHTML(foodType)} <span class="food-count">x${foodCount[foodType]}</span>`;
        div.title = `Click to serve ${food.name}`;
        inventoryElement.appendChild(div);
    });
}

// Waiter Movement System
function moveWaiterTo(x, y, callback) {
    const waiter = document.getElementById('waiter');
    const waiterTray = document.getElementById('waiterTray');

    if (!waiter) return;

    // Add walking class for animation
    waiter.classList.add('walking');

    // Calculate direction for facing
    const currentX = parseFloat(waiter.style.left) || 50;
    const deltaX = x - currentX;

    // Flip waiter based on direction
    if (deltaX < 0) {
        waiter.style.transform = 'translate(-50%, -50%) scaleX(-1)';
    } else {
        waiter.style.transform = 'translate(-50%, -50%) scaleX(1)';
    }

    // Move waiter
    waiter.style.left = x + '%';
    waiter.style.top = y + '%';

    // Update waiter state
    gameState.waiter.position = { x, y };

    // Remove walking class after movement completes
    setTimeout(() => {
        waiter.classList.remove('walking');
        if (callback) callback();
    }, 1000);
}

function updateWaiterTray() {
    const waiterTray = document.getElementById('waiterTray');
    if (!waiterTray) return;

    if (gameState.waiter.currentFood) {
        waiterTray.innerHTML = get3DFoodHTML(gameState.waiter.currentFood);
        waiterTray.style.display = 'flex';
    } else {
        waiterTray.innerHTML = '';
        waiterTray.style.display = 'none';
    }
}

function getTablePosition(tableId) {
    const tableElement = document.getElementById(`table-${tableId}`);
    if (!tableElement) return { x: 50, y: 50 };

    const container = tableElement.parentElement;
    const containerRect = container.getBoundingClientRect();
    const tableRect = tableElement.getBoundingClientRect();

    const x = ((tableRect.left - containerRect.left + tableRect.width / 2) / containerRect.width) * 100;
    const y = ((tableRect.top - containerRect.top + tableRect.height / 2) / containerRect.height) * 100;

    return { x, y };
}

function processServingQueue() {
    // If waiter is busy, return
    if (gameState.waiter.status !== 'idle') return;

    // If no items in queue, return
    if (gameState.waiter.servingQueue.length === 0) return;

    // Get next serving task
    const nextTask = gameState.waiter.servingQueue.shift();

    // Check if we still have the food
    const foodIndex = gameState.inventory.indexOf(nextTask.foodType);
    if (foodIndex === -1) {
        // Food not available, check next task
        processServingQueue();
        return;
    }

    // Check if customer is still at table
    const table = gameState.tables[nextTask.tableId];
    if (!table || !table.occupied || !table.customer) {
        // Customer left, check next task
        processServingQueue();
        return;
    }

    // Remove food from inventory
    gameState.inventory.splice(foodIndex, 1);
    updateInventoryUI();

    // Set waiter state
    gameState.waiter.status = 'moving_to_table';
    gameState.waiter.currentFood = nextTask.foodType;
    gameState.waiter.targetTable = nextTask.tableId;
    updateWaiterTray();

    // Move to kitchen first to pick up food
    moveWaiterTo(80, 30, () => {
        showNotification(`Waiter picked up ${foodData[nextTask.foodType].name}!`, 'info');

        // Then move to table
        const tablePos = getTablePosition(nextTask.tableId);
        moveWaiterTo(tablePos.x, tablePos.y, () => {
            serveCustomerByWaiter(nextTask.tableId);
        });
    });
}

function serveCustomerByWaiter(tableId) {
    const table = gameState.tables[tableId];
    if (!table || !table.customer) {
        gameState.waiter.status = 'idle';
        gameState.waiter.currentFood = null;
        gameState.waiter.targetTable = null;
        updateWaiterTray();
        processServingQueue();
        return;
    }

    const customer = table.customer;

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
    showNotification(`Served ${foodData[customer.order].icon}! +$${earnings} ${customer.satisfied ? '⭐' : ''}`, 'success');

    // Remove customer
    customerLeaves(customer, true);

    // Reset waiter
    gameState.waiter.status = 'idle';
    gameState.waiter.currentFood = null;
    gameState.waiter.targetTable = null;
    updateWaiterTray();

    updateUI();
    saveGame();

    // Process next item in queue
    setTimeout(() => processServingQueue(), 500);
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
    const randomShirtColor = customerShirtColors[Math.floor(Math.random() * customerShirtColors.length)];

    const customer = {
        id: gameState.nextCustomerId++,
        shirtColor: randomShirtColor,
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
                <div class="customer">
                    <div class="customer-figure">
                        <div class="customer-head">
                            <div class="customer-face">
                                <div class="customer-eye left"></div>
                                <div class="customer-eye right"></div>
                                <div class="customer-smile"></div>
                            </div>
                        </div>
                        <div class="customer-body" style="background: ${customer.shirtColor}"></div>
                        <div class="customer-legs-wrapper">
                            <div class="customer-leg"></div>
                            <div class="customer-leg"></div>
                        </div>
                    </div>
                </div>
                <div class="order-label">Wants</div>
                <div class="customer-order">${get3DFoodHTML(customer.order)}</div>
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

    // Add to waiter's serving queue
    gameState.waiter.servingQueue.push({
        tableId: tableId,
        foodType: customer.order
    });

    showNotification('Waiter will serve this table!', 'info');

    // Update UI to disable serve button
    updateUI();

    // Start processing queue
    processServingQueue();
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

    // Update serve buttons based on inventory - FIX: Update ALL tables
    gameState.tables.forEach(table => {
        if (table.occupied && table.customer) {
            updateTableServeButton(table);
        }
    });
}

// Helper function to update serve button state
function updateTableServeButton(table) {
    const hasFood = gameState.inventory.includes(table.customer.order);
    const btn = document.querySelector(`#table-${table.id} .serve-table-btn`);
    if (btn) {
        btn.disabled = !hasFood;
        // Add visual feedback
        if (hasFood) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
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
        stations: gameState.stations,
        autoServe: gameState.autoServe
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
            // Restore unlocked stations (handle old format)
            if (data.stations[2]?.unlocked) {
                gameState.stations[2].unlocked = true;
                const station2 = document.getElementById('station2');
                if (station2) {
                    station2.classList.remove('locked');
                    const unlockMsg = station2.querySelector('.unlock-message');
                    const autoCook = station2.querySelector('.auto-cook-controls');
                    const foodButtons = station2.querySelector('.food-buttons');
                    const stationIcon = station2.querySelector('.station-icon');

                    if (unlockMsg) unlockMsg.style.display = 'none';
                    if (autoCook) autoCook.style.display = 'flex';
                    if (foodButtons) foodButtons.style.display = 'flex';
                    if (stationIcon) stationIcon.textContent = '👨‍🍳'; // Change to chef icon
                }
            }
        }

        // Ensure Station 1 auto-cook controls are visible
        const station1 = document.getElementById('station1');
        if (station1) {
            const autoCook = station1.querySelector('.auto-cook-controls');
            if (autoCook) autoCook.style.display = 'flex';
        }

        // Restore auto-serve state
        if (data.autoServe !== undefined) {
            gameState.autoServe = data.autoServe;
            const autoServeToggle = document.getElementById('autoServeToggle');
            if (autoServeToggle) autoServeToggle.checked = gameState.autoServe;
        }

        updateUI();
        showNotification('Game loaded! Welcome back! 🎮', 'success');
    } else {
        // First time loading - ensure Station 1 auto-cook is visible
        const station1 = document.getElementById('station1');
        if (station1) {
            const autoCook = station1.querySelector('.auto-cook-controls');
            if (autoCook) autoCook.style.display = 'flex';
        }
    }
}

// Auto-save every 30 seconds
setInterval(() => {
    saveGame();
}, 30000);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
