import { fetchData } from '../core/cache.js';
import { DATA_URL } from '../core/localData.js';
import { Popover } from '../components/popover.js';
import AssortsCreator from '../features/assortsCreator.js';

document.addEventListener('DOMContentLoaded', () => {
    const assortContainer = document.getElementById('assortContainer');
    const assortContent = document.getElementById('assortContent');
    const assortCreator = document.getElementById('assortCreator');

    // Insert search and filter UI
    const searchContainer = document.createElement('div');
    searchContainer.className = 'component-container search-container';
    searchContainer.innerHTML = `
        <input id="assortSearch" class="form-control" type="text" placeholder="Search barters or cash offers by name or ID...">
        <nav class="btn-group" id="loyaltyFilterBtns">
            <a class="btn sm active" href="javascript:void(0);" data-loyalty="all">All</a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="1"><img src="assets/img/loyalty_one.png" height="18px" alt="LL 1" /></a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="2"><img src="assets/img/loyalty_two.png" height="18px" alt="LL 2" /></a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="3"><img src="assets/img/loyalty_three.png" height="18px" alt="LL 3" /></a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="4"><img src="assets/img/loyalty_king_new.png" alt="LL 4" /></a>
        </nav>
        <nav class="btn-group" id="assortTypeBtns">
            <a class="btn sm active" href="javascript:void(0);" data-type="all">All</a>
            <a class="btn sm" href="javascript:void(0);" data-type="barters">Barters</a>
            <a class="btn sm" href="javascript:void(0);" data-type="cash">Cash</a>
        </nav>
        <a class="btn sm" href="javascript:void(0);" id="createAssortBtn"><i class="bi bi-plus"></i> Create Assort</a>
    `;
    assortContainer.insertBefore(searchContainer, assortContent);
    const assortSearch = document.getElementById('assortSearch');
    const loyaltyFilterBtns = document.getElementById('loyaltyFilterBtns');
    const assortTypeBtns = document.getElementById('assortTypeBtns');
    const createAssortBtn = document.getElementById('createAssortBtn');

    let currentSearchTerm = '';
    let currentLoyaltyFilter = 'all';
    let currentAssortType = 'all';
    let tarkovData = null;
    let currentAssort = null;
    let assortPopover = null;
    let assortsCreator = null;

    // Constants for better performance
    const CURRENCY_TPLS = ['5449016a4bdc2d6f028b456f', '5696686a4bdc2da3298b456a', '569668774bdc2da2298b4568'];
    const CURRENCY_MAP = {
        '5449016a4bdc2d6f028b456f': 'RUB',
        '5696686a4bdc2da3298b456a': 'USD',
        '569668774bdc2da2298b4568': 'EUR'
    };
    const CURRENCY_SYMBOLS = {
        'RUB': '₽',
        'USD': '$',
        'EUR': '€'
    };

    // Utility to format item icons
    const getItemIcon = (iconLink, name) =>
        iconLink ? `<img src="data/icons/${iconLink.split('/').pop()}" alt="${name}" class="item-icon">` : '';
    
    // Utility to format currency
    const formatCurrency = (currency) => CURRENCY_SYMBOLS[currency] || currency;

    const getActiveTraderId = () => {
        const activeTraderAssort = document.querySelector('#assortContainer .trader-nav .btn.active');
        return activeTraderAssort ? activeTraderAssort.getAttribute('data-trader-id') : null;
    };

    // Load tarkov_data.json once
    async function ensureTarkovDataLoaded() {
        if (!tarkovData) {
            tarkovData = await fetchData(DATA_URL);
        }
    }

    // Load the correct assort.json for the active trader
    async function loadTraderAssort(traderId) {
        const path = `data/traders/${traderId}/assort.json`;
        try {
            return await fetchData(path);
        } catch (e) {
            console.warn(`Failed to load assort for trader ${traderId}:`, e);
            return null;
        }
    }

    // Helper function to determine loyalty level
    const getLoyaltyLevel = (itemId, loyaltyMap) => {
        // Check if loyaltyMap has the item directly (new format: {"itemId": level})
        if (loyaltyMap[itemId]) {
            return parseInt(loyaltyMap[itemId], 10);
        }
        
        // Fallback to old format: {"1": ["itemId1", "itemId2"], "2": [...]}
        for (const lvl in loyaltyMap) {
            if (Array.isArray(loyaltyMap[lvl]) && loyaltyMap[lvl].includes(itemId)) {
                return parseInt(lvl, 10);
            }
        }
        
        return 1; // Default to level 1
    };

    // Helper function to process barter required items
    const processBarterRequiredItems = (barterScheme, itemId, tarkovData) => {
        const requiredItems = [];
        const schemeArray = barterScheme[itemId];
        if (!Array.isArray(schemeArray)) return requiredItems;
        
        schemeArray.forEach(schemeArr => {
            if (Array.isArray(schemeArr)) {
                schemeArr.forEach(req => {
                    const itemData = tarkovData.items[req._tpl];
                    requiredItems.push({
                        id: req._tpl,
                        name: itemData?.name || req._tpl,
                        iconLink: itemData?.iconLink || '',
                        count: req.count || 1
                    });
                });
            }
        });
        return requiredItems;
    };

    // Helper function to check if all required items are currency
    const isAllCurrency = (requiredItems) => {
        return Array.isArray(requiredItems) && 
               requiredItems.length > 0 && 
               requiredItems.every(req => CURRENCY_TPLS.includes(req.id));
    };

    // Error handling wrapper
    const handleError = (error, context) => {
        console.error(`Error in ${context}:`, error);
        assortContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message || 'Unknown error'}</div>`;
    };

    // Initialize assort popover
    const initializeAssortPopover = () => {
        // Create popover HTML structure if it doesn't exist
        if (!document.getElementById('assort-popover')) {
            const popoverHTML = `
                <div id="assort-popover" class="assort-popover" popover>
                    <div class="popover-content">
                        <div class="popover-header">
                            <h4 class="popover-title">Assort Item Data</h4>
                            <span class="popover-close"><i class="bi bi-x-lg"></i></span>
                        </div>
                        <div class="popover-body">
                            <div class="popover-loading">Loading...</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', popoverHTML);
        }

        // Initialize popover instance
        assortPopover = new Popover('assort-popover', {
            closeOnBackdrop: true,
            closeOnEscape: true
        });

        // Make popover globally accessible
        window.assortPopover = assortPopover;
    };

    // Show assort popover with JSON data
    const showAssortPopover = async (assortId, itemName) => {
        if (!assortPopover || !assortPopover.isReady()) {
            console.error('Assort popover not initialized');
            return;
        }

        // Show loading state
        assortPopover.showLoading('Loading assort data...');
        
        // Show popover
        assortPopover.show();

        try {
            // Build the JSON structure for this specific assort item
            const assortData = buildAssortItemData(assortId);
            
            if (assortData) {
                // Update popover title
                assortPopover.setTitle(`${itemName} - Assort Data`);

                // Create CodeMirror editor container
                const editorId = `assort-editor-${assortId}`;
                const editorContent = `
                    <div class="assort-template-editor">
                        <div id="${editorId}" class="assort-codemirror"></div>
                    </div>
                `;
                
                assortPopover.setContent(editorContent);

                // Initialize CodeMirror editor (if available)
                if (typeof CodeMirror !== 'undefined') {
                    const editor = CodeMirror(document.getElementById(editorId), {
                        value: JSON.stringify(assortData, null, 2),
                        mode: 'application/json',
                        theme: 'mbo',
                        lineNumbers: true,
                        closeBrackets: true,
                        autoCloseBrackets: true,
                        foldCode: true,
                        readOnly: true,
                        foldGutter: true,
                        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
                    });

                    editor.setSize('100%', '70vh');
                    
                    // Refresh the editor after it's added to DOM
                    setTimeout(() => editor.refresh(), 100);
                } else {
                    // Fallback to plain text display
                    document.getElementById(editorId).innerHTML = `<pre><code>${JSON.stringify(assortData, null, 2)}</code></pre>`;
                }
            } else {
                assortPopover.showError('Assort data not found');
            }
        } catch (error) {
            console.error('Error loading assort data:', error);
            assortPopover.showError('Error loading assort data');
        }
    };

    // Build assort item data structure
    const buildAssortItemData = (assortId) => {
        if (!currentAssort) return null;

        const result = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };

        // Find the main item
        const mainItem = currentAssort.items.find(item => item._id === assortId);
        if (!mainItem) return null;

        // Add the main item
        result.items.push(mainItem);

        // Find any child items (items with this assort as parent)
        const childItems = currentAssort.items.filter(item => item.parentId === assortId);
        result.items.push(...childItems);

        // Add barter scheme if it exists
        if (currentAssort.barter_scheme && currentAssort.barter_scheme[assortId]) {
            result.barter_scheme[assortId] = currentAssort.barter_scheme[assortId];
        }

        // Add loyalty level if it exists
        if (currentAssort.loyal_level_items) {
            // Handle both old format (level -> [items]) and new format (item -> level)
            const loyaltyMap = currentAssort.loyal_level_items;
            
            if (loyaltyMap[assortId]) {
                // New format: direct item to level mapping
                result.loyal_level_items[assortId] = loyaltyMap[assortId];
            } else {
                // Old format: level to items array mapping
                for (const level in loyaltyMap) {
                    if (Array.isArray(loyaltyMap[level]) && loyaltyMap[level].includes(assortId)) {
                        result.loyal_level_items[assortId] = parseInt(level, 10);
                        break;
                    }
                }
            }
        }

        return result;
    };

    // Main render function
    async function renderTraderAssort() {
        try {
            const traderId = getActiveTraderId();
            if (!traderId) {
                assortContent.innerHTML = 'Select a trader.';
                return;
            }
            
            await ensureTarkovDataLoaded();
            currentAssort = await loadTraderAssort(traderId);
            
            if (!currentAssort?.items) {
                assortContent.innerHTML = '<div class="alert alert-secondary">No trader data found</div>';
                return;
            }
        // Map items by _id for quick lookup
        const itemsById = {};
        currentAssort.items.forEach(item => { itemsById[item._id] = item; });
        // Find all root items (parentId === 'hideout')
        let rootItems = currentAssort.items.filter(item => item.parentId === 'hideout');
        // Loyalty level: get from loyal_level_items if present
        const loyaltyMap = currentAssort.loyal_level_items || {};
        
        // Defensive: ensure all values are arrays (only for old format)
        // New format has direct itemId -> level mapping, old format has level -> [itemIds]
        const firstKey = Object.keys(loyaltyMap)[0];
        const isOldFormat = firstKey && Array.isArray(loyaltyMap[firstKey]);
        
        if (isOldFormat) {
            Object.keys(loyaltyMap).forEach(lvl => {
                if (!Array.isArray(loyaltyMap[lvl])) {
                    loyaltyMap[lvl] = loyaltyMap[lvl] ? [loyaltyMap[lvl]] : [];
                }
            });
        }

        // Barters: those with barter_scheme entry
        const barterScheme = currentAssort.barter_scheme || {};
        let barters = rootItems.filter(item => barterScheme[item._id] && barterScheme[item._id].length > 0).map(item => {
            const tpl = item._tpl;
            const itemData = tarkovData.items[tpl] || {};
            const level = getLoyaltyLevel(item._id, loyaltyMap);
            const requiredItems = processBarterRequiredItems(barterScheme, item._id, tarkovData);
            
            return {
                id: item._id,
                tpl,
                name: itemData.name || tpl,
                iconLink: itemData.iconLink || '',
                level,
                buyLimit: item.upd?.BuyRestrictionMax,
                requiredItems,
                taskUnlock: null
            };
        });

        // Cash offers: those with barter_scheme entry of length 1 and _tpl is a currency
        let cashOffers = rootItems.filter(item => {
            const scheme = barterScheme[item._id];
            return scheme && scheme.length === 1 && CURRENCY_TPLS.includes(scheme[0]._tpl);
        }).map(item => {
            const tpl = item._tpl;
            const itemData = tarkovData.items[tpl] || {};
            const scheme = barterScheme[item._id][0];
            const level = getLoyaltyLevel(item._id, loyaltyMap);
            
            return {
                id: item._id,
                tpl,
                name: itemData.name || tpl,
                iconLink: itemData.iconLink || '',
                minTraderLevel: level,
                buyLimit: item.upd?.BuyRestrictionMax,
                price: scheme.count || 1,
                currency: CURRENCY_MAP[scheme._tpl] || '',
                taskUnlock: null
            };
        });
        // Filter and search
        const filterAssorts = (barters, cashOffers, searchTerm, loyalty) => {
            let filteredBarters = barters;
            let filteredCashOffers = cashOffers;
            if (loyalty && loyalty !== 'all') {
                const lvl = parseInt(loyalty, 10);
                filteredBarters = filteredBarters.filter(b => (b.level ?? 1) === lvl);
                filteredCashOffers = filteredCashOffers.filter(o => (o.minTraderLevel ?? 1) === lvl);
            }
            if (!searchTerm) return { barters: filteredBarters, cashOffers: filteredCashOffers };
            const term = searchTerm.toLowerCase();
            const filterFn = (item) => {
                return (
                    item.name.toLowerCase().includes(term) ||
                    item.id.toLowerCase().includes(term)
                );
            };
            return {
                barters: filteredBarters.filter(filterFn),
                cashOffers: filteredCashOffers.filter(filterFn)
            };
        };
        const { barters: filteredBarters, cashOffers: filteredCashOffers } = filterAssorts(barters, cashOffers, currentSearchTerm, currentLoyaltyFilter);
        // Combine and sort by name
        let allItems = [
            ...filteredBarters.map(b => {
                // Determine if this barter is actually a cash offer (all requiredItems are currency)
                const isCash = isAllCurrency(b.requiredItems);
                return { type: isCash ? 'cash' : 'barter', ...b };
            }),
            ...filteredCashOffers.map(c => ({ type: 'cash', ...c }))
        ];
        // Filter by currentAssortType
        if (currentAssortType === 'barters') {
            allItems = allItems.filter(item => item.type === 'barter');
        } else if (currentAssortType === 'cash') {
            allItems = allItems.filter(item => item.type === 'cash');
        }
        allItems.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        if (allItems.length === 0) {
            assortContent.innerHTML = '<div class="alert alert-secondary">No offers available</div>';
            return;
        }
        let html = '<div class="assorts-list grid grid-400">';
        allItems.forEach(item => {
            // Determine if this is a cash offer (all requiredItems are currency) or barter
            const isCash = item.type === 'cash' || (item.type === 'barter' && isAllCurrency(item.requiredItems));
            const cardClass = isCash ? 'cash-item' : 'barter-item';
            
            html += `<div class="card ${cardClass}" data-assort-id="${item.id}" style="cursor: pointer;">`;
            html += `<div class="card-header">${getItemIcon(item.iconLink, item.name)}<div><h3>${item.name}</h3></div></div>`;
            html += '<div class="card-body">';
            
            if (item.type === 'barter' && Array.isArray(item.requiredItems) && item.requiredItems.length > 0 && item.requiredItems[0]?.name) {
                html += '<span class="required-title">Required:</span> ';
                item.requiredItems.forEach(req => {
                    if (req?.name) {
                        html += `<div class="req-item">${getItemIcon(req.iconLink, req.name)}${req.name} <span class="count tag">x${req.count}</span></div>`;
                    }
                });
            }
            
            if (isCash) {
                let price = item.price;
                let currency = item.currency;
                if ((!price || !currency) && Array.isArray(item.requiredItems) && item.requiredItems.length === 1) {
                    price = item.requiredItems[0].count;
                    currency = CURRENCY_MAP[item.requiredItems[0].id];
                }
                if (price && currency) {
                    html += `<div class="price">Price: <span>${price}</span> ${formatCurrency(currency)}</div>`;
                }
            }
            
            html += '</div><div class="card-footer">';
            
            if (item.buyLimit) {
                html += `<div class="buy-limit">Buy Limit: ${item.buyLimit}</div>`;
            }
            if (item.level) {
                html += `<div class="tag" title="Loyalty Level">LL ${item.level}</div>`;
            }
            if (item.minTraderLevel) {
                html += `<div class="tag" data-tooltip="Loyalty Level">LL ${item.minTraderLevel}</div>`;
            }
            html += '</div></div>';
        });
        html += '</div>';
        assortContent.innerHTML = html;

        // Add click handlers for assort items
        const assortCards = document.querySelectorAll('.card[data-assort-id]');
        assortCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const assortId = card.getAttribute('data-assort-id');
                const itemName = card.querySelector('h3').textContent;
                showAssortPopover(assortId, itemName);
            });
        });
    } catch (error) {
        handleError(error, 'renderTraderAssort');
    }
}

    // Debounce function for search input
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Handlers
    assortSearch.addEventListener('input', debounce(() => {
        currentSearchTerm = assortSearch.value.trim();
        renderTraderAssort();
    }, 250));
    loyaltyFilterBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-loyalty')) {
            loyaltyFilterBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLoyaltyFilter = btn.getAttribute('data-loyalty');
            renderTraderAssort();
        }
    });
    assortTypeBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-type')) {
            assortTypeBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAssortType = btn.getAttribute('data-type');
            renderTraderAssort();
        }
    });
    assortContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-trader-id')) {
            document.querySelectorAll('#assortContainer .trader-nav .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTraderAssort();
        }
    });
    createAssortBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Show assort creator
        assortCreator.style.display = 'grid';
        assortContent.classList.add('inactive');
        
        // Initialize and create form
        if (!assortsCreator) {
            assortsCreator = new AssortsCreator();
        }
        
        assortsCreator.createAssortForm(assortCreator);
    });

    // Initial load
    ensureTarkovDataLoaded().then(() => {
        initializeAssortPopover(); // Initialize popover
        renderTraderAssort();
    });
});