# 🍽️ Happy Restaurant - Restaurant Management Game

A fun and engaging browser-based restaurant management game inspired by "Nhà Hàng Vui Vẻ" (Happy Restaurant) and Cafeland. Manage your restaurant, serve customers, cook delicious food, and grow your business!

## 🎮 Play the Game

**[🎮 Play Now on GitHub Pages!](https://sampi314.github.io/Java-Game-Development/)**

Click the link above to start playing the game directly in your browser!

## 📖 Game Features

### 🎯 Restaurant City Inspired!
This game is inspired by the classic Facebook game **Restaurant City**! Featuring:
- **Multiple Staff System**: Dedicated server, cleaner, and cook staff
- **Realistic 2.5D Graphics**: Isometric view with depth and shadows
- **Table Decorations**: Beautiful chairs around each dining table
- **Food Storage System**: Dedicated storage tables for each food type (unlimited capacity)
- **Dirty Plate Cleaning**: Tables must be cleaned after customers finish eating

### 🍳 Cooking System & Recipe Progression
- **16 Different Recipes**: From coffee to curry, unlock new dishes as you level up!
- **Level-Based Unlocks**: New recipes unlock every level (Levels 1-8)
  - **Level 1**: Coffee, Burger, Pizza (starter recipes)
  - **Level 2**: Soda, Hot Dog
  - **Level 3**: Taco, Fries
  - **Level 4**: Sushi, Ice Cream
  - **Level 5**: Pasta, Steak
  - **Level 6**: Salad, Ramen
  - **Level 7**: Cake
  - **Level 8**: Curry
- **Multiple Cooking Stations**: Start with one, unlock more as you grow
- **Real-time Cooking**: Watch your food cook with animated progress bars
- **Food Storage Tables**: Store unlimited prepared food on dedicated storage tables
- **Dynamic Menu**: Food buttons update automatically as you unlock new recipes

### 👥 Customer Service
- **Dynamic Customers**: Customers arrive randomly and occupy tables
- **Order System**: Each customer orders a specific food item
- **Patience Mechanic**: Serve customers quickly to keep them happy!
- **Satisfaction Bonus**: Happy customers (served quickly) pay 50% more!

### ⬆️ Upgrade System
- **⚡ Cooking Speed**: Reduce cooking time by 10% per upgrade
- **💺 More Tables**: Expand your restaurant with additional tables
- **💵 Better Service**: Increase earnings by 20% per upgrade

### 🎯 Progression
- **Level System**: Level up every 10 customers served
- **Auto-Save**: Your progress is saved automatically every 30 seconds
- **Money Management**: Start with $100 and build your restaurant empire!

## 🎯 How to Play

### Basic Gameplay
1. **Cook Food**: Click on food buttons (🍔 Burger, 🍕 Pizza, ☕ Coffee) in the cooking stations
2. **Wait for Cooking**: Watch the progress bar fill up
3. **Add to Inventory**: Click "Serve" button when food is ready
4. **Serve Customers**: Click "Serve" button on tables with customers who want the food you have
5. **Earn Money**: Get paid when you serve customers
6. **Upgrade**: Use your earnings to unlock stations and buy upgrades

### Food Items
| Food | Icon | Cook Time | Base Price |
|------|------|-----------|------------|
| Coffee | ☕ | 3 seconds | $10 |
| Burger | 🍔 | 5 seconds | $15 |
| Pizza | 🍕 | 8 seconds | $25 |

### Tips for Success
- 🎯 **Keep food ready**: Pre-cook popular items to serve customers faster
- ⏰ **Watch patience bars**: Serve customers before they leave!
- 💰 **Invest in upgrades**: Cooking speed upgrade helps you earn more
- 📊 **Balance your menu**: Cook a variety of foods to satisfy all customers
- 🔓 **Unlock Station 2**: Double your cooking capacity early!

## 🚀 How to Host on GitHub Pages

### Method 1: Direct Upload
1. Create a new repository on GitHub
2. Upload `index.html`, `style.css`, and `game.js` files
3. Go to repository Settings → Pages
4. Select "main" branch as source
5. Click Save
6. Your game will be available at: `https://[username].github.io/[repository-name]`

### Method 2: Using Git Command Line
```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add index.html style.css game.js README.md

# Commit files
git commit -m "Initial commit: Happy Restaurant game"

# Add remote repository
git remote add origin https://github.com/[username]/[repository-name].git

# Push to GitHub
git push -u origin main

# Enable GitHub Pages in repository settings
```

### Method 3: GitHub Desktop
1. Open GitHub Desktop
2. Create new repository or add existing
3. Add files to repository
4. Commit and push to GitHub
5. Enable GitHub Pages in repository settings

## 🛠️ Technical Details

### Technologies Used
- **HTML5**: Game structure
- **CSS3**: Styling with gradients and animations
- **JavaScript (Vanilla)**: Game logic and interactivity
- **LocalStorage**: Save/Load game progress

### Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Opera
- 📱 Mobile browsers (responsive design)

### File Structure
```
restaurant-game/
├── index.html      # Main HTML file
├── style.css       # All styles and animations
├── game.js         # Game logic and mechanics
└── README.md       # This file
```

## 🎨 Customization

### Adding New Food Items
Edit `game.js` and add to the `foodData` object:
```javascript
const foodData = {
    burger: { name: 'Burger', icon: '🍔', cookTime: 5000, price: 15 },
    // Add your food here:
    sushi: { name: 'Sushi', icon: '🍣', cookTime: 6000, price: 20 }
};
```

### Changing Game Balance
Modify these values in `game.js`:
- Starting money: `money: 100`
- Customer spawn rate: `if (Math.random() < 0.3)` (line ~190)
- Patience decrease rate: `customer.patience -= 2` (line ~225)
- Upgrade costs: In upgrade functions

### Styling
All visual styles are in `style.css`. Customize:
- Colors: Change gradient values
- Animations: Modify keyframes
- Layout: Adjust grid and flexbox settings

## 📝 Game Mechanics

### Economy System
- Start with $100
- Earn money by serving customers
- Happy customers (green patience bar) pay 50% more
- Upgrades improve efficiency and earnings

### Customer AI
- Customers spawn every 5 seconds (30% chance)
- Each customer orders a random food item
- Patience decreases over time
- Customers leave if patience reaches 0
- Tables must be empty to accept new customers

### Progression
- Level up every 10 customers served
- No level cap - play infinitely!
- Save system preserves your progress

## 🐛 Troubleshooting

### Game won't load
- Check browser console for errors (F12)
- Ensure all three files are in the same directory
- Try a different browser

### Progress not saving
- Check if localStorage is enabled in browser
- Some browsers block localStorage in private mode
- Clear browser cache and reload

### Customers not appearing
- Wait 5-10 seconds for first customer
- Ensure you have empty tables
- Check that game hasn't been paused

## 📜 License

This game is free to use, modify, and distribute. No attribution required, but appreciated!

## 🤝 Contributing

Feel free to fork, modify, and improve this game! Some ideas:
- Add more food items
- Create different restaurant themes
- Add sound effects
- Implement employee system
- Add achievements system
- Create difficulty modes

## 🎉 Credits

Inspired by:
- "Nhà Hàng Vui Vẻ" (Happy Restaurant)
- Cafeland
- Various restaurant management games

Created with ❤️ using vanilla JavaScript

---

**Enjoy managing your Happy Restaurant! 🍽️✨**
