// Game State
const gameState = {
    money: 100,
    level: 1,
    customersServed: 0,
    inventory: [], // Keep for backwards compatibility but will use storage tables
    tables: [],
    storageTables: [
        { id: 0, foods: [], foodType: null }, // null = empty, can accept any food
        { id: 1, foods: [], foodType: null },
        { id: 2, foods: [], foodType: null }
    ],
    dirtyTables: [], // Tables that need cleaning
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
        },
        3: {
            unlocked: false,
            cookingSlots: [
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null },
                { cooking: false, currentFood: null, progress: 0, intervalId: null }
            ],
            autoCook: false,
            autoCookFood: null
        },
        4: {
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
    restaurantRating: 5.0, // Restaurant rating out of 5 stars
    totalRatings: 0,
    // Multiple staff members - Restaurant City style!
    staff: [
        {
            id: 0,
            role: 'server', // Serves food to customers
            position: { x: 100, y: 100 },
            currentFood: null,
            status: 'idle',
            targetTable: null,
            targetStorage: null,
            servingQueue: [],
            color: '#3498db' // Blue uniform
        },
        {
            id: 1,
            role: 'cleaner', // Cleans dirty tables
            position: { x: 150, y: 100 },
            status: 'idle',
            targetTable: null,
            cleaningQueue: [],
            color: '#2ecc71' // Green uniform
        },
        {
            id: 2,
            role: 'cook', // Manages cooking stations
            position: { x: 200, y: 100 },
            status: 'idle',
            assignedStation: 1,
            cookingQueue: [],
            color: '#e74c3c' // Red/chef uniform
        }
    ],
    autoServe: false
};

// Helper functions for staff management
function getStaffByRole(role) {
    return gameState.staff.find(s => s.role === role);
}

function getServerStaff() {
    return getStaffByRole('server');
}

function getCleanerStaff() {
    return getStaffByRole('cleaner');
}

function getCookStaff() {
    return getStaffByRole('cook');
}

// Backward compatibility: Map old waiter API to new staff system
Object.defineProperty(gameState, 'waiter', {
    get() {
        return getServerStaff(); // Default to server for backward compatibility
    },
    set(value) {
        const server = getServerStaff();
        Object.assign(server, value);
    }
});

// Food Data - Restaurant City Style Menu
const foodData = {
    // Starting recipes (Level 1)
    coffee: { name: 'Coffee', icon: '☕', cookTime: 3000, price: 10, unlockLevel: 1 },
    burger: { name: 'Burger', icon: '🍔', cookTime: 5000, price: 15, unlockLevel: 1 },
    pizza: { name: 'Pizza', icon: '🍕', cookTime: 8000, price: 25, unlockLevel: 1 },

    // Level 2 recipes
    soda: { name: 'Soda', icon: '🥤', cookTime: 2000, price: 8, unlockLevel: 2 },
    hotdog: { name: 'Hot Dog', icon: '🌭', cookTime: 4000, price: 12, unlockLevel: 2 },

    // Level 3 recipes
    taco: { name: 'Taco', icon: '🌮', cookTime: 6000, price: 18, unlockLevel: 3 },
    fries: { name: 'Fries', icon: '🍟', cookTime: 4500, price: 10, unlockLevel: 3 },

    // Level 4 recipes
    sushi: { name: 'Sushi', icon: '🍣', cookTime: 7000, price: 28, unlockLevel: 4 },
    icecream: { name: 'Ice Cream', icon: '🍦', cookTime: 3500, price: 14, unlockLevel: 4 },

    // Level 5 recipes
    pasta: { name: 'Pasta', icon: '🍝', cookTime: 9000, price: 30, unlockLevel: 5 },
    steak: { name: 'Steak', icon: '🥩', cookTime: 10000, price: 35, unlockLevel: 5 },

    // Level 6 recipes
    salad: { name: 'Salad', icon: '🥗', cookTime: 5000, price: 16, unlockLevel: 6 },
    ramen: { name: 'Ramen', icon: '🍜', cookTime: 8500, price: 26, unlockLevel: 6 },

    // Level 7+ recipes
    cake: { name: 'Cake', icon: '🍰', cookTime: 7500, price: 22, unlockLevel: 7 },
    curry: { name: 'Curry', icon: '🍛', cookTime: 9500, price: 32, unlockLevel: 8 }
};

// Get unlocked recipes based on current level
function getUnlockedRecipes() {
    return Object.keys(foodData).filter(key => foodData[key].unlockLevel <= gameState.level);
}

// Get newly unlocked recipes at current level
function getNewlyUnlockedRecipes() {
    return Object.keys(foodData).filter(key => foodData[key].unlockLevel === gameState.level);
}

// Update food buttons for all stations based on unlocked recipes
function updateFoodButtons() {
    const unlockedRecipes = getUnlockedRecipes();

    [1, 2, 3, 4].forEach(stationId => {
        const station = gameState.stations[stationId];
        if (!station || !station.unlocked) return;

        const stationElement = document.getElementById(`station${stationId}`);
        if (!stationElement) return;

        const foodButtonsContainer = stationElement.querySelector('.food-buttons');
        const autoCookSelect = stationElement.querySelector('.auto-cook-select');

        if (foodButtonsContainer) {
            foodButtonsContainer.innerHTML = '';
            unlockedRecipes.forEach(foodKey => {
                const food = foodData[foodKey];
                const button = document.createElement('button');
                button.className = 'cook-btn';
                button.setAttribute('data-food', foodKey);
                button.setAttribute('data-station', stationId);
                button.onclick = () => startCooking(foodKey, stationId);
                button.innerHTML = `
                    <span class="food-icon">${food.icon}</span>
                    <span class="food-name">${food.name}</span>
                    <span class="food-info">${food.cookTime / 1000}s • $${food.price}</span>
                `;
                foodButtonsContainer.appendChild(button);
            });
        }

        if (autoCookSelect) {
            autoCookSelect.innerHTML = '<option value="">Select Food</option>';
            unlockedRecipes.forEach(foodKey => {
                const food = foodData[foodKey];
                const option = document.createElement('option');
                option.value = foodKey;
                option.textContent = `${food.icon} ${food.name}`;
                autoCookSelect.appendChild(option);
            });
        }
    });
}

// Show recipe unlock notification
function showRecipeUnlockNotification() {
    const newRecipes = getNewlyUnlockedRecipes();
    if (newRecipes.length > 0) {
        const recipeNames = newRecipes.map(key => foodData[key].icon + ' ' + foodData[key].name).join(', ');
        showNotification(`🎉 New Recipe${newRecipes.length > 1 ? 's' : ''} Unlocked: ${recipeNames}!`, 'success');
        updateFoodButtons();
    }
}

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

    // Initialize food buttons with unlocked recipes
    updateFoodButtons();
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
            customer: null,
            dirtyPlate: false,
            plateFood: null // What food was served (for visual)
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
    const foodType = slot.currentFood;

    // Add to storage table (only one food type per table)
    const storageTable = findAvailableStorageTable(foodType);
    if (storageTable) {
        storageTable.foods.push(foodType);
        // Set the food type if it's the first item
        if (storageTable.foodType === null) {
            storageTable.foodType = foodType;
        }
        updateStorageTablesUI();
    } else {
        // Fallback to inventory if storage is full
        gameState.inventory.push(foodType);
        updateInventoryUI();
    }

    updateUI(); // Update serve buttons when food changes

    // Only show notification if not auto-cooking
    if (!station.autoCook) {
        showNotification(`${food.name} placed on storage table!`, 'success');
    }

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

// Find storage table for specific food type (only one food type per table)
function findAvailableStorageTable(foodType) {
    // First, look for a table that already has this food type (unlimited capacity)
    let existingTable = gameState.storageTables.find(table =>
        table.foodType === foodType
    );

    if (existingTable) {
        return existingTable;
    }

    // If no existing table, find an empty table
    let emptyTable = gameState.storageTables.find(table =>
        table.foodType === null || table.foods.length === 0
    );

    return emptyTable || null;
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
    const stationElement = document.getElementById(`station${stationId}`);
    const cost = parseInt(stationElement.dataset.unlockCost) || 200;

    if (gameState.money < cost) {
        showNotification('Not enough money!', 'error');
        return;
    }

    gameState.money -= cost;
    gameState.stations[stationId].unlocked = true;
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
    // Find customers whose orders are available in storage tables
    gameState.tables.forEach(table => {
        if (table.occupied && table.customer) {
            const customer = table.customer;
            const hasFood = hasFoodInStorage(customer.order);

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

// Check if food is available in storage tables
function hasFoodInStorage(foodType) {
    for (const table of gameState.storageTables) {
        if (table.foods.includes(foodType)) {
            return true;
        }
    }
    // Also check inventory as fallback
    return gameState.inventory.includes(foodType);
}

// Storage Tables Management
function updateStorageTablesUI() {
    // Update quick food counter (always visible)
    updateQuickFoodCounter();

    gameState.storageTables.forEach((table, index) => {
        const tableElement = document.getElementById(`storage-table-${index}`);
        if (!tableElement) return;

        const labelElement = tableElement.querySelector('.storage-label');
        const foodsContainer = tableElement.querySelector('.storage-foods');
        if (!foodsContainer) return;

        // Update label to show food type
        if (labelElement) {
            if (table.foodType) {
                const foodIcon = foodData[table.foodType].icon;
                labelElement.textContent = `${foodIcon} ${foodData[table.foodType].name} Table`;
            } else {
                labelElement.textContent = `Table ${index + 1}`;
            }
        }

        foodsContainer.innerHTML = '';

        if (table.foods.length === 0) {
            foodsContainer.innerHTML = '<div class="storage-placeholder">Empty</div>';
            // Reset food type when empty
            table.foodType = null;
            if (labelElement) {
                labelElement.textContent = `Table ${index + 1}`;
            }
            return;
        }

        // Display single food type with count
        const div = document.createElement('div');
        div.className = 'storage-food-item';
        div.innerHTML = `
            ${get3DFoodHTML(table.foodType)}
            <span class="storage-food-count">×${table.foods.length}</span>
        `;
        foodsContainer.appendChild(div);
    });
}

// Update quick food counter (always visible at top of kitchen)
function updateQuickFoodCounter() {
    const counterItems = document.getElementById('counterItems');
    if (!counterItems) return;

    // Count all food across all storage tables
    const totalFoodCount = {};
    gameState.storageTables.forEach(table => {
        table.foods.forEach(food => {
            totalFoodCount[food] = (totalFoodCount[food] || 0) + 1;
        });
    });

    // Also count inventory food
    gameState.inventory.forEach(food => {
        totalFoodCount[food] = (totalFoodCount[food] || 0) + 1;
    });

    counterItems.innerHTML = '';

    if (Object.keys(totalFoodCount).length === 0) {
        counterItems.innerHTML = '<div class="counter-placeholder">Cook food to see it here!</div>';
        return;
    }

    // Display total food counts
    Object.keys(totalFoodCount).forEach(foodType => {
        const div = document.createElement('div');
        div.className = 'counter-food-item';
        div.innerHTML = `
            ${get3DFoodHTML(foodType)}
            <span class="counter-food-count">×${totalFoodCount[foodType]}</span>
        `;
        counterItems.appendChild(div);
    });
}

// Inventory Management (kept for backwards compatibility)
function updateInventoryUI() {
    // Update storage tables instead
    updateStorageTablesUI();
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

// Generic staff movement function
function moveStaffTo(staff, x, y, callback) {
    const staffElement = document.getElementById(`staff-${staff.id}`);

    if (!staffElement) {
        // Fallback to waiter element for backward compatibility
        if (staff.role === 'server') {
            return moveWaiterTo(x, y, callback);
        }
        console.warn(`Staff element not found for staff ${staff.id}`);
        if (callback) callback();
        return;
    }

    // Add walking class for animation
    staffElement.classList.add('walking');

    // Calculate direction for facing
    const currentX = parseFloat(staffElement.style.left) || staff.position.x;
    const deltaX = x - currentX;

    // Flip staff based on direction
    if (deltaX < 0) {
        staffElement.style.transform = 'translate(-50%, -50%) scaleX(-1)';
    } else {
        staffElement.style.transform = 'translate(-50%, -50%) scaleX(1)';
    }

    // Move staff
    staffElement.style.left = x + '%';
    staffElement.style.top = y + '%';

    // Update staff state
    staff.position = { x, y };

    // Remove walking class after movement completes
    setTimeout(() => {
        staffElement.classList.remove('walking');
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

    // Find which storage table has the food
    let storageTable = null;
    let foodIndex = -1;

    for (const table of gameState.storageTables) {
        foodIndex = table.foods.indexOf(nextTask.foodType);
        if (foodIndex !== -1) {
            storageTable = table;
            break;
        }
    }

    // If not in storage, check inventory (fallback)
    if (!storageTable) {
        foodIndex = gameState.inventory.indexOf(nextTask.foodType);
        if (foodIndex === -1) {
            // Food not available, check next task
            processServingQueue();
            return;
        }
    }

    // Check if customer is still at table
    const table = gameState.tables[nextTask.tableId];
    if (!table || !table.occupied || !table.customer) {
        // Customer left, check next task
        processServingQueue();
        return;
    }

    // Set waiter state
    gameState.waiter.status = 'moving_to_storage';
    gameState.waiter.currentFood = nextTask.foodType;
    gameState.waiter.targetTable = nextTask.tableId;
    gameState.waiter.targetStorage = storageTable ? storageTable.id : null;

    // Move to storage table first to pick up food
    const storagePos = getStorageTablePosition(storageTable ? storageTable.id : 0);
    moveWaiterTo(storagePos.x, storagePos.y, () => {
        // Remove food from storage table or inventory
        if (storageTable) {
            storageTable.foods.splice(foodIndex, 1);
            updateStorageTablesUI();
        } else {
            gameState.inventory.splice(foodIndex, 1);
        }

        updateWaiterTray();
        showNotification(`Waiter picked up ${foodData[nextTask.foodType].name}!`, 'info');

        // Change status and move to customer table
        gameState.waiter.status = 'moving_to_table';
        const tablePos = getTablePosition(nextTask.tableId);
        moveWaiterTo(tablePos.x, tablePos.y, () => {
            serveCustomerByWaiter(nextTask.tableId);
        });
    });
}

function getStorageTablePosition(storageId) {
    // Get actual position of storage table on restaurant floor
    const storageElement = document.getElementById(`storage-table-${storageId}`);
    if (!storageElement) return { x: 20, y: 30 + (storageId * 20) };

    const container = document.querySelector('.restaurant-floor');
    if (!container) return { x: 20, y: 30 + (storageId * 20) };

    const containerRect = container.getBoundingClientRect();
    const storageRect = storageElement.getBoundingClientRect();

    const x = ((storageRect.left - containerRect.left + storageRect.width / 2) / containerRect.width) * 100;
    const y = ((storageRect.top - containerRect.top + storageRect.height / 2) / containerRect.height) * 100;

    return { x, y };
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

    // Update restaurant rating based on customer satisfaction
    const customerRating = customer.satisfied ? 5.0 : (customer.patience / 100) * 5;
    gameState.totalRatings++;
    gameState.restaurantRating =
        (gameState.restaurantRating * (gameState.totalRatings - 1) + customerRating) / gameState.totalRatings;

    // Level up
    if (gameState.customersServed % 10 === 0) {
        gameState.level++;
        showNotification(`🎉 Level Up! Now level ${gameState.level}!`, 'success');
        // Check for newly unlocked recipes
        setTimeout(() => showRecipeUnlockNotification(), 1000);
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

    // Process next item in queue or clean dirty tables (servers can also clean!)
    setTimeout(() => {
        if (gameState.waiter.servingQueue.length > 0) {
            processServingQueue();
        } else if (gameState.dirtyTables.length > 0) {
            serverCleansDirtyTable();
        }
    }, 500);
}

// ================================
// SERVER CLEANING PLATES
// ================================

/**
 * Servers can clean dirty tables after serving
 */
function serverCleansDirtyTable() {
    const servers = gameState.staff.filter(s => s.role === 'server' && s.status === 'idle');

    if (servers.length === 0 || gameState.dirtyTables.length === 0) return;

    const server = servers[0];
    const tableId = gameState.dirtyTables.shift();
    const table = gameState.tables[tableId];

    if (!table || !table.dirtyPlate) {
        // Table already clean, check next
        if (gameState.dirtyTables.length > 0) {
            serverCleansDirtyTable();
        }
        return;
    }

    server.status = 'cleaning_plate';
    const tablePos = getTablePosition(tableId);

    showNotification('Server cleaning table...', 'info');

    moveStaffTo(server, tablePos.x, tablePos.y, () => {
        // Clean the table and pick up dirty plate
        table.dirtyPlate = false;
        table.plateFood = null;
        updateTableUI(table);

        showNotification('Table cleaned by server! ✨', 'success');

        // Reset server
        server.status = 'idle';

        // Continue with next task
        setTimeout(() => {
            if (server.servingQueue && server.servingQueue.length > 0) {
                processServingQueue();
            } else if (gameState.dirtyTables.length > 0) {
                serverCleansDirtyTable();
            }
        }, 500);
    });
}

// Auto-clean dirty tables with servers periodically
setInterval(() => {
    // Only if there are idle servers and dirty tables
    const idleServers = gameState.staff.filter(s => s.role === 'server' && s.status === 'idle');
    if (idleServers.length > 0 && gameState.dirtyTables.length > 0) {
        serverCleansDirtyTable();
    }
}, 2000);

// Customer System
function startCustomerSpawning() {
    setInterval(() => {
        if (Math.random() < 0.7) { // 70% chance every interval - busier restaurant!
            spawnCustomer();
        }
    }, 3000); // Check every 3 seconds instead of 5
}

function spawnCustomer() {
    const emptyTable = gameState.tables.find(t => !t.occupied && !t.dirtyPlate);

    if (!emptyTable) {
        return; // No empty tables (all occupied or dirty)
    }

    // Get available food types from storage tables
    const availableFoods = new Set();
    gameState.storageTables.forEach(table => {
        table.foods.forEach(food => availableFoods.add(food));
    });

    // Also check inventory as fallback
    gameState.inventory.forEach(food => availableFoods.add(food));

    // Convert to array
    let possibleOrders = Array.from(availableFoods);

    // Restaurant City style: If no food available, customer can still order from unlocked recipes
    // This encourages players to cook more variety
    if (possibleOrders.length === 0) {
        possibleOrders = getUnlockedRecipes();
    }

    if (possibleOrders.length === 0) {
        return; // No unlocked recipes yet
    }

    // Pick random food from possible orders
    const randomFood = possibleOrders[Math.floor(Math.random() * possibleOrders.length)];
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
                <div class="table-chairs">
                    <div class="chair top">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair bottom">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair left">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair right">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                </div>
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
    } else if (table.dirtyPlate) {
        // Table has dirty plate - needs cleaning
        tableElement.className = 'table dirty';
        tableElement.innerHTML = `
            <div class="table-base">
                <div class="table-top"></div>
                <div class="table-chairs">
                    <div class="chair top">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair bottom">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair left">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair right">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                </div>
            </div>
            <div class="table-content">
                <div class="table-number">Table ${table.id + 1}</div>
                <div class="dirty-plate-label">Needs Cleaning</div>
                <div class="dirty-plate">
                    ${get3DFoodHTML(table.plateFood)}
                    <div class="plate-icon">🍽️</div>
                </div>
                <button class="clean-table-btn" onclick="cleanTable(${table.id})">
                    🧹 Clean Table
                </button>
            </div>
        `;
    } else {
        tableElement.className = 'table empty';
        tableElement.innerHTML = `
            <div class="table-base">
                <div class="table-top"></div>
                <div class="table-chairs">
                    <div class="chair top">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair bottom">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair left">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                    <div class="chair right">
                        <div class="chair-back"></div>
                        <div class="chair-seat"></div>
                    </div>
                </div>
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

// Clean dirty table - player can click to clean
function cleanTable(tableId) {
    const table = gameState.tables[tableId];
    if (!table || !table.dirtyPlate) return;

    // Add cleaning task to cleaner's queue
    if (gameState.cleaner && gameState.cleaner.unlocked) {
        // Cleaner will handle it
        if (!gameState.dirtyTables.includes(tableId)) {
            gameState.dirtyTables.push(tableId);
        }
        showNotification('Cleaner will clean this table!', 'info');
    } else {
        // Manual cleaning - instant
        table.dirtyPlate = false;
        table.plateFood = null;
        showNotification('Table cleaned! ✨', 'success');
    }

    updateUI();
}

function customerLeaves(customer, served) {
    const table = gameState.tables.find(t => t.id === customer.tableId);
    if (!table) return;

    table.occupied = false;
    table.customer = null;

    gameState.customers = gameState.customers.filter(c => c.id !== customer.id);

    if (!served) {
        showNotification('Customer left unhappy! 😢', 'error');
    } else {
        // Leave a dirty plate that needs cleaning
        table.dirtyPlate = true;
        table.plateFood = customer.order;
        // Add to dirty tables queue for waiter to clean
        if (!gameState.dirtyTables.includes(table.id)) {
            gameState.dirtyTables.push(table.id);
        }
    }

    updateTableUI(table);

    // Trigger waiter to clean if idle
    if (gameState.waiter.status === 'idle' && gameState.dirtyTables.length > 0) {
        cleanNextDirtyTable();
    }
}

// Clean dirty tables
function cleanNextDirtyTable() {
    const cleaner = getCleanerStaff();
    if (cleaner.status !== 'idle') return;
    if (gameState.dirtyTables.length === 0) return;

    const tableId = gameState.dirtyTables.shift();
    const table = gameState.tables[tableId];

    if (!table || !table.dirtyPlate) {
        // Table already clean, check next
        if (gameState.dirtyTables.length > 0) {
            cleanNextDirtyTable();
        }
        return;
    }

    cleaner.status = 'cleaning';
    const tablePos = getTablePosition(tableId);

    showNotification('Cleaner cleaning table...', 'info');

    moveStaffTo(cleaner, tablePos.x, tablePos.y, () => {
        // Clean the table
        table.dirtyPlate = false;
        table.plateFood = null;
        updateTableUI(table);

        showNotification('Table cleaned! ✨', 'success');

        // Reset cleaner
        cleaner.status = 'idle';

        // Clean next table
        setTimeout(() => {
            if (gameState.dirtyTables.length > 0) {
                cleanNextDirtyTable();
            }
        }, 500);
    });
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
function updateStaffIndicators() {
    // Update server indicator
    const serverIndicator = document.querySelector('.server-indicator');
    const cleanerIndicator = document.querySelector('.cleaner-indicator');
    const cookIndicator = document.querySelector('.cook-indicator');

    if (serverIndicator) {
        const server = getServerStaff();
        serverIndicator.style.borderColor = server.status === 'idle' ? '#3498db' : '#f39c12';
        serverIndicator.style.background = server.status === 'idle'
            ? 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)'
            : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)';
    }

    if (cleanerIndicator) {
        const cleaner = getCleanerStaff();
        cleanerIndicator.style.borderColor = cleaner.status === 'idle' ? '#2ecc71' : '#f39c12';
        cleanerIndicator.style.background = cleaner.status === 'idle'
            ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e9 100%)'
            : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)';
    }

    if (cookIndicator) {
        const cook = getCookStaff();
        cookIndicator.style.borderColor = cook.status === 'idle' ? '#e74c3c' : '#f39c12';
        cookIndicator.style.background = cook.status === 'idle'
            ? 'linear-gradient(135deg, #ffffff 0%, #ffebee 100%)'
            : 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)';
    }
}

function updateUI() {
    document.getElementById('money').textContent = gameState.money;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('customersServed').textContent = gameState.customersServed;

    // Update restaurant rating display
    const ratingElement = document.getElementById('restaurantRating');
    if (ratingElement) {
        const rating = gameState.restaurantRating.toFixed(1);
        ratingElement.textContent = rating;
        // Color based on rating
        if (gameState.restaurantRating >= 4.5) {
            ratingElement.style.color = '#4caf50'; // Green for excellent
        } else if (gameState.restaurantRating >= 3.5) {
            ratingElement.style.color = '#ffc107'; // Yellow for good
        } else {
            ratingElement.style.color = '#f44336'; // Red for poor
        }
    }

    updateStaffIndicators();

    // Update serve buttons based on inventory - FIX: Update ALL tables
    gameState.tables.forEach(table => {
        if (table.occupied && table.customer) {
            updateTableServeButton(table);
        }
    });
}

// Helper function to update serve button state
function updateTableServeButton(table) {
    const hasFood = hasFoodInStorage(table.customer.order);
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
        restaurantRating: gameState.restaurantRating,
        totalRatings: gameState.totalRatings,
        inventory: gameState.inventory,
        storageTables: gameState.storageTables,
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
        gameState.restaurantRating = data.restaurantRating || 5.0;
        gameState.totalRatings = data.totalRatings || 0;

        // Restore inventory
        if (data.inventory) {
            gameState.inventory = data.inventory;
        }

        // Restore storage tables with their food
        if (data.storageTables) {
            gameState.storageTables = data.storageTables;
            updateStorageTablesUI();
        }

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

// ================================
// RECIPE BOOK FUNCTIONALITY
// ================================

/**
 * Toggle Recipe Book modal visibility with animation
 */
function toggleRecipeBook() {
    const modal = document.getElementById('recipeBookModal');
    if (!modal) return;

    if (modal.style.display === 'none' || modal.style.display === '') {
        // Show modal
        modal.style.display = 'flex';
        renderRecipeBook();

        // Add animation class
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    } else {
        // Hide modal with fade out
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Render all recipes in the Recipe Book with beautiful animations
 */
function renderRecipeBook() {
    const grid = document.getElementById('recipeBookGrid');
    const unlockedCountEl = document.getElementById('unlockedCount');
    const currentLevelEl = document.getElementById('currentLevelDisplay');

    if (!grid) return;

    // Update stats
    const unlockedRecipes = getUnlockedRecipes();
    const totalRecipes = Object.keys(foodData).length;

    if (unlockedCountEl) unlockedCountEl.textContent = unlockedRecipes.length;
    if (currentLevelEl) currentLevelEl.textContent = gameState.level;

    // Clear grid
    grid.innerHTML = '';

    // Sort recipes by unlock level
    const sortedRecipes = Object.entries(foodData).sort((a, b) => {
        return a[1].unlockLevel - b[1].unlockLevel;
    });

    // Create recipe cards
    sortedRecipes.forEach(([key, recipe]) => {
        const isUnlocked = gameState.level >= recipe.unlockLevel;

        const card = document.createElement('div');
        card.className = `recipe-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        // Calculate cook time in seconds
        const cookTimeSeconds = (recipe.cookTime / 1000).toFixed(1);

        card.innerHTML = `
            <div class="lock-badge">
                ${isUnlocked ? '✓' : '🔒'}
            </div>
            <div class="unlock-level">
                Level ${recipe.unlockLevel}
            </div>
            <div class="recipe-icon">
                ${recipe.icon}
            </div>
            <div class="recipe-name">
                ${recipe.name}
            </div>
            <div class="recipe-details">
                <div class="recipe-detail-item">
                    <span class="recipe-detail-label">Price</span>
                    <span class="recipe-detail-value">$${recipe.price}</span>
                </div>
                <div class="recipe-detail-item">
                    <span class="recipe-detail-label">Time</span>
                    <span class="recipe-detail-value">${cookTimeSeconds}s</span>
                </div>
            </div>
        `;

        // Add click effect for unlocked recipes
        if (isUnlocked) {
            card.addEventListener('click', () => {
                // Add bounce animation
                card.style.animation = 'none';
                setTimeout(() => {
                    card.style.animation = '';
                }, 10);

                // Show notification with recipe details
                showNotification(`${recipe.icon} ${recipe.name} - $${recipe.price} | ${cookTimeSeconds}s`, 'success');
            });
        } else {
            card.addEventListener('click', () => {
                // Show unlock requirement
                showNotification(`🔒 Unlock at Level ${recipe.unlockLevel}`, 'info');
            });
        }

        grid.appendChild(card);
    });
}

/**
 * Update Recipe Book stats when game state changes
 */
function updateRecipeBookStats() {
    const unlockedCountEl = document.getElementById('unlockedCount');
    const currentLevelEl = document.getElementById('currentLevelDisplay');

    if (unlockedCountEl) {
        const unlockedRecipes = getUnlockedRecipes();
        unlockedCountEl.textContent = unlockedRecipes.length;
    }

    if (currentLevelEl) {
        currentLevelEl.textContent = gameState.level;
    }
}

// ================================
// STAFF MANAGEMENT SYSTEM
// ================================

/**
 * Toggle Staff Manager modal visibility
 */
function toggleStaffManager() {
    const modal = document.getElementById('staffManagerModal');
    if (!modal) return;

    if (modal.style.display === 'none' || modal.style.display === '') {
        // Show modal
        modal.style.display = 'flex';
        renderStaffList();

        // Add animation class
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    } else {
        // Hide modal with fade out
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Render staff list in the manager
 */
function renderStaffList() {
    const staffList = document.getElementById('staffList');
    const totalStaffEl = document.getElementById('totalStaff');
    const activeStaffEl = document.getElementById('activeStaff');

    if (!staffList) return;

    // Update stats
    const activeStaff = gameState.staff.filter(s => s.status !== 'fired').length;
    if (totalStaffEl) totalStaffEl.textContent = gameState.staff.length;
    if (activeStaffEl) activeStaffEl.textContent = activeStaff;

    // Clear list
    staffList.innerHTML = '';

    // Create staff member cards
    gameState.staff.forEach(staff => {
        const roleIcons = {
            server: '👔',
            cleaner: '🧹',
            cook: '👨‍🍳'
        };

        const statusText = staff.status === 'idle' ? 'Idle' : 'Working';
        const statusClass = staff.status === 'idle' ? 'status-idle' : 'status-working';

        const card = document.createElement('div');
        card.className = 'staff-member';
        card.innerHTML = `
            <div class="staff-member-icon">${roleIcons[staff.role]}</div>
            <div class="staff-member-info">
                <div class="staff-member-name">
                    ${staff.role.charAt(0).toUpperCase() + staff.role.slice(1)} #${staff.id + 1}
                </div>
                <div class="staff-member-role">
                    <span class="role-badge ${staff.role}">${staff.role}</span>
                </div>
            </div>
            <div class="staff-member-status ${statusClass}">
                ${statusText}
            </div>
            <div class="staff-member-actions">
                <button class="fire-staff-btn" onclick="fireStaff(${staff.id})" ${gameState.staff.length <= 3 ? 'disabled title="Cannot fire initial staff"' : ''}>
                    Fire
                </button>
            </div>
        `;
        staffList.appendChild(card);
    });
}

/**
 * Hire new staff member
 */
function hireStaff(role) {
    const costs = {
        server: 150,
        cleaner: 150,
        cook: 200
    };

    const cost = costs[role];

    if (gameState.money < cost) {
        showNotification('Not enough money to hire!', 'error');
        return;
    }

    // Deduct money
    gameState.money -= cost;

    // Create new staff member
    const newStaff = {
        id: gameState.staff.length,
        role: role,
        position: { x: 100 + (gameState.staff.length * 50), y: 100 },
        status: 'idle',
        color: role === 'server' ? '#3498db' : role === 'cleaner' ? '#2ecc71' : '#e74c3c'
    };

    // Add role-specific properties
    if (role === 'server') {
        newStaff.currentFood = null;
        newStaff.targetTable = null;
        newStaff.targetStorage = null;
        newStaff.servingQueue = [];
    } else if (role === 'cleaner') {
        newStaff.targetTable = null;
        newStaff.cleaningQueue = [];
    } else if (role === 'cook') {
        newStaff.assignedStation = null;
        newStaff.cookingQueue = [];
    }

    gameState.staff.push(newStaff);

    showNotification(`✅ Hired new ${role}!`, 'success');
    updateUI();
    renderStaffList();
    saveGame();
}

/**
 * Fire staff member
 */
function fireStaff(staffId) {
    if (gameState.staff.length <= 3) {
        showNotification('Cannot fire initial staff members!', 'error');
        return;
    }

    // Remove staff
    const staff = gameState.staff.find(s => s.id === staffId);
    if (!staff) return;

    const role = staff.role;
    gameState.staff = gameState.staff.filter(s => s.id !== staffId);

    showNotification(`Fired ${role} #${staffId + 1}`, 'info');
    renderStaffList();
    updateUI();
    saveGame();
}

// ================================
// COOK AUTOMATION BASED ON DEMAND
// ================================

/**
 * Intelligent cook automation - cooks based on customer orders
 */
function autoCookBasedOnDemand() {
    // Get all cook staff
    const cooks = gameState.staff.filter(s => s.role === 'cook');

    if (cooks.length === 0) return;

    // Calculate food demand based on:
    // 1. Current customer orders (waiting customers)
    // 2. Recent order patterns
    // 3. Storage levels

    const foodDemand = {};

    // Count what customers are currently ordering
    gameState.customers.forEach(customer => {
        const order = customer.order;
        foodDemand[order] = (foodDemand[order] || 0) + 1;
    });

    // Check storage levels and cook more if low
    const unlockedRecipes = getUnlockedRecipes();
    unlockedRecipes.forEach(foodType => {
        const currentStock = countFoodInStorage(foodType);

        // If stock is low (< 2), increase demand
        if (currentStock < 2) {
            foodDemand[foodType] = (foodDemand[foodType] || 0) + 2;
        }
    });

    // Assign cooks to stations and start cooking based on demand
    const availableStations = [1, 2, 3, 4].filter(id => gameState.stations[id].unlocked);

    cooks.forEach((cook, index) => {
        if (index >= availableStations.length) return; // No more stations

        const stationId = availableStations[index];
        cook.assignedStation = stationId;

        // Find food with highest demand that isn't already cooking
        let topFood = null;
        let topDemand = 0;

        Object.entries(foodDemand).forEach(([food, demand]) => {
            if (demand > topDemand) {
                topFood = food;
                topDemand = demand;
            }
        });

        if (topFood && topDemand > 0) {
            // Start cooking if station has available slots
            const station = gameState.stations[stationId];
            const availableSlot = station.cookingSlots.find(slot => !slot.cooking);

            if (availableSlot) {
                startCooking(topFood, stationId);
                // Reduce demand after starting to cook
                foodDemand[topFood]--;
            }
        }
    });
}

/**
 * Count how many of a food type are in storage
 */
function countFoodInStorage(foodType) {
    let count = 0;
    gameState.storageTables.forEach(table => {
        count += table.foods.filter(f => f === foodType).length;
    });
    count += gameState.inventory.filter(f => f === foodType).length;
    return count;
}

// Run cook automation every 3 seconds
setInterval(() => {
    autoCookBasedOnDemand();
}, 3000);

// ================================
// ENHANCED CLEANER - FLOOR CLEANING
// ================================

/**
 * Floor dirt tracking
 */
if (!gameState.floorDirt) {
    gameState.floorDirt = [];
}

/**
 * Randomly spawn floor dirt
 */
function spawnFloorDirt() {
    if (Math.random() < 0.3) { // 30% chance
        const dirt = {
            id: Date.now(),
            x: Math.random() * 80 + 10, // Random position (10% to 90%)
            y: Math.random() * 80 + 10
        };
        gameState.floorDirt.push(dirt);

        // Don't spawn too much dirt
        if (gameState.floorDirt.length > 5) {
            gameState.floorDirt.shift();
        }
    }
}

// Spawn dirt every 20 seconds
setInterval(spawnFloorDirt, 20000);

/**
 * Cleaner cleans floor dirt
 */
function cleanFloorDirt() {
    const cleaners = gameState.staff.filter(s => s.role === 'cleaner' && s.status === 'idle');

    if (cleaners.length === 0 || gameState.floorDirt.length === 0) return;

    const cleaner = cleaners[0];
    const dirt = gameState.floorDirt[0];

    if (!dirt) return;

    cleaner.status = 'cleaning_floor';

    // Move to dirt location
    moveStaffTo(cleaner, dirt.x, dirt.y, () => {
        // Clean the dirt
        gameState.floorDirt = gameState.floorDirt.filter(d => d.id !== dirt.id);
        showNotification('Floor cleaned! ✨', 'success');

        cleaner.status = 'idle';

        // Continue cleaning or clean tables
        setTimeout(() => {
            if (gameState.floorDirt.length > 0) {
                cleanFloorDirt();
            } else if (gameState.dirtyTables.length > 0) {
                cleanNextDirtyTable();
            }
        }, 500);
    });
}

// Run floor cleaning check every 5 seconds
setInterval(() => {
    cleanFloorDirt();
}, 5000);

// Auto-save every 30 seconds
setInterval(() => {
    saveGame();
}, 30000);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
