import { fetchData } from '../core/cache.js';
import { DATA_URL, GLOBALS } from '../core/localData.js';
import { slideToggle } from '../core/utils.js';
import { Popover } from '../components/popover.js';
import AssortsCreator from '../features/assortsCreator.js';

document.addEventListener('DOMContentLoaded', () => {
    const assortContainer = document.getElementById('assortContainer');
    const assortContent = document.getElementById('assortContent');
    const assortTraderHeader = document.getElementById('traderAssorts');
    const assortCreator = document.getElementById('assortCreator');

    const assortSearch = document.getElementById('assortSearch');
    const loyaltyFilterBtns = document.getElementById('loyaltyFilterBtns');
    const assortTypeBtns = document.getElementById('assortTypeBtns');
    const createAssortBtn = document.getElementById('createAssortBtn');
    const searchContainer = document.querySelector('.search-container');

    let currentSearchTerm = '';
    let currentLoyaltyFilter = 'all';
    let currentAssortType = 'all';
    let tarkovData = null;
    let globalsData = null;
    let currentAssort = null;
    let assortPopover = null;
    let assortsCreator = null;
    let isotopeInstance = null;
    let allItems = []; // Add allItems to global scope

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
    const getItemIcon = (iconLink, name, isPreset = false) => {
        if (!iconLink) return '';
        
        // Convert icon filename to grid image filename
        let filename = iconLink.split('/').pop();
        // Replace -icon.webp suffix with -grid-image.webp
        if (filename.endsWith('-icon.webp')) {
            filename = filename.replace('-icon.webp', '-grid-image.webp');
        }
        const iconSrc = `data/grid_images/${filename}`;
        const presetClass = isPreset ? ' preset-icon' : '';
        
        // Popover logic disabled:
        return `<img src="${iconSrc}" alt="${name}" class="item-icon${presetClass}"/>`;
    };
    
    // Utility to format currency
    const formatCurrency = (currency) => CURRENCY_SYMBOLS[currency] || currency;

    const getActiveTraderId = () => {
        const activeTraderAssort = document.querySelector('#assortContainer .trader-nav .btn.active');
        return activeTraderAssort ? activeTraderAssort.getAttribute('data-trader-id') : null;
    };

    // Load tarkov_data.json and globals.json once
    async function ensureTarkovDataLoaded() {
        if (!tarkovData) {
            tarkovData = await fetchData(DATA_URL);
        }
        if (!globalsData) {
            globalsData = await fetchData(GLOBALS);
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

    // Helper function to get preset information if the item is a preset
    const getPresetInfo = (assortId, assortItems) => {
        // Check if this assort has child items (making it a preset)
        const hasChildItems = assortItems.some(child => child.parentId === assortId);
        
        if (!hasChildItems) return null;

        // Get the root item
        const rootItem = assortItems.find(item => item._id === assortId);
        if (!rootItem) return null;

        // Get the base item template from the root item
        const baseItemId = rootItem._tpl;
        if (!baseItemId) return null;

        // Get the base item info from tarkov_data.json
        const baseItemData = tarkovData.items[baseItemId];
        if (!baseItemData) return null;

        // Get all items that are part of this preset (including root)
        const presetItems = assortItems.filter(item => 
            item._id === assortId || item.parentId === assortId
        );

        // Try to find a matching preset in globals.json by comparing structure
        const matchedPresetId = findMatchingPreset(baseItemId, presetItems);
        
        let presetData = null;
        let presetItemData = null;
        
        if (matchedPresetId) {
            // Get preset data from globals.json
            presetData = globalsData?.ItemPresets?.[matchedPresetId];
            // Get preset display info from tarkov_data.json
            presetItemData = tarkovData.items[matchedPresetId];
        }

        return {
            isPreset: true,
            baseItemId: baseItemId,
            baseItemData: baseItemData,
            presetData: presetData || null,
            presetItems: presetItems,
            matchedPresetId: matchedPresetId,
            presetItemData: presetItemData || null
        };
    };

    // Helper function to find matching preset in globals.json
    const findMatchingPreset = (baseItemId, assortPresetItems) => {
        if (!globalsData?.ItemPresets) return null;

        // Create a map of slotId -> _tpl for the assort preset
        const assortSlotMap = {};
        assortPresetItems.forEach(item => {
            if (item.slotId && item._tpl && item.slotId !== 'hideout') {
                assortSlotMap[item.slotId] = item._tpl;
            }
        });

        let bestMatch = null;
        let bestMatchScore = 0;

        // Search through all presets in globals.json
        for (const [presetId, preset] of Object.entries(globalsData.ItemPresets)) {
            if (!preset._items || !Array.isArray(preset._items)) continue;

            // Find the root item of this preset
            const presetRoot = preset._items.find(item => 
                !item.parentId || preset._items.every(other => other._id !== item.parentId)
            );
            
            if (!presetRoot || presetRoot._tpl !== baseItemId) continue;

            // Create a map of slotId -> _tpl for this globals preset
            const globalsSlotMap = {};
            preset._items.forEach(item => {
                if (item.slotId && item._tpl) {
                    globalsSlotMap[item.slotId] = item._tpl;
                }
            });

            // Calculate match score (how many assort slots match globals slots)
            const assortSlots = Object.keys(assortSlotMap);
            let matchedSlots = 0;
            
            for (const slotId of assortSlots) {
                if (globalsSlotMap[slotId] === assortSlotMap[slotId]) {
                    matchedSlots++;
                }
            }

            // Calculate score as percentage of assort slots that match
            const score = assortSlots.length > 0 ? matchedSlots / assortSlots.length : 0;
            
            // We want a high match rate (80%+) and prefer exact matches
            if (score >= 0.8 && score > bestMatchScore) {
                bestMatch = presetId;
                bestMatchScore = score;
                
                // If we have a perfect match, use it immediately
                if (score === 1.0) {
                    return presetId;
                }
            }
        }
        
        return bestMatch;
    };

    // Helper function to format preset name and loyalty level based on context
    const formatItemName = (baseName, isPreset, loyaltyLevel, allowHtml = true) => {
        if (!allowHtml) {
            let result = baseName;
            if (isPreset) result += ' (Preset)';
            if (loyaltyLevel && loyaltyLevel > 1) result += ` (LL ${loyaltyLevel})`;
            return result;
        }
        
        let result = baseName;
        if (isPreset) {
            result += ` <span class='tag preset-label' title='This is a preset'>Preset</span>`;
        }
        if (loyaltyLevel && loyaltyLevel > 1) {
            result += ` <span class='tag' title='Loyalty Level'>LL ${loyaltyLevel}</span>`;
        }
        return result;
    };

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
                        count: Math.round(req.count || 1) // Round to nearest whole number
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
                let title = `${itemName} - Assort Data`;
                assortPopover.setTitle(title);

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
            let itemData = tarkovData.items[tpl] || {};
            let iconLink = itemData.iconLink || '';
            let name = itemData.name || tpl;
            
            // Check if this is a preset
            const presetInfo = getPresetInfo(item._id, currentAssort.items);
            if (presetInfo) {
                // If we found a matching preset, use its display data
                if (presetInfo.presetItemData) {
                    itemData = presetInfo.presetItemData;
                    name = itemData.name;
                    iconLink = itemData.iconLink || iconLink;
                } else {
                    // Fallback to base item data but keep the clean name
                    itemData = presetInfo.baseItemData;
                    name = itemData.name;
                    iconLink = itemData.iconLink || iconLink;
                }
            }

            const level = getLoyaltyLevel(item._id, loyaltyMap);
            const requiredItems = processBarterRequiredItems(barterScheme, item._id, tarkovData);
            
            return {
                id: item._id,
                tpl,
                name,
                iconLink,
                level,
                buyLimit: item.upd?.BuyRestrictionMax,
                requiredItems,
                taskUnlock: null,
                isPreset: !!presetInfo,
                presetInfo: presetInfo
            };
        });

        // Cash offers: those with barter_scheme entry of length 1 and _tpl is a currency
        let cashOffers = rootItems.filter(item => {
            const scheme = barterScheme[item._id];
            return scheme && scheme.length === 1 && CURRENCY_TPLS.includes(scheme[0]._tpl);
        }).map(item => {
            const tpl = item._tpl;
            let itemData = tarkovData.items[tpl] || {};
            let iconLink = itemData.iconLink || '';
            let name = itemData.name || tpl;
            
            // Check if this is a preset
            const presetInfo = getPresetInfo(item._id, currentAssort.items);
            if (presetInfo) {
                // If we found a matching preset, use its display data
                if (presetInfo.presetItemData) {
                    itemData = presetInfo.presetItemData;
                    name = itemData.name;
                    iconLink = itemData.iconLink || iconLink;
                } else {
                    // Fallback to base item data but keep the clean name
                    itemData = presetInfo.baseItemData;
                    name = itemData.name;
                    iconLink = itemData.iconLink || iconLink;
                }
            }

            const scheme = barterScheme[item._id][0];
            const level = getLoyaltyLevel(item._id, loyaltyMap);
            
            return {
                id: item._id,
                tpl,
                name,
                iconLink,
                minTraderLevel: level,
                buyLimit: item.upd?.BuyRestrictionMax,
                price: scheme.count || 1,
                currency: CURRENCY_MAP[scheme._tpl] || '',
                taskUnlock: null,
                isPreset: !!presetInfo,
                presetInfo: presetInfo
            };
        });
        // Combine all items without any filtering - let Isotope handle all filtering
        allItems = [
            ...barters.map(b => {
                // Determine if this barter is actually a cash offer (all requiredItems are currency)
                const isCash = isAllCurrency(b.requiredItems);
                return { type: isCash ? 'cash' : 'barter', ...b };
            }),
            ...cashOffers.map(c => {
                return { type: 'cash', ...c };
            })
        ];
        allItems.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        if (allItems.length === 0) {
            assortContent.innerHTML = '<div class="alert alert-secondary">No offers available</div>';
            return;
        }
        let html = '<div id="grid-container" class="assorts-list"><div class="assort-items">';
        allItems.forEach(item => {
            // Determine if this is a cash offer (all requiredItems are currency) or barter
            const isCash = item.type === 'cash' || (item.type === 'barter' && isAllCurrency(item.requiredItems));
            const cardClass = isCash ? 'cash-item' : 'barter-item';
            
            // Set the correct category for filtering (match the button data-type values)
            const categoryForFilter = isCash ? 'cash' : 'barters';
            
            // Get item dimensions from tarkov data for better masonry layout
            // Use preset dimensions if available, otherwise use base item dimensions
            let dimensionData = tarkovData.items[item.tpl] || {};
            if (item.isPreset && item.presetInfo?.presetItemData) {
                dimensionData = item.presetInfo.presetItemData;
            }
            const itemWidth = dimensionData.width || 1;
            const itemHeight = dimensionData.height || 1;
            const cellSize = 64; // Each cell is approximately 64px
            const cardWidth = itemWidth * cellSize;
            const cardHeight = itemHeight * cellSize;
            const expandedWidth = cardWidth + 300;
            
            // Determine loyalty level for display (use level or minTraderLevel)
            const loyaltyLevel = item.level || item.minTraderLevel;
            
            html += `<div class="card ${cardClass}" data-category="${categoryForFilter}" data-loyalty="${loyaltyLevel}" data-assort-width="${cardWidth}" data-assort-id="${item.id}" data-tpl="${item.tpl}" style="width: ${cardWidth}px; min-height: ${cardHeight}px; --expanded-width: ${expandedWidth}px;">`;
            html += '<div class="card-body">';
            html += `<div class="assort-image clickable" style="cursor: pointer;">${getItemIcon(item.iconLink, item.name, item.isPreset)}`;
            html += '</div></div></div>';
        });
        html += '</div><div id="assortInfo" class="assort-info-empty"><div class="assort-info-placeholder">Select an item to view details.</div></div>';
        html += '</div>';
        assortContent.innerHTML = html;

        // Add click handlers for assort items (only on image and name)
        const assortCards = document.querySelectorAll('.card[data-assort-id]');
        assortCards.forEach(card => {
            // Add click handlers to clickable elements (image and name) for expand/collapse
            const clickableElements = card.querySelectorAll('.clickable');
            clickableElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const assortId = card.getAttribute('data-assort-id');
                    const item = allItems.find(i => i.id === assortId);
                    if (!item) return;
                    // Render info in #assortInfo
                    const assortInfoDiv = document.getElementById('assortInfo');
                    if (assortInfoDiv) {
                        let infoHtml = `<div class="info-header"><h3>${formatItemName(item.name, item.isPreset, item.level || item.minTraderLevel, true)}</h3></div>`;
                        
                        // Use data/images for main item image in assortInfo (convert -icon.webp to -512.webp)
                        let mainImageSrc = '';
                        if (item.iconLink) {
                            let filename = item.iconLink.split('/').pop();
                            if (filename.endsWith('-icon.webp')) {
                                filename = filename.replace('-icon.webp', '-512.webp');
                            }
                            mainImageSrc = `data/images/${filename}`;
                        }
                        infoHtml += `<div class="info-body"><img src="${mainImageSrc}" alt="${item.name}" class="item-icon${item.isPreset ? ' preset-icon' : ''}"/>`;
                        
                        if (item.type === 'barter' && Array.isArray(item.requiredItems) && item.requiredItems.length > 0 && item.requiredItems[0]?.name) {
                            infoHtml += '<div class="required-items"><p class="required-title">Required:</p>';
                            item.requiredItems.forEach(req => {
                                if (req?.name) {
                                    // Use data/icons for barter required items
                                    const barterIconSrc = req.iconLink ? `data/icons/${req.iconLink.split('/').pop()}` : '';
                                    infoHtml += `<div class="req-item"><img src="${barterIconSrc}" alt="${req.name}" class="item-icon"/>${req.name} <span class="count tag">x${req.count}</span></div>`;
                                }
                            });
                            infoHtml += '</div>';
                        }
                        if (item.type === 'cash' || (item.type === 'barter' && isAllCurrency(item.requiredItems))) {
                            let price = item.price;
                            let currency = item.currency;
                            if ((!price || !currency) && Array.isArray(item.requiredItems) && item.requiredItems.length === 1) {
                                price = item.requiredItems[0].count;
                                currency = CURRENCY_MAP[item.requiredItems[0].id];
                            }
                            if (price && currency) {
                                infoHtml += `<div class="price">Price: <span>${price}</span> ${formatCurrency(currency)}</div>`;
                            }
                        }
                        // Add View JSON button
                        infoHtml += `</div><div class="info-footer"><div class="assort-actions"><button class="btn btn-sm view-json-btn" data-assort-id="${item.id}">View JSON</button></div></div>`;
                        assortInfoDiv.innerHTML = infoHtml;
                        // Wire up the button
                        const jsonBtn = assortInfoDiv.querySelector('.view-json-btn');
                        if (jsonBtn) {
                            jsonBtn.addEventListener('click', (ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                showAssortPopover(item.id, item.name);
                            });
                        }
                    }
                });
            });
            
            // Add click handler for "View JSON" button
            const viewJsonBtn = card.querySelector('.view-json-btn');
            if (viewJsonBtn) {
                viewJsonBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const assortId = viewJsonBtn.getAttribute('data-assort-id');
                    const itemName = card.querySelector('h3').textContent;
                    showAssortPopover(assortId, itemName);
                });
            }
        });
        
        // Initialize or reinitialize Isotope layout
        const assortsList = document.querySelector('.assort-items');
        if (assortsList && typeof Isotope !== 'undefined') {
            // Destroy previous instance if it exists
            if (isotopeInstance) {
                isotopeInstance.destroy();
            }
            
            // Initialize new Isotope instance with cell-based sizing
            const cellSize = 64; // Each cell is approximately 64px
            isotopeInstance = new Isotope(assortsList, {
                itemSelector: '.card',
                layoutMode: 'masonry',
                masonry: {
                    columnWidth: cellSize,
                    gutter: 10
                },
                filter: '*', // Show all items initially
                transitionDuration: '0.3s'
            });
            
            // Apply current filters after a small delay to ensure Isotope is ready
            setTimeout(() => {
                applyIsotopeFilters();
                // Refresh layout to account for any dimension changes from presets
                if (isotopeInstance) {
                    isotopeInstance.layout();
                }
            }, 100);
        }
    } catch (error) {
        handleError(error, 'renderTraderAssort');
    }
}

    // Function to apply filters using Isotope
    const applyIsotopeFilters = () => {
        if (!isotopeInstance) return;
        
        // Use a function-based filter for complex filtering logic
        isotopeInstance.arrange({
            filter: function(itemElem) {
                const loyaltyLevel = itemElem.getAttribute('data-loyalty');
                const category = itemElem.getAttribute('data-category');
                const assortId = itemElem.getAttribute('data-assort-id')?.toLowerCase() || '';
                
                // Get item name from allItems array instead of DOM
                const item = allItems.find(i => i.id === itemElem.getAttribute('data-assort-id'));
                const itemName = item ? item.name.toLowerCase() : '';
                
                // Check loyalty filter - convert both to strings for comparison
                if (currentLoyaltyFilter !== 'all' && String(loyaltyLevel) !== String(currentLoyaltyFilter)) {
                    return false;
                }
                
                // Check category filter
                if (currentAssortType !== 'all' && category !== currentAssortType) {
                    return false;
                }
                
                // Check search filter
                if (currentSearchTerm) {
                    const searchTerm = currentSearchTerm.toLowerCase();
                    if (!itemName.includes(searchTerm) && !assortId.includes(searchTerm)) {
                        return false;
                    }
                }
                
                return true;
            }
        });
    };

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
        applyIsotopeFilters();
    }, 250));
    loyaltyFilterBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-loyalty')) {
            loyaltyFilterBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLoyaltyFilter = btn.getAttribute('data-loyalty');
            applyIsotopeFilters();
        }
    });
    assortTypeBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-type')) {
            assortTypeBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAssortType = btn.getAttribute('data-type');
            applyIsotopeFilters();
        }
    });
    assortContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-trader-id')) {
            document.querySelectorAll('#assortContainer .trader-nav .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Reset filters when switching traders
            currentSearchTerm = '';
            currentLoyaltyFilter = 'all';
            currentAssortType = 'all';
            // Reset UI elements
            if (assortSearch) assortSearch.value = '';
            loyaltyFilterBtns.querySelectorAll('.btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-loyalty') === 'all');
            });
            assortTypeBtns.querySelectorAll('.btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-type') === 'all');
            });
            // Clear any inline display styles that might interfere
            document.querySelectorAll('.card[data-assort-id]').forEach(card => {
                card.style.display = '';
            });
            // Reset #assortInfo to placeholder
            const assortInfoDiv = document.getElementById('assortInfo');
            if (assortInfoDiv) {
                assortInfoDiv.className = 'assort-info-empty';
                assortInfoDiv.innerHTML = '<div class="assort-info-placeholder">Select an item to view details.</div>';
            }
            renderTraderAssort();
        }
    });
    createAssortBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Show assort creator
        slideToggle(assortCreator, 300, 1000);
        slideToggle(assortContent, 300, 300);
        slideToggle(assortTraderHeader, 300);
        slideToggle(searchContainer, 300, 600);
        
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