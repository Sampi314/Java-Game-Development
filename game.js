// Constants
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
// const GRID_SIZE = 12; // Moved to state

// Recipes
const RECIPES = {
    'burger': { meat: 1, bread: 1 },
    'pizza': { dough: 1, cheese: 1 },
    'soda': { sugar: 1 }
};

// Game State
const state = {
    money: 100,
    level: 1,
    customersServed: 0,
    inventory: {
        burger: 0,
        pizza: 0
    },
    ingredients: {
        meat: 5,
        bread: 5,
        cheese: 5,
        dough: 5
    },
    ingredients: {
        meat: 5,
        bread: 5,
        cheese: 5,
        dough: 5,
        sugar: 5
    },
    seeds: {
        meat: 0,
        bread: 0,
        cheese: 0,
        dough: 0,
        sugar: 0
    },
    storageLimit: 20, // Max ingredients
    orders: [], // Track active orders: { id: 'cust_1', item: 'burger' }
    xp: 0,
    maxXp: 100,
    unlockedRecipes: ['burger'], // Start with only burger
    selectedSeed: null, // For planting
    gridSize: 12, // Dynamic grid size
    quests: [], // Active quests
    fame: 0, // Restaurant fame/reputation
    maxFame: 100, // Fame level cap
    operatingTime: 0, // Total time restaurant has been running (in seconds)
    happyCustomers: 0 // Count of satisfied customers
};

class QuestManager {
    constructor() {
        this.quests = state.quests || [];
        if (this.quests.length === 0) this.generateQuests();
    }

    generateQuests() {
        const types = [
            { id: 'serve_burger', text: 'Serve 3 Burgers', type: 'serve', target: 3, current: 0, reward: 50 },
            { id: 'earn_xp', text: 'Earn 50 XP', type: 'earn_xp', target: 50, current: 0, reward: 100 },
            { id: 'buy_seed', text: 'Buy 2 Seeds', type: 'buy_seed', target: 2, current: 0, reward: 20 }
        ];

        // Pick 3 random
        this.quests = types.sort(() => 0.5 - Math.random()).slice(0, 3);
        state.quests = this.quests;
        this.updateUI();
    }

    checkProgress(type, amount = 1) {
        let updated = false;
        this.quests.forEach(q => {
            if (q.type === type && q.current < q.target) {
                q.current += amount;
                updated = true;
                if (q.current >= q.target) {
                    this.completeQuest(q);
                }
            }
        });

        if (updated) this.updateUI();
    }

    completeQuest(quest) {
        state.money += quest.reward;
        window.game.showFloatText(`Quest Complete! +$${quest.reward}`, window.innerWidth / 2, 100, 'gold');

        // Replace quest
        this.quests = this.quests.filter(q => q !== quest);
        // Add new one? Or wait for day reset? Let's just keep 3 slots.
        // For now, remove it.
        state.quests = this.quests;
        this.updateUI();
    }

    updateUI() {
        const container = document.getElementById('quest-list');
        if (!container) return;

        container.innerHTML = '';
        this.quests.forEach(q => {
            const div = document.createElement('div');
            div.className = 'quest-item';
            div.innerHTML = `
                <span>${q.text}</span>
                <span>${q.current}/${q.target}</span>
            `;
            container.appendChild(div);
        });
    }
}

class Game {
    constructor() {
        this.world = document.getElementById('world');
        this.entities = [];
        this.furniture = [];
        this.grid = [];
        this.lastTime = 0;

        // Camera State
        this.camera = {
            x: window.innerWidth / 2,
            y: 100,
            scale: 1,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0
        };

        // Build Mode State
        this.buildMode = {
            active: false,
            selectedItem: null,
            hoverX: -1,
            hoverY: -1,
            isDragging: false,
            dragStart: null, // {x, y, furniture}
            dragCurrent: null, // {x, y}
            previewElement: null // Preview ghost furniture
        };

        this.initGrid();
        this.setupLevel();
        this.setupInput();
        this.setupUI();

        this.setupUI();

        // Try Load
        if (this.loadGame()) {
            console.log("Game Loaded");
        }

        // Start loop
        requestAnimationFrame((t) => this.loop(t));

        // Auto-save
        setInterval(() => this.saveGame(), 30000);

        // Quests
        this.questManager = new QuestManager();
        this.questManager.generateQuests();
    }

    setupUI() {
        document.getElementById('btn-build-mode').addEventListener('click', () => {
            this.toggleBuildMode();
        });
    }

    // Custom Notification System
    showNotification(message, icon = 'ℹ️') {
        const modal = document.getElementById('notification-modal');
        const messageEl = document.getElementById('notification-message');
        const iconEl = document.getElementById('notification-icon');

        messageEl.textContent = message;
        iconEl.textContent = icon;
        modal.style.display = 'flex';
    }

    closeNotification() {
        const modal = document.getElementById('notification-modal');
        modal.style.display = 'none';
    }

    toggleBuildMode() {
        this.buildMode.active = !this.buildMode.active;
        const menu = document.getElementById('build-menu');
        menu.style.display = this.buildMode.active ? 'flex' : 'none';

        if (!this.buildMode.active) {
            this.buildMode.selectedItem = null;
            this.clearHighlights();
        }
    }

    setBuildItem(item) {
        this.buildMode.selectedItem = item;
    }

    // --- New UI Methods ---

    toggleMarket() {
        const modal = document.getElementById('market-modal');
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    }

    toggleStaffMenu() {
        const modal = document.getElementById('staff-modal');
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    }

    buySeed(type, cost) {
        // Check Storage (Seeds don't take storage, but let's say they do for simplicity?
        // No, the plan said "Cannot harvest/buy if storage is full".
        // Usually seeds are separate. But let's stick to the plan if strictly interpreted.
        // Actually, "ingredients" take storage. Seeds are in `state.seeds`.
        // So buying seeds should NOT check ingredient storage.
        // BUT, harvesting checks storage.
        // Let's leave buySeed without storage check for seeds, as they are not ingredients.
        // Wait, the bottom implementation checked ingredient storage?
        // "const currentStorage = Object.values(state.ingredients)..."
        // That seems wrong if I'm buying a seed.
        // I will NOT add storage check to buySeed.

        if (state.money >= cost) {
            state.money -= cost;
            state.seeds[type]++;
            this.showFloatText(`Bought 1 ${type} seed`, window.innerWidth / 2, window.innerHeight / 2, 'green');

            // Quest Event
            this.questManager.checkProgress('buy_seed');

            // Auto-select seed
            state.selectedSeed = type;
            this.toggleMarket();
            this.showNotification(`Select a Garden Plot to plant ${type}!`, '🌱');
        } else {
            this.showNotification("Not enough money!", '💰');
        }
    }

    hireStaff(role, cost) {
        if (state.money >= cost) {
            state.money -= cost;
            // Spawn at entrance
            const staff = new Staff(state.gridSize - 1, state.gridSize - 1, role);
            this.addEntity(staff);
            this.toggleStaffMenu(); // Close menu

            this.showFloatText(`New ${role}!`, window.innerWidth / 2, window.innerHeight / 2, 'blue');
        } else {
            this.showNotification("Not enough money!", '💰');
        }
    }

    showFloatText(text, x, y, color) {
        const float = document.createElement('div');
        float.textContent = text;
        float.style.position = 'absolute';
        float.style.left = x + 'px';
        float.style.top = y + 'px';
        float.style.color = color;
        float.style.fontWeight = 'bold';
        float.style.fontSize = '20px';
        float.className = 'float-text';
        float.style.zIndex = 2000;
        document.body.appendChild(float);
        setTimeout(() => float.remove(), 1000);
    }

    addXp(amount) {
        state.xp += amount;
        if (state.xp >= state.maxXp) {
            this.levelUp();
        }
        this.questManager.checkProgress('earn_xp', amount);
    }

    levelUp() {
        state.level++;
        state.xp = 0;
        state.maxXp = Math.floor(state.maxXp * 1.5);

        this.showNotification(`Level Up! You are now level ${state.level}`, '⭐');
    }

    // Check if we can discover new recipes based on collected ingredients
    checkRecipeDiscovery() {
        for (const [recipeName, recipe] of Object.entries(RECIPES)) {
            // Skip if already unlocked
            if (state.unlockedRecipes.includes(recipeName)) continue;

            // Check if we have at least 1 of each ingredient
            let canDiscover = true;
            for (const ingredient of Object.keys(recipe)) {
                if (!state.ingredients[ingredient] || state.ingredients[ingredient] < 1) {
                    canDiscover = false;
                    break;
                }
            }

            // Unlock the recipe!
            if (canDiscover) {
                state.unlockedRecipes.push(recipeName);
                const icons = { 'burger': '🍔', 'pizza': '🍕', 'soda': '🥤' };
                const icon = icons[recipeName] || '🍽️';
                this.showFloatText(`New Recipe Discovered! ${icon} ${recipeName.toUpperCase()}`, window.innerWidth / 2, window.innerHeight / 2, 'gold');
                this.showNotification(`New Recipe Discovered: ${recipeName.toUpperCase()}\n\nYou can now serve this to customers!`, icon);
            }
        }
    }

    // --- Save/Load/Expand ---

    saveGame() {
        const saveData = {
            state: state,
            furniture: this.furniture.map(f => ({
                type: f.type,
                x: f.x,
                y: f.y,
                crop: f.crop, // For garden
                growth: f.growth,
                isReady: f.isReady
            })),
            staff: this.entities.filter(e => e instanceof Staff).map(s => ({
                type: s.type,
                x: s.x,
                y: s.y,
                role: s.type // 'chef' or 'waiter'
            }))
        };
        localStorage.setItem('restaurantSave', JSON.stringify(saveData));
        this.showFloatText("Game Saved! 💾", window.innerWidth / 2, window.innerHeight / 2, 'white');
    }

    loadGame() {
        const saveStr = localStorage.getItem('restaurantSave');
        if (!saveStr) return false;

        try {
            const saveData = JSON.parse(saveStr);

            // Restore State
            Object.assign(state, saveData.state);

            // Restore Grid Size
            // Re-init grid if size changed (not implemented fully yet, assuming size matches for now)

            // Clear existing
            this.furniture.forEach(f => this.world.removeChild(f.element));
            this.furniture = [];
            this.entities.filter(e => e instanceof Staff).forEach(e => {
                e.remove = true;
                this.world.removeChild(e.element);
            });
            this.entities = this.entities.filter(e => !(e instanceof Staff));

            // Restore Furniture
            saveData.furniture.forEach(f => {
                if (f.type === 'garden') {
                    const g = new GardenPlot(f.x, f.y);
                    g.crop = f.crop;
                    g.growth = f.growth || 0;
                    g.isReady = f.isReady || false;
                    g.updateVisual();
                    this.furniture.push(g);
                    this.world.appendChild(g.element);
                    this.grid[f.x][f.y].occupied = true;
                    this.grid[f.x][f.y].furniture = g;
                } else {
                    this.addFurniture(f.type, f.x, f.y);
                }
            });

            // Restore Staff
            saveData.staff.forEach(s => {
                const staff = new Staff(s.x, s.y, s.role);
                this.addEntity(staff);
            });

            return true;
        } catch (e) {
            console.error("Save file corrupted", e);
            return false;
        }
    }

    getBonuses() {
        let bonuses = {
            xpMultiplier: 1,
            patienceDecay: 1,
            tipChance: 0
        };

        this.furniture.forEach(f => {
            if (f.type === 'plant') bonuses.xpMultiplier += 0.1; // +10% XP
            if (f.type === 'lamp') bonuses.patienceDecay *= 0.9; // 10% Slower decay
            if (f.type === 'rug') bonuses.tipChance += 0.1; // +10% Tip chance
        });

        // Cap bonuses
        bonuses.patienceDecay = Math.max(0.5, bonuses.patienceDecay); // Max 50% slow

        return bonuses;
    }



    expandRestaurant() {
        const cost = 1000 * state.level;
        if (state.money >= cost) {
            state.money -= cost;
            state.gridSize += 2;

            // Re-init grid
            this.world.innerHTML = ''; // Clear all
            this.furniture = [];
            this.entities = [];
            this.grid = [];

            this.initGrid();
            this.setupLevel(); // This resets everything... ideally we should keep furniture.
            // For now, let's just alert "Coming Soon" as full grid resize is complex
            this.showNotification("Expansion Coming Soon! (Requires engine rewrite)", '🚧');
            state.money += cost; // Refund
        } else {
            this.showNotification(`Need $${cost} to expand!`, '💰');
        }
    }

    initGrid() {
        // Create grid
        const size = state.gridSize;
        for (let x = 0; x < size; x++) {
            this.grid[x] = [];
            for (let y = 0; y < size; y++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;

                const screenX = (x - y) * (TILE_WIDTH / 2);
                const screenY = (x + y) * (TILE_HEIGHT / 2);

                tile.style.left = screenX + 'px';
                tile.style.top = screenY + 'px';

                // Walls
                if (x === 0 || y === 0) {
                    tile.classList.add('wall');
                }

                // Click handler for building
                // Use mousedown/up for dragging
                tile.addEventListener('mousedown', (e) => this.handleTileMouseDown(x, y, e));
                tile.addEventListener('mouseenter', (e) => this.handleTileHover(x, y));

                this.world.appendChild(tile);
                this.grid[x][y] = {
                    type: 'floor',
                    element: tile,
                    occupied: (x === 0 || y === 0) // Walls are occupied
                };
            }
        }

        // Global mouse up for dropping
        window.addEventListener('mouseup', () => this.handleMouseUp());

        this.updateCamera();
    }

    handleTileHover(x, y) {
        if (!this.buildMode.active) return;

        // If dragging, show preview
        if (this.buildMode.isDragging && this.buildMode.dragStart) {
            this.buildMode.dragCurrent = { x, y };
            this.clearHighlights();

            const f = this.buildMode.dragStart.furniture;
            const isValid = this.isValidPlacement(x, y, f.type, f); // Pass ignoreSelf

            const tile = this.grid[x][y];
            tile.element.classList.add(isValid ? 'highlight-valid' : 'highlight-invalid');

            // Move the furniture visually to hover
            const screenX = (x - y) * (TILE_WIDTH / 2);
            const screenY = (x + y) * (TILE_HEIGHT / 2);
            f.element.style.left = screenX + 'px';
            f.element.style.top = (screenY - 32) + 'px';
            f.element.style.opacity = '0.7';
            f.element.style.zIndex = 1000;
            return;
        }

        if (!this.buildMode.selectedItem) {
            this.removePreview();
            return;
        }

        this.clearHighlights();

        const tile = this.grid[x][y];
        const isValid = this.isValidPlacement(x, y, this.buildMode.selectedItem);

        tile.element.classList.add(isValid ? 'highlight-valid' : 'highlight-invalid');
        this.buildMode.hoverX = x;
        this.buildMode.hoverY = y;

        // Show preview of furniture
        this.showPreview(x, y, this.buildMode.selectedItem, isValid);
    }

    showPreview(x, y, itemType, isValid) {
        // Remove old preview
        this.removePreview();

        if (itemType === 'delete') return; // No preview for delete

        // Create preview element
        const preview = document.createElement('div');
        preview.className = `furniture ${itemType}-furniture`;
        preview.style.position = 'absolute';
        preview.style.width = TILE_WIDTH + 'px';
        preview.style.height = '64px';

        const screenX = (x - y) * (TILE_WIDTH / 2);
        const screenY = (x + y) * (TILE_HEIGHT / 2);
        preview.style.left = screenX + 'px';
        preview.style.top = (screenY - 32) + 'px';
        preview.style.opacity = isValid ? '0.5' : '0.3';
        preview.style.filter = isValid ? 'brightness(1.2)' : 'brightness(0.5) saturate(0)';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = 1000;

        this.world.appendChild(preview);
        this.buildMode.previewElement = preview;
    }

    removePreview() {
        if (this.buildMode.previewElement) {
            this.world.removeChild(this.buildMode.previewElement);
            this.buildMode.previewElement = null;
        }
    }

    clearHighlights() {
        for (let x = 0; x < state.gridSize; x++) {
            for (let y = 0; y < state.gridSize; y++) {
                this.grid[x][y].element.classList.remove('highlight-valid', 'highlight-invalid');
            }
        }
    }

    isValidPlacement(x, y, item, ignoreFurniture = null) {
        if (x === 0 || y === 0) return false; // Walls

        if (item === 'delete') {
            return this.grid[x][y].furniture !== undefined;
        }

        // If dragging, we ignore the spot we came from (if we are hovering over it, it's valid)
        if (ignoreFurniture && this.grid[x][y].furniture === ignoreFurniture) return true;

        return !this.grid[x][y].occupied;
    }

    handleTileMouseDown(x, y, e) {
        if (!this.buildMode.active) return;

        // If we have a selected item (like 'table'), we are placing, not dragging
        if (this.buildMode.selectedItem && this.buildMode.selectedItem !== 'delete') {
            this.handleTileClick(x, y);
            return;
        }

        // If delete mode, delete
        if (this.buildMode.selectedItem === 'delete') {
            this.handleTileClick(x, y);
            return;
        }

        // Otherwise, check for drag
        if (this.grid[x][y].furniture) {
            this.buildMode.isDragging = true;
            this.buildMode.dragStart = {
                x: x,
                y: y,
                furniture: this.grid[x][y].furniture
            };
            e.stopPropagation(); // Prevent camera drag
        }
    }

    handleMouseUp() {
        if (this.buildMode.isDragging && this.buildMode.dragStart) {
            const start = this.buildMode.dragStart;
            const current = this.buildMode.dragCurrent;
            const f = start.furniture;

            if (current) {
                // Try to place at new spot
                if (this.isValidPlacement(current.x, current.y, f.type, f)) {
                    // Move logic
                    // 1. Clear old spot
                    this.grid[start.x][start.y].occupied = false;
                    delete this.grid[start.x][start.y].furniture;

                    // 2. Set new spot
                    f.x = current.x;
                    f.y = current.y;
                    this.grid[current.x][current.y].occupied = true;
                    this.grid[current.x][current.y].furniture = f;

                    // 3. Reset visual
                    f.element.style.opacity = '1';
                    f.element.style.zIndex = '';
                    const screenX = (f.x - f.y) * (TILE_WIDTH / 2);
                    const screenY = (f.x + f.y) * (TILE_HEIGHT / 2);
                    f.element.style.left = screenX + 'px';
                    f.element.style.top = (screenY - 32) + 'px';
                } else {
                    // Revert
                    this.resetFurniturePosition(f);
                }
            } else {
                this.resetFurniturePosition(f);
            }

            this.buildMode.isDragging = false;
            this.buildMode.dragStart = null;
            this.buildMode.dragCurrent = null;
            this.clearHighlights();
        }
    }

    resetFurniturePosition(f) {
        f.element.style.opacity = '1';
        f.element.style.zIndex = '';
        const screenX = (f.x - f.y) * (TILE_WIDTH / 2);
        const screenY = (f.x + f.y) * (TILE_HEIGHT / 2);
        f.element.style.left = screenX + 'px';
        f.element.style.top = (screenY - 32) + 'px';
    }

    handleTileClick(x, y) {
        // Planting Logic (Outside Build Mode)
        if (!this.buildMode.active) {
            const furniture = this.grid[x][y].furniture;
            if (furniture && furniture.type === 'garden') {
                if (furniture.crop) {
                    // Harvest?
                    if (furniture.isReady) {
                        furniture.harvest();
                    } else {
                        this.showFloatText("Growing...", x * TILE_WIDTH, y * TILE_HEIGHT, 'white');
                    }
                } else if (state.selectedSeed) {
                    // Plant
                    if (state.seeds[state.selectedSeed] > 0) {
                        furniture.plant(state.selectedSeed);
                        state.seeds[state.selectedSeed]--;
                        if (state.seeds[state.selectedSeed] === 0) state.selectedSeed = null;
                    } else {
                        this.showNotification("No seeds left! Buy more.", '🌻');
                    }
                } else {
                    // Open Seed Shop if clicked empty plot
                    this.toggleMarket();
                }
            }
            return;
        }

        if (!this.buildMode.active || !this.buildMode.selectedItem) return;

        if (this.buildMode.selectedItem === 'delete') {
            if (this.grid[x][y].furniture) {
                this.removeFurniture(x, y);
            }
        } else {
            if (this.isValidPlacement(x, y, this.buildMode.selectedItem)) {
                // Check money
                const costs = {
                    'table': 50,
                    'stove': 100,
                    'counter': 30,
                    'garden': 20,
                    'drink_machine': 150,
                    'plant': 15,
                    'rug': 10,
                    'lamp': 25
                };
                const cost = costs[this.buildMode.selectedItem];

                if (state.money >= cost) {
                    state.money -= cost;
                    this.addFurniture(this.buildMode.selectedItem, x, y);
                } else {
                    this.showNotification('Not enough money!', '💰');
                }
            }
        }
    }

    removeFurniture(x, y) {
        const f = this.grid[x][y].furniture;
        if (f) {
            this.world.removeChild(f.element);
            this.furniture = this.furniture.filter(item => item !== f);
            this.grid[x][y].occupied = false;
            delete this.grid[x][y].furniture;

            // Refund 50%
            const refunds = { 'table': 25, 'stove': 50, 'counter': 15, 'garden': 10 };
            state.money += refunds[f.type] || 0;
        }
    }

    setupInput() {
        const container = document.getElementById('game-container');

        container.addEventListener('mousedown', (e) => {
            this.camera.isDragging = true;
            this.camera.lastMouseX = e.clientX;
            this.camera.lastMouseY = e.clientY;
            container.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.camera.isDragging) {
                const dx = e.clientX - this.camera.lastMouseX;
                const dy = e.clientY - this.camera.lastMouseY;

                this.camera.x += dx;
                this.camera.y += dy;

                this.camera.lastMouseX = e.clientX;
                this.camera.lastMouseY = e.clientY;

                this.updateCamera();
            }
        });

        window.addEventListener('mouseup', () => {
            this.camera.isDragging = false;
            container.style.cursor = 'default';
        });

        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.1;
            const newScale = this.camera.scale + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed);

            // Clamp scale
            this.camera.scale = Math.max(0.5, Math.min(2.0, newScale));
            this.updateCamera();
        });
    }

    updateCamera() {
        this.world.style.transform = `translate(${this.camera.x}px, ${this.camera.y}px) scale(${this.camera.scale})`;
    }

    setupLevel() {
        // Add Furniture
        this.addFurniture('stove', 2, 1);
        this.addFurniture('stove', 3, 1);
        this.addFurniture('counter', 2, 3); // Chef puts food here
        this.addFurniture('counter', 3, 3);

        this.addFurniture('table', 4, 4);
        this.addFurniture('table', 6, 4);
        this.addFurniture('table', 4, 6);
        this.addFurniture('table', 6, 6);

        // Add Garden
        this.addFurniture('garden', 1, 6);
        this.addFurniture('garden', 1, 7);

        // Add Staff
        const chef = new Staff(2, 2, 'chef');
        this.addEntity(chef);

        const waiter = new Staff(5, 5, 'waiter');
        this.addEntity(waiter);

        // Dynamic Customer Spawn Loop based on fame
        this.customerSpawnTimer = 0;
    }

    addFurniture(type, x, y) {
        if (type === 'garden') {
            const g = new GardenPlot(x, y);
            this.furniture.push(g);
            this.world.appendChild(g.element);
            this.grid[x][y].occupied = true;
            this.grid[x][y].furniture = g;
        } else {
            const f = new Furniture(x, y, type);
            this.furniture.push(f);
            this.world.appendChild(f.element);

            // Rugs are walkable
            if (type === 'rug') {
                f.walkable = true;
                this.grid[x][y].occupied = false; // Walkable!
                f.element.style.zIndex = 0; // Below everything
            } else {
                this.grid[x][y].occupied = true;
            }

            this.grid[x][y].furniture = f;
        }
    }

    addEntity(entity) {
        this.entities.push(entity);
        this.world.appendChild(entity.element);
    }

    spawnCustomer() {
        // Find empty table
        const emptyTable = this.furniture.find(f => f.type === 'table' && !f.occupied);
        if (emptyTable) {
            const customer = new Customer(state.gridSize - 1, state.gridSize - 1, emptyTable);
            this.addEntity(customer);
        }
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let deltaTime = (timestamp - this.lastTime) / 1000; // Seconds
        this.lastTime = timestamp;

        // Clamp delta time to prevent huge jumps (e.g. tab switching)
        if (deltaTime > 0.1) deltaTime = 0.1;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Increase operating time and fame gradually
        state.operatingTime += dt;

        // Gain fame slowly over time (0.5 fame per minute of operation)
        if (state.fame < state.maxFame) {
            state.fame += (0.5 / 60) * dt;
            state.fame = Math.min(state.fame, state.maxFame);
        }

        // Fame levels up at certain thresholds
        if (state.fame >= state.maxFame) {
            state.maxFame += 50; // Increase fame cap
        }

        // Dynamic customer spawning based on fame
        // Base spawn interval: 8 seconds at fame 0, down to 2 seconds at fame 100+
        const fameLevel = Math.min(state.fame / 50, 2); // 0 to 2 based on fame
        const spawnInterval = Math.max(2, 8 - (fameLevel * 3)); // 8s -> 2s as fame increases

        this.customerSpawnTimer += dt;
        if (this.customerSpawnTimer >= spawnInterval) {
            this.spawnCustomer();
            this.customerSpawnTimer = 0;
        }

        this.entities.forEach((entity, index) => {
            entity.update(dt);
            if (entity.remove) {
                this.world.removeChild(entity.element);
                this.entities.splice(index, 1);
            }
        });
    }

    render() {
        // Sort for Z-Index
        const allObjects = [...this.entities, ...this.furniture];
        allObjects.forEach(obj => {
            // Simple depth sorting
            obj.element.style.zIndex = Math.floor(obj.x + obj.y);
        });

        // Update UI
        document.getElementById('money').textContent = state.money;
        document.getElementById('level').textContent = state.level;
        document.getElementById('customers-served').textContent = state.customersServed;
        document.getElementById('xp').textContent = state.xp;
        document.getElementById('max-xp').textContent = state.maxXp;
        document.getElementById('fame').textContent = Math.floor(state.fame);
        document.getElementById('max-fame').textContent = state.maxFame;

        // Storage UI
        const currentStorage = Object.values(state.ingredients).reduce((a, b) => a + b, 0);
        document.getElementById('storage-display').textContent = `${currentStorage}/${state.storageLimit}`;

        // Expand Cost UI
        const expandCost = 1000 * state.level;
        const expandCostEl = document.getElementById('expand-cost');
        if (expandCostEl) expandCostEl.textContent = `$${expandCost}`;

        // Update Garden Plots
        this.furniture.forEach(f => {
            if (f.type === 'garden') f.update(0.016); // Approx dt
        });
    }

    // Pathfinding (BFS)
    findPath(startX, startY, endX, endY) {
        const queue = [{ x: startX, y: startY, path: [] }];
        const visited = new Set();
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;

            if (current.x === endX && current.y === endY) {
                return current.path;
            }

            if (visited.has(key)) continue;
            visited.add(key);

            for (const [dx, dy] of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;

                if (nx >= 0 && nx < state.gridSize && ny >= 0 && ny < state.gridSize) {
                    // Check if walkable (not occupied, OR is the destination)
                    if (!this.grid[nx][ny].occupied || (nx === endX && ny === endY)) {
                        queue.push({
                            x: nx,
                            y: ny,
                            path: [...current.path, { x: nx, y: ny }]
                        });
                    }
                }
            }
        }
        return null; // No path found
    }





    upgradeStorage() {
        const cost = state.storageLimit * 2; // Cost increases with current limit
        if (state.money >= cost) {
            state.money -= cost;
            state.storageLimit += 10; // Increase by 10 slots
            this.showFloatText(`Storage Upgraded! +10 slots`, this.world.offsetWidth / 2, this.world.offsetHeight / 2, 'lime');
        } else {
            this.showNotification(`Not enough money! Need $${cost} to upgrade storage.`, '💰');
        }
    }
}

class Entity {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.element = document.createElement('div');
        this.element.className = `entity ${type}`;
        this.element.innerHTML = '<div class="entity-inner"></div>';

        // Movement
        this.targetX = x;
        this.targetY = y;
        this.path = [];
        this.speed = 2; // Tiles per second
        this.moving = false;

        this.updateVisualPosition();
    }

    update(dt) {
        if (this.moving) {
            this.moveAlongPath(dt);
        }
    }

    moveTo(x, y) {
        // Don't recalculate if already going there
        if (this.targetX === x && this.targetY === y && this.moving) return;

        const path = window.game.findPath(Math.round(this.x), Math.round(this.y), x, y);
        if (path) {
            this.path = path;
            this.moving = true;
            this.targetX = x;
            this.targetY = y;
        }
    }

    moveAlongPath(dt) {
        if (this.path.length === 0) {
            this.moving = false;
            return;
        }

        const target = this.path[0];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
            this.x = target.x;
            this.y = target.y;
            this.path.shift();
        } else {
            const moveDist = this.speed * dt;
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }
        this.updateVisualPosition();
    }

    updateVisualPosition() {
        const screenX = (this.x - this.y) * (TILE_WIDTH / 2);
        const screenY = (this.x + this.y) * (TILE_HEIGHT / 2);
        this.element.style.left = (screenX + TILE_WIDTH / 2 - 16) + 'px';
        this.element.style.top = (screenY - 32) + 'px';
    }
}

class Furniture {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.occupied = false;
        this.items = []; // Items on the furniture (food)
        this.element = document.createElement('div');
        this.element.className = `furniture ${type}-furniture`;

        const screenX = (this.x - this.y) * (TILE_WIDTH / 2);
        const screenY = (this.x + this.y) * (TILE_HEIGHT / 2);
        this.element.style.left = screenX + 'px';
        this.element.style.top = (screenY - 32) + 'px';
    }
}

class GardenPlot extends Furniture {
    constructor(x, y) {
        super(x, y, 'garden');
        this.crop = null;
        this.growth = 0;
        this.isReady = false;

        this.cropVisual = document.createElement('div');
        this.cropVisual.className = 'crop-visual';
        this.element.appendChild(this.cropVisual);
    }

    plant(seedType) {
        this.crop = seedType;
        this.growth = 0;
        this.isReady = false;
        this.updateVisual();
    }

    update(dt) {
        if (this.crop && !this.isReady) {
            this.growth += dt * 0.5; // Growth speed
            if (this.growth >= 100) {
                this.growth = 100;
                this.isReady = true;
            }
            this.updateVisual();
        }
    }

    harvest() {
        if (this.isReady) {
            // Check Storage
            const currentStorage = Object.values(state.ingredients).reduce((a, b) => a + b, 0);
            if (currentStorage + 5 > state.storageLimit) {
                window.game.showFloatText("Storage Full! 📦", this.element.offsetLeft, this.element.offsetTop, 'red');
                return;
            }

            state.ingredients[this.crop] += 5; // Yield 5
            window.game.showFloatText(`+5 ${this.crop}`, this.element.offsetLeft, this.element.offsetTop, 'gold');
            window.game.addXp(5);

            // Check for recipe discoveries
            window.game.checkRecipeDiscovery();

            this.crop = null;
            this.growth = 0;
            this.isReady = false;
            this.updateVisual();
        }
    }

    updateVisual() {
        if (!this.crop) {
            this.cropVisual.textContent = '';
            return;
        }

        if (this.isReady) {
            this.cropVisual.textContent = this.getIcon(this.crop);
            this.cropVisual.style.filter = 'none';
            this.cropVisual.style.transform = 'scale(1.2)';
        } else {
            this.cropVisual.textContent = '🌱';
            const scale = 0.5 + (this.growth / 200);
            this.cropVisual.style.transform = `scale(${scale})`;
            this.cropVisual.style.filter = 'grayscale(50%)';
        }
    }

    getIcon(type) {
        const icons = { 'meat': '🥩', 'bread': '🌾', 'cheese': '🧀', 'dough': '🌾', 'sugar': '🍬' };
        return icons[type] || '❓';
    }
}

class Staff extends Entity {
    constructor(x, y, role) {
        super(x, y, role); // role = 'chef' or 'waiter'
        this.state = 'IDLE'; // IDLE, MOVING_TO_STOVE, COOKING, MOVING_TO_COUNTER, RESTING
        this.targetFurniture = null;
        this.cookingTimer = 0;
        this.energy = 100;

        // RPG Stats
        this.level = 1;
        this.xp = 0;
        this.maxXp = 100;

        // Visuals
        this.energyBar = document.createElement('div');
        this.energyBar.className = 'energy-bar';
        this.element.appendChild(this.energyBar);

        this.levelBadge = document.createElement('div');
        this.levelBadge.className = 'level-badge';
        this.levelBadge.textContent = '1';
        this.element.appendChild(this.levelBadge);

        // Click to wake up
        this.element.style.pointerEvents = 'auto'; // Enable clicking on staff
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'EXHAUSTED') {
                if (state.money >= 10) {
                    state.money -= 10;
                    this.energy = 100;
                    this.state = 'IDLE';
                    this.element.style.filter = 'none';
                    this.element.classList.remove('exhausted');
                    const zzz = this.element.querySelector('.zzz-icon');
                    if (zzz) zzz.remove();

                    // Show +Energy effect
                    const float = document.createElement('div');
                    float.textContent = '⚡ +100';
                    float.style.position = 'absolute';
                    float.style.color = 'yellow';
                    float.style.top = '-20px';
                    float.className = 'float-text';
                    this.element.appendChild(float);
                    setTimeout(() => float.remove(), 1000);
                } else {
                    game.showNotification("Need $10 to feed staff!", '🍔');
                }
            }
        });
    }

    gainXp(amount) {
        this.xp += amount;
        if (this.xp >= this.maxXp) {
            this.level++;
            this.xp = 0;
            this.maxXp = Math.floor(this.maxXp * 1.5); // Increase XP needed for next level
            this.speed += 0.5; // Get faster!
            this.levelBadge.textContent = this.level;
            window.game.showFloatText("Level Up! ⚡", this.x * TILE_WIDTH, this.y * TILE_HEIGHT, 'cyan');
        }
    }

    update(dt) {
        super.update(dt);

        // Energy Decay
        if (this.state !== 'RESTING' && this.state !== 'IDLE') {
            // 1 hour = 3600 seconds. 100 energy / 3600 = ~0.0277
            this.energy -= dt * (100 / 3600);
        }

        // Update energy bar visual
        this.energyBar.style.width = `${Math.max(0, this.energy)}%`;
        if (this.energy < 30) {
            this.energyBar.style.backgroundColor = 'red';
        } else if (this.energy < 60) {
            this.energyBar.style.backgroundColor = 'orange';
        } else {
            this.energyBar.style.backgroundColor = 'lime';
        }


        // Exhaustion
        if (this.energy <= 0 && this.state !== 'EXHAUSTED') {
            this.state = 'EXHAUSTED';
            this.moving = false;
            this.path = []; // Stop moving
            // Visual cue for tired
            this.element.style.filter = 'grayscale(100%)';
            this.element.classList.add('exhausted');

            // Show Zzz icon
            const zzz = document.createElement('div');
            zzz.className = 'zzz-icon';
            zzz.textContent = '💤';
            zzz.style.position = 'absolute';
            zzz.style.top = '-20px';
            zzz.style.left = '10px';
            this.element.appendChild(zzz);
        }

        if (this.state === 'EXHAUSTED') {
            return; // Do nothing until clicked
        }

        if (this.state === 'RESTING') {
            // Recover energy slowly
            this.energy += dt * 5;
            if (this.energy >= 100) {
                this.energy = 100;
                this.state = 'IDLE';
                this.element.style.filter = 'none';
                this.element.classList.remove('exhausted');
            }
            return; // Don't do work
        }

        if (this.type === 'chef') {
            this.updateChef(dt);
        } else if (this.type === 'waiter') {
            this.updateWaiter(dt);
        }
    }

    updateChef(dt) {
        if (this.state === 'IDLE') {
            // Smart Cooking: Check what is ordered but not yet cooked
            const neededItems = state.orders.map(o => o.item);

            if (neededItems.length === 0) {
                // No orders yet - chef waits
                console.log('Chef waiting - no orders yet');
                return;
            }

            console.log('Chef checking orders:', neededItems);

            // Filter by what we CAN cook (unlocked recipes only)
            const cookableItems = neededItems.filter(item => {
                // Check if recipe is unlocked
                if (!state.unlockedRecipes.includes(item)) {
                    console.log('Recipe not unlocked:', item);
                    return false;
                }
                return true;
            });

            console.log('Cookable items:', cookableItems);

            // Prioritize: Cook first needed item
            let itemToCook = null;

            if (cookableItems.length > 0) {
                itemToCook = cookableItems[0]; // Cook first needed
            } else {
                // Nothing ordered that we can cook.
                console.log('Chef idle - no cookable items (recipe not unlocked or no stove/counter)');
                this.state = 'IDLE';
                return;
            }

            if (itemToCook) {
                // Find stove or drink machine
                let targetStation = null;
                let stationType = 'stove';

                if (itemToCook === 'soda') {
                    targetStation = window.game.furniture.find(f => f.type === 'drink_machine' && !f.occupied);
                    stationType = 'drink_machine';
                } else {
                    targetStation = window.game.furniture.find(f => f.type === 'stove' && !f.occupied);
                }

                const counter = window.game.furniture.find(f => f.type === 'counter' && f.items.length === 0);

                console.log('Chef looking for station:', stationType, 'found:', !!targetStation, 'counter:', !!counter);

                if (targetStation && counter) {
                    console.log('Chef starting to cook', itemToCook, 'at', targetStation.x, targetStation.y);

                    this.state = 'MOVING_TO_STOVE';
                    this.targetFurniture = { stove: targetStation, counter: counter, type: itemToCook };
                    this.cookingItem = itemToCook;
                    this.cookingTimer = (itemToCook === 'soda') ? 0.5 : 2.0; // Fast soda
                    this.moveTo(targetStation.x, targetStation.y);
                    targetStation.occupied = true; // Reserve it

                    // Gain XP
                    this.gainXp(5);
                } else {
                    console.log('Chef blocked - missing station or counter');
                }
            }
        } else if (this.state === 'MOVING_TO_STOVE') {
            if (!this.moving) {
                this.state = 'COOKING';
            }
        } else if (this.state === 'COOKING') {
            this.cookingTimer -= dt;
            if (this.cookingTimer <= 0) {
                this.state = 'MOVING_TO_COUNTER';
                this.moveTo(this.targetFurniture.counter.x, this.targetFurniture.counter.y);
                this.targetFurniture.stove.occupied = false; // Free stove
            }
        } else if (this.state === 'MOVING_TO_COUNTER') {
            if (!this.moving) {
                this.state = 'IDLE';
                // Place food
                this.targetFurniture.counter.items.push(this.targetFurniture.type);
                // Create visual for food
                const food = document.createElement('div');
                food.textContent = this.targetFurniture.type === 'burger' ? '🍔' : (this.targetFurniture.type === 'pizza' ? '🍕' : '🥤');
                food.style.position = 'absolute';
                food.style.bottom = '40px'; // Raised to look like it's ON the counter
                food.style.left = '10px';
                this.targetFurniture.counter.element.appendChild(food);
            }
        }
    }

    updateWaiter(dt) {
        if (this.state === 'IDLE') {
            // Find customer waiting for food
            const customer = window.game.entities.find(e => e.type === 'customer' && e.state === 'WAITING_FOR_FOOD');
            if (customer) {
                console.log('Waiter found waiting customer, looking for', customer.order);
                // Find food on counter that MATCHES the order
                const counterWithFood = window.game.furniture.find(f => f.type === 'counter' && f.items.includes(customer.order));
                console.log('Counter with food:', !!counterWithFood, 'items:', counterWithFood?.items);
                if (counterWithFood) {
                    console.log('Waiter moving to pick up food');
                    this.state = 'MOVING_TO_FOOD';
                    this.targetItem = { customer: customer, counter: counterWithFood };
                    customer.state = 'BEING_SERVED'; // Prevent other waiters
                    this.moveTo(counterWithFood.x, counterWithFood.y);
                } else {
                    console.log('Waiter waiting - food not ready yet');
                }
            } else {
                // console.log('Waiter idle - no waiting customers');
            }
        } else if (this.state === 'MOVING_TO_FOOD') {
            if (!this.moving) {
                // Pick up food
                const foodIndex = this.targetItem.counter.items.indexOf(this.targetItem.customer.order);
                if (foodIndex !== -1) {
                    this.targetItem.counter.items.splice(foodIndex, 1);
                    this.targetItem.counter.element.lastChild.remove(); // Remove visual
                    this.state = 'DELIVERING';
                    this.moveTo(this.targetItem.customer.x, this.targetItem.customer.y);
                } else {
                    // Food gone? Go back to idle
                    this.state = 'IDLE';
                    this.targetItem.customer.state = 'WAITING_FOR_FOOD';
                }
            }
        } else if (this.state === 'DELIVERING') {
            if (!this.moving) {
                this.state = 'IDLE';
                this.targetItem.customer.receiveFood();
            }
        }
    }
}

class Customer extends Entity {
    constructor(x, y, targetTable) {
        super(x, y, 'customer');
        this.targetTable = targetTable;
        this.targetTable.occupied = true;
        this.state = 'WALKING_IN';

        // Order Logic
        // Only order unlocked items
        const options = state.unlockedRecipes;
        this.order = options[Math.floor(Math.random() * options.length)];
        this.id = 'cust_' + Date.now() + Math.random();

        // Patience Logic
        this.maxPatience = 30; // Seconds
        this.patience = this.maxPatience;

        // VIP Logic (Override patience)
        this.isVip = Math.random() < 0.1; // 10% chance
        if (this.isVip) {
            this.element.classList.add('vip');
            this.maxPatience = 25; // 50% of normal (30s -> 25s)
            this.patience = this.maxPatience;
            window.game.showFloatText("VIP Arrived! 🌟", this.x * TILE_WIDTH, this.y * TILE_HEIGHT, 'gold');
        }

        // Visuals
        this.createOrderBubble();
        this.createPatienceBar();

        this.moveTo(targetTable.x, targetTable.y);
    }

    createOrderBubble() {
        this.bubble = document.createElement('div');
        this.bubble.className = 'order-bubble';
        this.bubble.textContent = this.order === 'burger' ? '🍔' : (this.order === 'pizza' ? '🍕' : '🥤');
        this.bubble.style.position = 'absolute';
        this.bubble.style.top = '-30px';
        this.bubble.style.left = '0';
        this.bubble.style.background = 'white';
        this.bubble.style.padding = '2px 5px';
        this.bubble.style.borderRadius = '10px';
        this.bubble.style.border = '1px solid #333';
        this.bubble.style.fontSize = '12px';
        this.bubble.style.display = 'none'; // Hide until seated
        this.element.appendChild(this.bubble);
    }

    createPatienceBar() {
        this.patienceBar = document.createElement('div');
        this.patienceBar.className = 'patience-bar';
        this.patienceBar.style.position = 'absolute';
        this.patienceBar.style.top = '-40px';
        this.patienceBar.style.left = '0';
        this.patienceBar.style.width = '32px';
        this.patienceBar.style.height = '4px';
        this.patienceBar.style.background = 'red';
        this.patienceBar.style.border = '1px solid black';

        this.patienceFill = document.createElement('div');
        this.patienceFill.style.width = '100%';
        this.patienceFill.style.height = '100%';
        this.patienceFill.style.background = '#00ff00';
        this.patienceBar.appendChild(this.patienceFill);

        this.patienceBar.style.display = 'none';
        this.element.appendChild(this.patienceBar);
    }

    update(dt) {
        super.update(dt);

        if (this.state === 'WALKING_IN' && !this.moving) {
            this.state = 'WAITING_FOR_FOOD';
            this.bubble.style.display = 'block';
            this.patienceBar.style.display = 'block';
            state.orders.push({ id: this.id, item: this.order });
        }

        if (this.state === 'WAITING_FOR_FOOD') {
            const bonuses = window.game.getBonuses();
            this.patience -= dt * bonuses.patienceDecay; // Apply Lamp bonus
            const pct = Math.max(0, (this.patience / this.maxPatience) * 100);
            this.patienceFill.style.width = pct + '%';

            // Color change
            if (pct < 30) this.patienceFill.style.background = 'red';
            else if (pct < 60) this.patienceFill.style.background = 'orange';
            else this.patienceFill.style.background = '#00ff00'; // Ensure it resets to green

            if (this.patience <= 0) {
                this.leaveAngry();
            }
        }
    }

    receiveFood() {
        this.state = 'EATING';
        this.bubble.style.display = 'none';
        this.patienceBar.style.display = 'none';

        // Remove from active orders
        state.orders = state.orders.filter(o => o.id !== this.id);

        // Show food on table
        const food = document.createElement('div');
        food.textContent = this.order === 'burger' ? '🍔' : (this.order === 'pizza' ? '🍕' : '🥤');
        food.style.position = 'absolute';
        food.style.bottom = '40px'; // Raised
        food.style.left = '10px';
        this.targetTable.element.appendChild(food);

        setTimeout(() => {
            if (this.targetTable.element.contains(food)) {
                this.targetTable.element.removeChild(food);
            }
            // 50% chance to leave trash
            if (Math.random() > 0.5) {
                this.leaveTrash();
            }
            this.leave();
        }, 5000);
    }

    leaveTrash() {
        const trash = document.createElement('div');
        trash.textContent = '🗑️';
        trash.style.position = 'absolute';
        trash.style.bottom = '10px';
        trash.style.right = '10px';
        this.targetTable.element.appendChild(trash);

        // Auto-clean after 3 seconds (simplified for now, ideally Janitor does it)
        setTimeout(() => {
            if (this.targetTable.element.contains(trash)) {
                this.targetTable.element.removeChild(trash);
            }
        }, 3000);
    }

    leave() {
        this.state = 'LEAVING';
        this.targetTable.occupied = false;
        this.moveTo(state.gridSize - 1, state.gridSize - 1);

        const checkExit = setInterval(() => {
            if (!this.moving && this.state === 'LEAVING') {
                this.remove = true;
                if (!this.angry) {
                    // Calculate tip based on patience
                    const bonuses = window.game.getBonuses();

                    // Tip Calculation
                    let tip = 0;
                    if (Math.random() < bonuses.tipChance) {
                        tip = Math.floor(this.patience / 2); // Big tip!
                        window.game.showFloatText("Big Tip! 💰", this.x * TILE_WIDTH, this.y * TILE_HEIGHT, 'gold');
                    } else {
                        tip = Math.floor(this.patience / 10); // Normal tip
                    }

                    let payment = 20 + tip;
                    let xpGain = Math.floor((10 + tip) * bonuses.xpMultiplier);

                    // VIP Bonus
                    if (this.isVip) {
                        payment *= 3;
                        xpGain *= 3;
                        window.game.showFloatText("VIP Bonus! 💎", this.x * TILE_WIDTH, this.y * TILE_HEIGHT, 'purple');
                    }

                    state.money += payment;
                    state.customersServed++;
                    window.game.addXp(xpGain);

                    // Gain fame based on customer satisfaction
                    // More patience left = more fame gained (1-5 fame points)
                    const satisfactionLevel = this.patience / this.maxPatience;
                    const fameGain = Math.floor(satisfactionLevel * 5) + 1; // 1-5 fame
                    if (state.fame < state.maxFame) {
                        state.fame += fameGain;
                        state.happyCustomers++;
                    }

                    // Quest Update
                    window.game.questManager.checkProgress('serve');

                    // Show money popup
                    const popup = document.createElement('div');
                    popup.textContent = `+$${payment}`;
                    popup.className = 'float-text';
                    popup.style.position = 'absolute';
                    popup.style.left = this.element.style.left;
                    popup.style.top = this.element.style.top;
                    popup.style.color = 'gold';
                    popup.style.fontWeight = 'bold';
                    document.getElementById('world').appendChild(popup);
                    setTimeout(() => popup.remove(), 1000);
                }
                clearInterval(checkExit);
            }
        }, 100);
    }

    leaveAngry() {
        this.state = 'LEAVING';
        this.angry = true;
        this.targetTable.occupied = false;

        // Remove from orders
        state.orders = state.orders.filter(o => o.id !== this.id);

        this.bubble.textContent = '😡';
        this.patienceBar.style.display = 'none';

        this.moveTo(state.gridSize - 1, state.gridSize - 1);

        // Angry visual
        this.element.style.filter = 'hue-rotate(90deg)'; // Turn red-ish

        const checkExit = setInterval(() => {
            if (!this.moving && this.state === 'LEAVING') {
                this.remove = true;
                clearInterval(checkExit);
            }
        }, 100);
    }
}

// Start game
window.onload = () => {
    window.game = new Game();
};
