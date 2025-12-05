window.onload = () => {
    const world = document.getElementById('world');
    const gameContainer = document.getElementById('game-container');
    const TILE_WIDTH = 64;
    const TILE_HEIGHT = 32;
    const MAP_SIZE = 30;

    // Building area (the restaurant)
    const BUILDING_START = 18;
    const BUILDING_END = 26;

    // Camera position and zoom
    let cameraX = 0;
    let cameraY = 50;
    let zoom = 1;
    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 2;

    // Apply camera position and zoom
    function updateCamera() {
        world.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`;
    }
    updateCamera();

    // Determine tile type based on position
    function getTileType(x, y) {
        // Center intersection (2x2) - plain road
        if (x >= 14 && x <= 15 && y >= 14 && y <= 15) {
            return 'road';
        }

        // Vertical road (x = 14, 15) - runs down the middle
        if (x >= 14 && x <= 15) {
            return 'road';
        }

        // Horizontal road (y = 14, 15) - runs across the middle
        if (y >= 14 && y <= 15) {
            return 'road';
        }

        // Sidewalks around vertical road (x = 12, 13 and x = 16, 17)
        if (x >= 12 && x <= 13) {
            return 'sidewalk';
        }
        if (x >= 16 && x <= 17) {
            return 'sidewalk';
        }

        // Sidewalks around horizontal road (y = 12, 13 and y = 16, 17)
        if (y >= 12 && y <= 13) {
            return 'sidewalk';
        }
        if (y >= 16 && y <= 17) {
            return 'sidewalk';
        }

        // Building interior (with walls)
        if (x >= BUILDING_START && x <= BUILDING_END &&
            y >= BUILDING_START && y <= BUILDING_END) {
            if (x === BUILDING_START && y === BUILDING_START) {
                return 'building-corner';
            } else if (x === BUILDING_START) {
                return 'building-wall-left';
            } else if (y === BUILDING_START) {
                return 'building-wall-right';
            }
            return 'building';
        }

        // Grass elsewhere
        return 'grass';
    }

    // Build the city grid
    for (let x = 0; x < MAP_SIZE; x++) {
        for (let y = 0; y < MAP_SIZE; y++) {
            const tile = document.createElement('div');
            tile.className = 'tile';

            // Isometric Projection
            const screenX = (x - y) * (TILE_WIDTH / 2);
            const screenY = (x + y) * (TILE_HEIGHT / 2);

            tile.style.left = screenX + 'px';
            tile.style.top = screenY + 'px';

            const tileType = getTileType(x, y);

            // Apply tile styles
            switch (tileType) {
                case 'building-corner':
                    tile.classList.add('wall-corner');
                    break;
                case 'building-wall-left':
                    tile.classList.add('wall-left');
                    break;
                case 'building-wall-right':
                    tile.classList.add('wall-right');
                    break;
                case 'building':
                    // Interior floor (default tile style)
                    break;
                case 'sidewalk':
                    tile.classList.add('sidewalk');
                    break;
                case 'road':
                    tile.classList.add('road');
                    break;
                case 'grass':
                    tile.classList.add('grass');
                    break;
            }

            world.appendChild(tile);
        }
    }

    // Camera panning with mouse drag
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    gameContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        gameContainer.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        cameraX += deltaX;
        cameraY += deltaY;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        updateCamera();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        gameContainer.style.cursor = 'grab';
    });

    // Touch support for mobile
    gameContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const deltaX = e.touches[0].clientX - lastMouseX;
        const deltaY = e.touches[0].clientY - lastMouseY;

        cameraX += deltaX;
        cameraY += deltaY;

        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;

        updateCamera();
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Set initial cursor
    gameContainer.style.cursor = 'grab';

    // Zoom with mouse wheel
    gameContainer.addEventListener('wheel', (e) => {
        e.preventDefault();

        const zoomSpeed = 0.1;
        if (e.deltaY < 0) {
            // Zoom in
            zoom = Math.min(MAX_ZOOM, zoom + zoomSpeed);
        } else {
            // Zoom out
            zoom = Math.max(MIN_ZOOM, zoom - zoomSpeed);
        }

        updateCamera();
    }, { passive: false });

    // Furniture system
    const furniture = [];
    let editModeItem = null;
    let placementHighlight = null;
    let editControls = null;

    function createFurniture(type, startX, startY, isNew = false) {
        const item = document.createElement('div');
        // Default direction: South-East
        const direction = 'se';
        item.className = `tile ${type} ${type}-${direction}`;
        item.style.cursor = 'pointer';

        const furnitureObj = {
            element: item,
            x: startX,
            y: startY,
            type: type,
            direction: direction,
            isDragging: false,
            isNew: isNew,
            startX: 0,
            startY: 0,
            lastValidX: startX,
            lastValidY: startY
        };

        furniture.push(furnitureObj);
        world.appendChild(item);
        updateFurniturePosition(furnitureObj);

        // Event listeners
        item.addEventListener('mousedown', (e) => handleDragStart(e, furnitureObj));
        item.addEventListener('touchstart', (e) => handleDragStart(e, furnitureObj));

        return furnitureObj;
    }

    function updateFurniturePosition(item) {
        const screenX = (item.x - item.y) * (TILE_WIDTH / 2);
        const screenY = (item.x + item.y) * (TILE_HEIGHT / 2);
        item.element.style.left = screenX + 'px';
        item.element.style.top = screenY + 'px';

        // Update z-index based on Y position for correct layering
        item.element.style.zIndex = item.x + item.y + 10;

        // Update direction class
        item.element.className = `tile ${item.type} ${item.type}-${item.direction}`;

        // Update highlight and controls if this is the edit item
        if (editModeItem === item) {
            updateEditVisuals(item);
        }
    }

    function checkCollision(x, y, currentItem) {
        // Check map bounds
        if (x < BUILDING_START || x > BUILDING_END || y < BUILDING_START || y > BUILDING_END) {
            return true;
        }

        // Check against other furniture
        for (const other of furniture) {
            if (other !== currentItem && other.x === x && other.y === y) {
                return true;
            }
        }

        return false;
    }

    function rotateFurniture(item) {
        const directions = ['se', 'sw', 'nw', 'ne'];
        const currentIndex = directions.indexOf(item.direction);
        const nextIndex = (currentIndex + 1) % directions.length;
        item.direction = directions[nextIndex];
        updateFurniturePosition(item);
    }

    // Edit Mode UI Functions
    function showEditControls(item) {
        if (editControls) hideEditControls();
        editModeItem = item;

        // Create Highlight
        placementHighlight = document.createElement('div');
        placementHighlight.className = 'placement-highlight valid';
        world.appendChild(placementHighlight);

        // Create Controls Container
        editControls = document.createElement('div');
        editControls.className = 'edit-controls';

        // Rotate Button
        const rotateBtn = document.createElement('div');
        rotateBtn.className = 'edit-btn rotate';
        rotateBtn.innerHTML = '↻';
        rotateBtn.onclick = (e) => { e.stopPropagation(); rotateFurniture(item); };

        // Confirm Button
        const confirmBtn = document.createElement('div');
        confirmBtn.className = 'edit-btn confirm';
        confirmBtn.innerHTML = '✓';
        confirmBtn.onclick = (e) => { e.stopPropagation(); confirmPlacement(); };

        // Cancel Button
        const cancelBtn = document.createElement('div');
        cancelBtn.className = 'edit-btn cancel';
        cancelBtn.innerHTML = '✕';
        cancelBtn.onclick = (e) => { e.stopPropagation(); cancelPlacement(); };

        editControls.appendChild(rotateBtn);
        editControls.appendChild(confirmBtn);
        editControls.appendChild(cancelBtn);
        world.appendChild(editControls);

        updateEditVisuals(item);
    }

    function hideEditControls() {
        if (placementHighlight) {
            placementHighlight.remove();
            placementHighlight = null;
        }
        if (editControls) {
            editControls.remove();
            editControls = null;
        }
        editModeItem = null;
    }

    function updateEditVisuals(item) {
        if (!placementHighlight || !editControls) return;

        const screenX = (item.x - item.y) * (TILE_WIDTH / 2);
        const screenY = (item.x + item.y) * (TILE_HEIGHT / 2);

        // Position highlight
        placementHighlight.style.left = screenX + 'px';
        placementHighlight.style.top = screenY + 'px';
        placementHighlight.style.zIndex = item.x + item.y + 5; // Below object

        // Check validity
        const isColliding = checkCollision(item.x, item.y, item);
        if (isColliding) {
            placementHighlight.classList.remove('valid');
            placementHighlight.classList.add('invalid');
        } else {
            placementHighlight.classList.remove('invalid');
            placementHighlight.classList.add('valid');
        }

        // Position controls
        editControls.style.left = (screenX + 32) + 'px'; // Center horizontally
        editControls.style.top = screenY + 'px';
        editControls.style.zIndex = 2000;
    }

    function confirmPlacement() {
        if (!editModeItem) return;

        if (checkCollision(editModeItem.x, editModeItem.y, editModeItem)) {
            // Invalid placement, maybe shake or alert?
            // For now, just don't confirm
            return;
        }

        // Valid placement
        editModeItem.lastValidX = editModeItem.x;
        editModeItem.lastValidY = editModeItem.y;
        editModeItem.isNew = false;

        // Auto-rotate check (only on confirm)
        autoRotateChair(editModeItem);

        hideEditControls();
    }

    function cancelPlacement() {
        if (!editModeItem) return;

        if (editModeItem.isNew) {
            // Remove from DOM
            editModeItem.element.remove();
            // Remove from array
            const index = furniture.indexOf(editModeItem);
            if (index > -1) {
                furniture.splice(index, 1);
            }
        } else {
            // Revert position
            editModeItem.x = editModeItem.lastValidX;
            editModeItem.y = editModeItem.lastValidY;
            updateFurniturePosition(editModeItem);
        }

        hideEditControls();
    }

    function autoRotateChair(chair) {
        if (chair.type !== 'chair') return;

        const neighbors = [
            { dx: 1, dy: 0, dir: 'se' },
            { dx: -1, dy: 0, dir: 'nw' },
            { dx: 0, dy: 1, dir: 'sw' },
            { dx: 0, dy: -1, dir: 'ne' }
        ];

        for (const n of neighbors) {
            const nx = chair.x + n.dx;
            const ny = chair.y + n.dy;
            const table = furniture.find(f => f.type === 'table' && f.x === nx && f.y === ny);
            if (table) {
                chair.direction = n.dir;
                updateFurniturePosition(chair);
                return;
            }
        }
    }

    // Unified Drag Handler
    let activeItem = null;
    let longPressTimer = null;

    function handleDragStart(e, item) {
        e.stopPropagation();

        // If we are already editing THIS item, start drag immediately
        if (editModeItem === item) {
            startDrag(e, item);
            return;
        }

        // If editing another item, ignore or switch? Let's ignore to force confirm/cancel
        if (editModeItem && editModeItem !== item) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        item.startX = clientX;
        item.startY = clientY;

        // Long press to enter edit mode
        longPressTimer = setTimeout(() => {
            showEditControls(item);
            // Optional: Auto-start drag on long press?
            // User said "long click... get into edit furniture mode"
            // Doesn't explicitly say start dragging. But usually expected.
            startDrag(e, item);
        }, 500);
    }

    function startDrag(e, item) {
        activeItem = item;
        item.isDragging = true;
        item.element.style.cursor = 'grabbing';
        gameContainer.style.cursor = 'grabbing';

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        item.startX = clientX;
        item.startY = clientY;
    }

    function handleDragMove(e) {
        if (!activeItem) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const deltaX = (clientX - activeItem.startX) / zoom;
        const deltaY = (clientY - activeItem.startY) / zoom;

        const gridDeltaX = Math.round((deltaX / TILE_WIDTH + deltaY / TILE_HEIGHT));
        const gridDeltaY = Math.round((deltaY / TILE_HEIGHT - deltaX / TILE_WIDTH));

        // Update if gridDelta changes (incremental movement)
        if (gridDeltaX !== 0 || gridDeltaY !== 0) {
            let newX = activeItem.x + gridDeltaX;
            let newY = activeItem.y + gridDeltaY;

            // Update position
            if (newX !== activeItem.x || newY !== activeItem.y) {
                activeItem.x = newX;
                activeItem.y = newY;
                updateFurniturePosition(activeItem);

                // Reset start point for next increment
                activeItem.startX = clientX;
                activeItem.startY = clientY;
            }
        }
    }

    function handleDragEnd() {
        clearTimeout(longPressTimer);

        if (activeItem) {
            activeItem.isDragging = false;
            activeItem.element.style.cursor = 'pointer';
            gameContainer.style.cursor = 'grab';
            activeItem = null;
            // We stay in edit mode!
        }
    }

    // Global listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    // Initialize Furniture
    createFurniture('table', 22, 22);
    createFurniture('chair', 21, 22);








    // Store Logic
    const storeBtn = document.getElementById('store-btn');
    const storeMenu = document.getElementById('store-menu');
    const storeItems = document.querySelectorAll('.store-item');

    storeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent map click
        storeMenu.classList.toggle('hidden');
    });

    storeItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = item.dataset.type;
            buyItem(type);
        });
    });

    function buyItem(type) {
        // Find first empty spot in restaurant
        let startX = 22;
        let startY = 22;
        let found = false;

        // Search radius from center
        for (let r = 0; r < 10; r++) {
            for (let x = 22 - r; x <= 22 + r; x++) {
                for (let y = 22 - r; y <= 22 + r; y++) {
                    // Check bounds
                    if (x < BUILDING_START || x > BUILDING_END || y < BUILDING_START || y > BUILDING_END) continue;

                    // Check collision
                    let occupied = false;
                    for (const item of furniture) {
                        if (item.x === x && item.y === y) {
                            occupied = true;
                            break;
                        }
                    }

                    if (!occupied) {
                        startX = x;
                        startY = y;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (found) break;
        }

        const newItem = createFurniture(type, startX, startY, true);

        // Enter edit mode immediately
        showEditControls(newItem);

        // Close store
        storeMenu.classList.add('hidden');
    }

};
```
