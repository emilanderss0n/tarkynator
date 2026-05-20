# Tarkynator

A powerful web toolkit for modding and exploring data in Singleplayer Escape from Tarkov.  
Visit the live tool: [https://tarkynator.com](https://tarkynator.com)

## Features

- **Item Browser & Handbook**  
  Browse, search, and inspect all in-game items. View detailed stats, categories, barter options, flea market status, and more.

- **Quest Explorer**  
  Filter and view all quests by trader and map. See objectives, requirements, and quickly access quest JSON or wiki links. Built-in breadcrumb navigation makes exploration easy.

- **Trader Assorts Viewer**  
  Browse trader inventories, loyalty requirements, and barter schemes. View cash offers and item trades with detailed loyalty level filtering.

- **Assort Creator**  
  Create custom trader assorts with visual editor. Generate MongoDB ObjectIDs, set barter requirements, and export JSON configurations for modding.

- **Crafting Database**  
  Explore all hideout crafts, filter by station, and see required items, rewards, and unlock conditions. Instant access to crafting requirements and level restrictions.

- **Achievements Viewer**  
  Browse all achievements with their rarity, hidden status, and custom icons. Features quick ID copying and visual indicators for achievement categories.

- **Common IDs Reference**  
  Quick reference for trader IDs, boss IDs, hideout stations, and handbook categories—useful for modding work.

- **MongoDB ObjectID Generator**  
  Generate single or bulk MongoDB-style ObjectIDs for modding purposes.

- **SPT Releases**  
  View latest SPT version releases and updates from the official SPT Forge API.

## Features Under the Hood

- **Smart Caching System**  
  Efficient IndexedDB and localStorage caching for fast data access and reduced API load

- **Live Data Integration**  
  Real-time data from [tarkov.dev](https://tarkov.dev/) GraphQL API and SPT Forge API

- **Responsive UI**  
  Clean, intuitive interface with Bootstrap styling and custom animations

- **Quick Copy Features**  
  One-click copying of IDs and important data with visual feedback

- **Background Processing**  
  A dedicated Web Worker (`assets/js/workers/dataWorker.js`) handles heavy data processing without blocking the UI (no Service Worker dependency)

- **Advanced Search**  
  Optimized search algorithms with fuzzy matching and category filtering

## External API Usage

**tarkov.dev GraphQL API** (`https://api.tarkov.dev/graphql`)
- **Achievements page** - Fetches achievement data with rarity and descriptions
- **Crafts page** - Retrieves hideout crafting recipes and requirements  
- **Common IDs page** - Gets trader, boss, station, and category reference data

**SPT Forge API** (`https://forge.sp-tarkov.com/api/v0/spt/versions`)
- **Resources page** - Displays latest SPT version releases and updates

## Project Structure

- `assets/js/` — JavaScript modules and features
- `assets/css/` — Stylesheets and UI components
- `assets/img/` — UI assets
- `data/` — SPT JSON data files and images for game items
- `pages/` — Individual tool sections and page components
- `includes/` — PHP utilities and API integrations

## Who is this for?

- SPT-AKI modders and mod developers
- Players wanting to explore game data
- Anyone needing quick access to Tarkov reference data

## Credits

- Data sourced from [tarkov.dev](https://tarkov.dev/) / [SPT](https://github.com/sp-tarkov) 
- UI and tooling by [emilandersson.com](https://emilandersson.com/) / [moxopixel.com](https://moxopixel.com/)

---

⭐ Consider starring this repository if you find it useful.