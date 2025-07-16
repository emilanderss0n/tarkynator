import { fetchData } from '../core/cache.js';
import { DATA_URL } from '../core/localData.js';
import { Popover } from '../components/popover.js';

export class AssortsCreator {
    constructor() {
        this.tarkovData = null;
        this.currentAssortData = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        this.currentAssortId = null;
        this.barterItemsCount = 0;
        this.assortItems = []; // Array to store multiple assort items
        this.currentFormIndex = 0; // Track current form being edited
        this.init();
    }

    async init() {
        await this.loadTarkovData();
    }

    async loadTarkovData() {
        if (!this.tarkovData) {
            this.tarkovData = await fetchData(DATA_URL);
        }
    }

    // Generate MongoDB ObjectId (borrowed from mongoGen.js)
    generateObjectId() {
        const timestamp = (new Date().getTime() / 1000 | 0).toString(16);
        const suffix = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16)).toLowerCase();
        const objectId = `${timestamp}${suffix}`;
        
        // Ensure it's exactly 24 characters
        if (objectId.length !== 24) {
            console.warn('Generated ObjectId is not 24 characters:', objectId);
        }
        
        return objectId;
    }

    generateAssortId() {
        return this.generateObjectId();
    }

    searchItems(query) {
        if (!this.tarkovData || !query) return [];
        
        const searchTerm = query.toLowerCase();
        const items = Object.values(this.tarkovData.items).filter(item => 
            item.name && item.name.toLowerCase().includes(searchTerm)
        );
        
        return items.slice(0, 10); // Limit results
    }

    createItemSearchDropdown(inputId, onSelect) {
        const input = document.getElementById(inputId);
        if (!input) return;

        let dropdown = document.getElementById(`${inputId}_dropdown`);
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = `${inputId}_dropdown`;
            dropdown.className = 'item-search-dropdown';
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #ddd;
                border-top: none;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                border-radius: 0 0 4px 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(dropdown);
        }

        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                dropdown.style.display = 'none';
                return;
            }

            const items = this.searchItems(query);
            dropdown.innerHTML = '';
            
            if (items.length === 0) {
                dropdown.innerHTML = '<div class="dropdown-item">No items found</div>';
            } else {
                items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'dropdown-item';
                    itemDiv.style.cssText = `
                        padding: 8px 12px;
                        cursor: pointer;
                        border-bottom: 1px solid #eee;
                        transition: background-color 0.2s;
                    `;
                    itemDiv.innerHTML = `
                        <div style="display: flex; align-items: center;">
                            ${item.iconLink ? `<img src="data/icons/${item.iconLink.split('/').pop()}" alt="${item.name}" style="width: 24px; height: 24px; margin-right: 8px;">` : ''}
                            <span>${item.name}</span>
                        </div>
                    `;
                    
                    itemDiv.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        input.value = item.name;
                        input.dataset.selectedId = item.id;
                        dropdown.style.display = 'none';
                        if (onSelect) onSelect(item);
                    });
                    
                    dropdown.appendChild(itemDiv);
                });
            }
            
            dropdown.style.display = 'block';
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.parentNode.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    createAssortForm(container) {
        const formHTML = `
            <div class="component-container assort-creator-form">
                <h2>Create Custom Assort</h2>
                <p>Create a custom assort file with multiple items. Add as many items as you want.</p>
                
                <!-- Created Assorts Summary -->
                <div id="createdAssortsSummary" class="created-assorts-summary" style="display: none;">
                    <h5>Created Assort Items (<span id="assortsCount">0</span>)</h5>
                    <div id="assortsPreview" class="assorts-preview-list"></div>
                </div>

                <form id="createAssortForm">
                    <div class="grid grid-500 assort-form-main" data-grid-max-col-count="2">
                        <!-- Offer Item -->
                        <div class="form-group">
                            <label for="offerItem">Item to Offer *</label>
                            <input type="text" id="offerItem" class="form-control" placeholder="Search for item..." required>
                        </div>

                        <!-- Assort Type -->
                        <div class="form-group">
                            <label for="assortType">Assort Type *</label>
                            <select id="assortType" class="form-select form-select-sm" required>
                                <option value="">Select type...</option>
                                <option value="cash">Cash Offer</option>
                                <option value="barter">Barter</option>
                            </select>
                        </div>

                        <!-- Cash Offer Fields -->
                        <div id="cashFields" class="form-group" style="display: none;">
                            <div class="grid grid-300">
                                <div class="form-group">
                                    <label for="cashPrice">Price *</label>
                                    <input type="number" id="cashPrice" class="form-control" min="1" placeholder="Enter price">
                                </div>
                                <div class="form-group">
                                    <label for="cashCurrency">Currency *</label>
                                    <select id="cashCurrency" class="form-select form-select-sm">
                                        <option value="5449016a4bdc2d6f028b456f">RUB (₽)</option>
                                        <option value="5696686a4bdc2da3298b456a">USD ($)</option>
                                        <option value="569668774bdc2da2298b4568">EUR (€)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Barter Fields -->
                        <div id="barterFields" class="form-group" style="display: none;">
                            <label>Required Items for Barter *</label>
                            <div id="barterItemsList"></div>
                            <button type="button" id="addBarterItem" class="btn sm">+ Add Required Item</button>
                        </div>

                        <!-- Common Fields -->
                        <div class="form-group">
                            <label for="loyaltyLevel">Loyalty Level *</label>
                            <select id="loyaltyLevel" class="form-select form-select-sm" required>
                                <option value="1">LL 1</option>
                                <option value="2">LL 2</option>
                                <option value="3">LL 3</option>
                                <option value="4">LL 4</option>
                            </select>
                        </div>

                        <div class="grid grid-300">
                            <div class="form-group">
                                <label for="buyLimit">Buy Limit</label>
                                <input type="number" id="buyLimit" class="form-control" min="1" placeholder="Leave empty for unlimited">
                            </div>

                            <div class="form-group">
                                <label for="stackCount">Stack Count</label>
                                <input type="number" id="stackCount" class="form-control" min="1" value="9999999">
                            </div>
                        </div>

                        <div class="form-group">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="unlimitedCount" checked>
                                <label class="form-check-label" for="unlimitedCount">Unlimited Count</label>
                            </div>
                        </div>

                    </div>

                    <!-- Action Buttons -->
                    <div class="form-group action-buttons">
                        <div class="btn-group">
                            <button type="button" id="addAssortItem" class="btn sm">+ Add Item</button>
                            <button type="button" id="previewAssort" class="btn sm" style="display: none;">Preview JSON</button>
                            <button type="button" id="downloadAssort" class="btn sm" style="display: none;">Download JSON</button>
                            <button type="button" id="cancelAssort" class="btn sm">Cancel</button>
                        </div>
                    </div>

                </form>
            </div>
        `;

        container.innerHTML = formHTML;
        this.setupFormHandlers();
    }

    setupFormHandlers() {
        const assortTypeSelect = document.getElementById('assortType');
        const cashFields = document.getElementById('cashFields');
        const barterFields = document.getElementById('barterFields');
        const addBarterItemBtn = document.getElementById('addBarterItem');
        const addAssortItemBtn = document.getElementById('addAssortItem');
        const previewBtn = document.getElementById('previewAssort');
        const downloadBtn = document.getElementById('downloadAssort');
        const cancelBtn = document.getElementById('cancelAssort');

        // Setup item search for offer item
        this.createItemSearchDropdown('offerItem');

        // Handle assort type change
        assortTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'cash') {
                cashFields.style.display = 'block';
                barterFields.style.display = 'none';
            } else if (type === 'barter') {
                cashFields.style.display = 'none';
                barterFields.style.display = 'block';
                if (this.barterItemsCount === 0) {
                    this.addBarterItem();
                }
            } else {
                cashFields.style.display = 'none';
                barterFields.style.display = 'none';
            }
        });

        // Add barter item handler
        addBarterItemBtn.addEventListener('click', () => {
            this.addBarterItem();
        });

        // Add assort item handler
        addAssortItemBtn.addEventListener('click', () => {
            this.addAssortItem();
        });

        // Preview button
        previewBtn.addEventListener('click', () => {
            this.previewAssort();
        });

        // Download button
        downloadBtn.addEventListener('click', () => {
            this.downloadAssortJson();
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.cancelAssortCreation();
        });
    }

    addBarterItem() {
        this.barterItemsCount++;
        const barterItemsList = document.getElementById('barterItemsList');
        
        const barterItemDiv = document.createElement('div');
        barterItemDiv.className = 'barter-item-group';
        barterItemDiv.id = `barterItem_${this.barterItemsCount}`;
        barterItemDiv.innerHTML = `
            <div class="barter-item-fields">
                <div class="form-group">
                    <label for="barterItemName_${this.barterItemsCount}">Required Item</label>
                    <input type="text" id="barterItemName_${this.barterItemsCount}" class="form-control" placeholder="Search for item..." required>
                </div>
                <div class="form-group">
                    <label for="barterItemCount_${this.barterItemsCount}">Count</label>
                    <input type="number" id="barterItemCount_${this.barterItemsCount}" class="form-control" min="1" value="1" required>
                </div>
                <div class="form-group">
                    <button type="button" class="btn sm remove-barter-item" data-id="${this.barterItemsCount}">Remove</button>
                </div>
            </div>
        `;
        
        barterItemsList.appendChild(barterItemDiv);
        
        // Setup search for this barter item
        this.createItemSearchDropdown(`barterItemName_${this.barterItemsCount}`);
        
        // Setup remove button
        const removeBtn = barterItemDiv.querySelector('.remove-barter-item');
        removeBtn.addEventListener('click', () => {
            this.removeBarterItem(this.barterItemsCount);
        });
    }

    removeBarterItem(itemId) {
        const itemDiv = document.getElementById(`barterItem_${itemId}`);
        if (itemDiv) {
            itemDiv.remove();
        }
    }

    addAssortItem() {
        const formData = this.collectFormData();
        if (!formData) return;

        const assortData = this.generateAssortData(formData);
        
        // Add to our items array
        this.assortItems.push({
            formData: formData,
            assortData: assortData,
            id: assortData.items[0]._id
        });

        // Update the current assort data by merging
        this.updateCurrentAssortData(assortData);

        // Update UI
        this.updateAssortsSummary();
        this.updateButtonStates();
        this.resetForm();
    }

    updateCurrentAssortData(newAssortData) {
        // Add items
        this.currentAssortData.items.push(...newAssortData.items);
        
        // Merge barter_scheme
        Object.assign(this.currentAssortData.barter_scheme, newAssortData.barter_scheme);
        
        // Merge loyal_level_items
        Object.assign(this.currentAssortData.loyal_level_items, newAssortData.loyal_level_items);
    }

    updateAssortsSummary() {
        const summaryDiv = document.getElementById('createdAssortsSummary');
        const countSpan = document.getElementById('assortsCount');
        const previewDiv = document.getElementById('assortsPreview');

        if (this.assortItems.length === 0) {
            summaryDiv.style.display = 'none';
            return;
        }

        summaryDiv.style.display = 'block';
        countSpan.textContent = this.assortItems.length;

        // Generate preview HTML
        const previewHTML = this.assortItems.map((item, index) => {
            const { formData } = item;
            const typeLabel = formData.assortType === 'cash' ? 'Cash' : 'Barter';
            const priceInfo = formData.assortType === 'cash' 
                ? `${formData.cashPrice} ${formData.cashCurrency === '5449016a4bdc2d6f028b456f' ? 'RUB' : formData.cashCurrency === '5696686a4bdc2da3298b456a' ? 'USD' : 'EUR'}`
                : `${formData.barterItems.length} item(s)`;

            return `
                <div class="assort-preview-item">
                    <div class="assort-preview-header">
                        <strong>${formData.offerItem.name}</strong>
                        <button class="btn btn-sm btn-danger remove-assort-item" data-index="${index}"><i class="bi bi-trash-fill"></i></button>
                    </div>
                    <div class="assort-preview-details">
                        <span class="type-badge">${typeLabel}</span>
                        <span class="price-info">${priceInfo}</span>
                        <span class="loyalty-info">LL ${formData.loyaltyLevel}</span>
                    </div>
                </div>
            `;
        }).join('');

        previewDiv.innerHTML = previewHTML;

        // Setup remove handlers
        previewDiv.querySelectorAll('.remove-assort-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeAssortItem(index);
            });
        });
    }

    removeAssortItem(index) {
        if (index >= 0 && index < this.assortItems.length) {
            this.assortItems.splice(index, 1);
            this.rebuildCurrentAssortData();
            this.updateAssortsSummary();
            this.updateButtonStates();
        }
    }

    rebuildCurrentAssortData() {
        this.currentAssortData = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };

        this.assortItems.forEach(item => {
            this.updateCurrentAssortData(item.assortData);
        });
    }

    updateButtonStates() {
        const hasItems = this.assortItems.length > 0;
        const previewBtn = document.getElementById('previewAssort');
        const downloadBtn = document.getElementById('downloadAssort');

        previewBtn.style.display = hasItems ? 'inline-block' : 'none';
        downloadBtn.style.display = hasItems ? 'inline-block' : 'none';
    }

    resetForm() {
        // Reset form fields
        document.getElementById('offerItem').value = '';
        document.getElementById('offerItem').dataset.selectedId = '';
        document.getElementById('assortType').value = '';
        document.getElementById('cashPrice').value = '';
        document.getElementById('cashCurrency').value = '5449016a4bdc2d6f028b456f';
        document.getElementById('loyaltyLevel').value = '1';
        document.getElementById('buyLimit').value = '';
        document.getElementById('stackCount').value = '9999999';
        document.getElementById('unlimitedCount').checked = true;

        // Hide fields
        document.getElementById('cashFields').style.display = 'none';
        document.getElementById('barterFields').style.display = 'none';

        // Clear barter items
        document.getElementById('barterItemsList').innerHTML = '';
        this.barterItemsCount = 0;
    }

    collectFormData() {
        const offerItem = document.getElementById('offerItem');
        const assortType = document.getElementById('assortType').value;
        const loyaltyLevel = document.getElementById('loyaltyLevel').value;
        const buyLimit = document.getElementById('buyLimit').value;
        const stackCount = document.getElementById('stackCount').value;
        const unlimitedCount = document.getElementById('unlimitedCount').checked;

        if (!offerItem.dataset.selectedId) {
            alert('Please select a valid item to offer');
            return null;
        }

        const data = {
            offerItem: {
                id: offerItem.dataset.selectedId,
                name: offerItem.value
            },
            assortType,
            loyaltyLevel: parseInt(loyaltyLevel),
            buyLimit: buyLimit ? parseInt(buyLimit) : null,
            stackCount: parseInt(stackCount) || 1,
            unlimitedCount
        };

        if (assortType === 'cash') {
            const cashPrice = document.getElementById('cashPrice').value;
            const cashCurrency = document.getElementById('cashCurrency').value;
            
            if (!cashPrice) {
                alert('Please enter a price for cash offer');
                return null;
            }
            
            data.cashPrice = parseInt(cashPrice);
            data.cashCurrency = cashCurrency;
        } else if (assortType === 'barter') {
            const barterItems = [];
            const barterItemGroups = document.querySelectorAll('.barter-item-group');
            
            for (const group of barterItemGroups) {
                const nameInput = group.querySelector('input[id^="barterItemName_"]');
                const countInput = group.querySelector('input[id^="barterItemCount_"]');
                
                if (!nameInput.dataset.selectedId) {
                    alert('Please select valid items for all barter requirements');
                    return null;
                }
                
                barterItems.push({
                    id: nameInput.dataset.selectedId,
                    name: nameInput.value,
                    count: parseInt(countInput.value) || 1
                });
            }
            
            if (barterItems.length === 0) {
                alert('Please add at least one required item for barter');
                return null;
            }
            
            data.barterItems = barterItems;
        }

        return data;
    }

    generateAssortData(formData) {
        const assortId = this.generateAssortId();
        const assortData = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };

        // Create main item
        const mainItem = {
            "_id": assortId,
            "_tpl": formData.offerItem.id,
            "parentId": "hideout",
            "slotId": "hideout",
            "upd": {
                "UnlimitedCount": formData.unlimitedCount,
                "StackObjectsCount": formData.stackCount,
                "BuyRestrictionMax": formData.buyLimit || 0,
                "BuyRestrictionCurrent": 0
            }
        };

        assortData.items.push(mainItem);

        // Create barter scheme
        if (formData.assortType === 'cash') {
            assortData.barter_scheme[assortId] = [[{
                "count": formData.cashPrice,
                "_tpl": formData.cashCurrency
            }]];
        } else if (formData.assortType === 'barter') {
            assortData.barter_scheme[assortId] = [formData.barterItems.map(item => ({
                "count": item.count,
                "_tpl": item.id
            }))];
        }

        // Set loyalty level
        assortData.loyal_level_items[assortId] = formData.loyaltyLevel;

        return assortData;
    }

    previewAssort() {
        if (this.assortItems.length === 0) {
            alert('Please add at least one assort item before previewing.');
            return;
        }

        // Get the popover from assorts.js
        const assortPopover = window.assortPopover;
        if (!assortPopover || !assortPopover.isReady()) {
            console.error('Assort popover not available');
            alert('Preview popover not available. Please make sure you are on the assorts page.');
            return;
        }

        // Show loading state
        assortPopover.showLoading('Generating preview...');
        
        // Show popover
        assortPopover.show();

        // Set the content with formatted JSON
        assortPopover.setTitle('Custom Assort Preview');
        
        // Create CodeMirror editor container
        const editorId = 'assort-preview-editor';
        const editorContent = `
            <div class="assort-template-editor">
                <div id="${editorId}" class="assort-codemirror"></div>
            </div>
        `;
        
        assortPopover.setContent(editorContent);

        // Initialize CodeMirror editor (if available)
        setTimeout(() => {
            const editorElement = document.getElementById(editorId);
            if (editorElement && typeof CodeMirror !== 'undefined') {
                const editor = CodeMirror(editorElement, {
                    value: JSON.stringify(this.currentAssortData, null, 2),
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
                
                // Set editor size
                editor.setSize('100%', '70vh');
            } else {
                // Fallback if CodeMirror is not available
                editorElement.innerHTML = `<pre style="max-height: 70vh; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px;"><code>${JSON.stringify(this.currentAssortData, null, 2)}</code></pre>`;
            }
        }, 50);
    }

    downloadAssortJson() {
        if (this.assortItems.length === 0) {
            alert('Please add at least one assort item before downloading.');
            return;
        }

        const jsonString = JSON.stringify(this.currentAssortData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom_assort_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        alert('Custom assort JSON file has been downloaded successfully!');
        
        // Optionally close the creator
        this.cancelAssortCreation();
    }

    cancelAssortCreation() {
        // Check if user has any items added and show confirmation
        if (this.assortItems.length > 0) {
            const confirmCancel = confirm('Are you sure you want to cancel? All created assort items will be lost.');
            if (!confirmCancel) {
                return; // User chose not to cancel
            }
        }
        
        // Reset form and hide creator
        const assortCreator = document.getElementById('assortCreator');
        const assortContent = document.getElementById('assortContent');
        
        if (assortCreator) assortCreator.style.display = 'none';
        if (assortContent) assortContent.classList.remove('inactive');
        
        // Reset internal state
        this.barterItemsCount = 0;
        this.currentAssortId = null;
        this.assortItems = [];
        this.currentAssortData = {
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        
        // Reset form
        this.resetForm();
        
        // Hide summary
        const summaryDiv = document.getElementById('createdAssortsSummary');
        if (summaryDiv) summaryDiv.style.display = 'none';
        
        // Reset buttons
        this.updateButtonStates();
    }
}

// Export for use in other files
export default AssortsCreator;
