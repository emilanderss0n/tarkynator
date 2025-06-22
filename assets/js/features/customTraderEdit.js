// Custom Trader Quest Editing Functionality
// This module handles the editing of quest data and downloading modified trader packages

class CustomTraderEditor {
    constructor() {
        this.currentTraderData = null;
        this.currentLocale = 'en';
        this.originalLocale = 'en'; // Store original locale for cancel operations
        this.availableLocales = [];
        this.isEditMode = false;
        this.originalData = null;
        this.modifiedData = null;
        this.hasChanges = false;
        this.hasSavedModifications = false; // Track if there are saved modifications
    }
    // Initialize the editor with trader data
    init(traderData, locales) {
        this.currentTraderData = traderData;
        this.originalData = JSON.parse(JSON.stringify(traderData)); // Deep copy
        this.modifiedData = JSON.parse(JSON.stringify(traderData)); // Deep copy for modifications
        this.currentLocale = window.currentLocale || 'en'; // Use global current locale
        this.originalLocale = this.currentLocale; // Store original locale for cancel operations
        this.hasChanges = false; // Reset changes state
        this.hasSavedModifications = false; // Reset saved modifications state for new trader
        this.detectAvailableLocales(locales);
        this.setupEditControls();
    }

    // Detect available locales from the trader data
    detectAvailableLocales(locales) {
        this.availableLocales = ['en']; // Default to English

        // Check if we have trader data that indicates multiple locales
        if (this.currentTraderData && this.currentTraderData.availableLocales) {
            this.availableLocales = this.currentTraderData.availableLocales;
        }

        // If we have allLocales data, use those languages
        if (this.currentTraderData && this.currentTraderData.allLocales) {
            this.availableLocales = Object.keys(this.currentTraderData.allLocales);
        }
    }
    // Setup edit controls in the quest display
    setupEditControls() {
        // Add locale selector if multiple locales are available
        this.addLocaleSelector();

        // Add edit mode toggle
        this.addEditModeToggle();

        // Add download button
        this.addDownloadButton();

        // Ensure locale selectors show the current locale
        this.resetLocaleSelectors();
    }
    // Add locale selector to quest headers
    addLocaleSelector() {
        if (this.availableLocales.length <= 1) return;

        const questsList = document.getElementById('questsList');
        if (!questsList) return;

        const questHeaders = questsList.querySelectorAll('.card-header');
        questHeaders.forEach(header => {
            const existingSelector = header.querySelector('.locale-selector');
            if (existingSelector) return; // Already added

            const localeSelector = document.createElement('div');
            localeSelector.className = 'locale-selector ms-auto';
            localeSelector.innerHTML = `
                <label for="locale-select-${Date.now()}" class="form-label me-2">Language:</label>
                <select class="form-control">
                    ${this.availableLocales.map(locale =>
                `<option value="${locale}" ${locale === this.currentLocale ? 'selected' : ''}>${locale.toUpperCase()}</option>`
            ).join('')}
                </select>
            `;

            const headerContent = header.querySelector('h4');
            if (headerContent) {
                header.style.display = 'flex';
                header.style.alignItems = 'center';
                header.appendChild(localeSelector);

                // Add event listener for locale change
                const select = localeSelector.querySelector('select');
                select.addEventListener('change', (e) => {
                    this.changeLocale(e.target.value);
                });
            }
        });
    }
    // Add edit mode toggle button
    addEditModeToggle() {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;

        // Check if edit controls already exist in the current questsList
        const existingControls = questsList.querySelector('.edit-controls');
        if (existingControls) return; // Already added

        const editControls = document.createElement('div');
        editControls.className = 'edit-controls mb-3';
        editControls.innerHTML = `
            <div class="d-flex gap-2 align-items-center">
                <button id="edit-mode-toggle" class="btn btn-outline-primary"><i class="bi bi-pencil-square"></i> Edit Mode</button>
                <button id="save-changes" class="btn btn-success" style="display: none;"><i class="bi bi-check"></i> Save</button>
                <button id="cancel-changes" class="btn btn-secondary" style="display: none;">Cancel</button>
                <span id="edit-status" class="text-muted ms-2"></span>
            </div>
        `;

        questsList.insertBefore(editControls, questsList.firstChild);

        // Add event listeners
        document.getElementById('edit-mode-toggle').addEventListener('click', () => this.toggleEditMode());
        document.getElementById('save-changes').addEventListener('click', () => this.saveChanges());
        document.getElementById('cancel-changes').addEventListener('click', () => this.cancelChanges());
    }// Add download button
    addDownloadButton() {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;

        // Check if download button already exists in the current edit controls
        const existingDownload = questsList.querySelector('#download-trader');
        if (existingDownload) return; // Already added

        const editControls = questsList.querySelector('.edit-controls');
        if (editControls) {
            const downloadButton = document.createElement('button');
            downloadButton.id = 'download-trader';
            downloadButton.className = 'btn btn-info ms-auto';
            downloadButton.innerHTML = '<i class="fas fa-download me-1"></i>Download Modified Trader';
            downloadButton.style.display = 'none'; // Initially hidden
            downloadButton.addEventListener('click', () => this.downloadTrader());

            const controlsContainer = editControls.querySelector('.d-flex');
            controlsContainer.appendChild(downloadButton);
        }
    }    // Toggle edit mode
    toggleEditMode() {
        if (this.isEditMode) {
            // If already in edit mode, do nothing (users should use Save or Cancel)
            return;
        }

        this.isEditMode = true;
        const toggleBtn = document.getElementById('edit-mode-toggle');
        const saveBtn = document.getElementById('save-changes');
        const cancelBtn = document.getElementById('cancel-changes');
        const statusSpan = document.getElementById('edit-status');

        // Hide the edit mode button and show save/cancel buttons
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'inline-block';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        if (statusSpan) {
            statusSpan.textContent = 'Edit mode enabled';
            statusSpan.className = 'text-warning ms-2';
        }

        this.enableQuestEditing();
    }
    // Enable quest editing functionality
    enableQuestEditing() {
        const questItems = document.querySelectorAll('.quest-item');
        questItems.forEach(questItem => {
            this.makeQuestEditable(questItem);
        });
    }

    // Disable quest editing functionality
    disableQuestEditing() {
        const questItems = document.querySelectorAll('.quest-item');
        questItems.forEach(questItem => {
            this.makeQuestReadOnly(questItem);
        });
    }
    // Exit edit mode and return to view mode
    exitEditMode() {
        this.isEditMode = false;
        const toggleBtn = document.getElementById('edit-mode-toggle');
        const saveBtn = document.getElementById('save-changes');
        const cancelBtn = document.getElementById('cancel-changes');
        const statusSpan = document.getElementById('edit-status');

        // Show the edit mode button and hide save/cancel buttons
        if (toggleBtn) toggleBtn.style.display = 'inline-block';
        if (saveBtn) saveBtn.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';

        if (statusSpan) {
            statusSpan.textContent = '';
            statusSpan.className = 'text-muted ms-2';
        }

        // Reset locale selectors to current locale
        this.resetLocaleSelectors();

        this.disableQuestEditing();
    }

    // Reset all locale selectors to match current locale
    resetLocaleSelectors() {
        const questsList = document.getElementById('questsList');
        if (!questsList) return;

        const localeSelects = questsList.querySelectorAll('.locale-selector select');
        localeSelects.forEach(select => {
            select.value = this.currentLocale;
        });
    }

    // Make a quest item editable
    makeQuestEditable(questItem) {
        const questName = questItem.querySelector('.quest-name');
        const questDescription = questItem.querySelector('.quest-description');

        if (questName && !questName.querySelector('input')) {
            this.makeElementEditable(questName, 'quest-name');
        }

        if (questDescription && !questDescription.querySelector('textarea')) {
            this.makeElementEditable(questDescription, 'quest-description');
        }

        // Add edit indicator
        if (!questItem.querySelector('.edit-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'edit-indicator badge bg-warning ms-2';
            indicator.textContent = 'Editable';
            questName?.appendChild(indicator);
        }
    }

    // Make a quest item read-only
    makeQuestReadOnly(questItem) {
        const inputs = questItem.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            const parent = input.parentElement;
            const textContent = input.value;
            parent.innerHTML = textContent;
        });

        // Remove edit indicator
        const indicator = questItem.querySelector('.edit-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Make an element editable by replacing it with an input/textarea
    makeElementEditable(element, type) {
        const currentText = element.textContent.trim();
        const questId = this.getQuestIdFromElement(element);

        let inputElement;
        if (type === 'quest-description') {
            inputElement = document.createElement('textarea');
            inputElement.className = 'form-control';
            inputElement.rows = 3;
        } else {
            inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.className = 'form-control';
        }

        inputElement.value = currentText;
        inputElement.dataset.questId = questId;
        inputElement.dataset.fieldType = type;

        // Add event listener for changes
        inputElement.addEventListener('input', (e) => {
            this.updateQuestData(questId, type, e.target.value);
        }); element.innerHTML = '';
        element.appendChild(inputElement);
    }

    // Get quest ID from DOM element
    getQuestIdFromElement(element) {
        const questItem = element.closest('.quest-item');
        if (questItem) {
            // Try to get quest ID from data attribute first
            const questId = questItem.dataset.questId;
            if (questId) {
                return questId;
            }

            // Fallback: try to find quest ID from global-id elements
            const globalId = questItem.querySelector('.global-id');
            if (globalId) {
                return globalId.textContent.trim();
            }
        }
        return null;
    }

    // Update quest data when editing
    updateQuestData(questId, fieldType, newValue) {
        if (!questId || !this.modifiedData) return;

        // Find and update the quest in modified data
        Object.keys(this.modifiedData.quests).forEach(id => {
            if (id === questId) {
                if (fieldType === 'quest-name') {
                    this.modifiedData.quests[id].QuestName = newValue;
                    // Also update the translated name if it exists
                    if (this.modifiedData.quests[id].name_translated) {
                        this.modifiedData.quests[id].name_translated = newValue;
                    }
                } else if (fieldType === 'quest-description') {
                    // Update the description and translated description
                    if (this.modifiedData.quests[id].description_translated) {
                        this.modifiedData.quests[id].description_translated = newValue;
                    } else {
                        this.modifiedData.quests[id].description = newValue;
                    }
                }
            }
        });

        // Update locale data if available
        if (this.modifiedData.locales) {
            this.updateLocaleData(questId, fieldType, newValue);
        }

        // Mark as modified
        this.markAsModified();
    }

    // Update locale data when quest is modified
    updateLocaleData(questId, fieldType, newValue) {
        const locales = this.modifiedData.locales;
        if (!locales) return;

        // Find the corresponding locale key
        Object.keys(locales).forEach(key => {
            if (fieldType === 'quest-name' && key.includes(questId) && key.includes('name')) {
                locales[key] = newValue;
            } else if (fieldType === 'quest-description' && key.includes(questId) && key.includes('description')) {
                locales[key] = newValue;
            }
        });
    }
    // Mark the trader as modified
    markAsModified() {
        this.hasChanges = true;

        const statusSpan = document.getElementById('edit-status');
        if (statusSpan) {
            statusSpan.textContent = 'Modified (unsaved changes)';
            statusSpan.className = 'text-danger ms-2';
        }

        // Don't show download button while in edit mode
        // It will be shown after saving and exiting edit mode
    }
    saveChanges() {
        // Update the current trader data with modifications
        this.currentTraderData = JSON.parse(JSON.stringify(this.modifiedData));

        // Update session storage with the new data
        if (window.currentTraderData) {
            window.currentTraderData = this.currentTraderData;
        }

        // Reset the original data to current state
        this.originalData = JSON.parse(JSON.stringify(this.modifiedData));
        this.originalLocale = this.currentLocale; // Update original locale to current locale
        this.hasChanges = false;
        this.hasSavedModifications = true; // Mark that we have saved modifications

        const statusSpan = document.getElementById('edit-status');
        if (statusSpan) {
            statusSpan.textContent = 'Changes saved';
            statusSpan.className = 'text-success ms-2';
        }

        // Exit edit mode first
        this.exitEditMode();

        // Show download button after exiting edit mode (when user can see it)
        setTimeout(() => {
            const downloadBtn = document.getElementById('download-trader');
            if (downloadBtn && this.hasSavedModifications && !this.isEditMode) {
                downloadBtn.style.display = 'inline-block';
            }
        }, 100);

        // Show success message briefly
        setTimeout(() => {
            const statusSpan = document.getElementById('edit-status');
            if (statusSpan && !this.isEditMode) {
                statusSpan.textContent = '';
                statusSpan.className = 'text-muted ms-2';
            }
        }, 3000);
    }
    cancelChanges() {
        // Restore the original data
        this.modifiedData = JSON.parse(JSON.stringify(this.originalData));
        this.hasChanges = false;
        // Note: Don't reset hasSavedModifications - canceling doesn't affect previously saved changes

        // Revert to original locale
        this.currentLocale = this.originalLocale;
        window.currentLocale = this.originalLocale;

        // Get the original locale data
        let originalLocaleData = this.originalData.locales;
        if (window.currentTraderData && window.currentTraderData.allLocales && window.currentTraderData.allLocales[this.originalLocale]) {
            originalLocaleData = window.currentTraderData.allLocales[this.originalLocale];
        }

        // Refresh the display with original data and original locale
        if (window.displayQuests && typeof window.displayQuests === 'function') {
            window.displayQuests(this.originalData.quests, originalLocaleData).then(() => {
                // Re-setup edit controls after display is complete
                this.setupEditControls();

                // Update status message after DOM is recreated
                const statusSpan = document.getElementById('edit-status');
                if (statusSpan) {
                    statusSpan.textContent = 'Changes cancelled';
                    statusSpan.className = 'text-info ms-2';
                }

                // Exit edit mode (no need to restore edit mode since we're cancelling)
                this.exitEditMode();

                // Show download button if there are saved modifications and we're not in edit mode
                setTimeout(() => {
                    const downloadBtn = document.getElementById('download-trader');
                    if (downloadBtn && this.hasSavedModifications && !this.isEditMode) {
                        downloadBtn.style.display = 'inline-block';
                    }
                }, 100);

                // Clear status message after 3 seconds
                setTimeout(() => {
                    const statusSpan = document.getElementById('edit-status');
                    if (statusSpan && !this.isEditMode) {
                        statusSpan.textContent = '';
                        statusSpan.className = 'text-muted ms-2';
                    }
                }, 3000);
            });
        }
    }
    // Change locale and refresh display
    changeLocale(newLocale) {
        this.currentLocale = newLocale;

        // Update global locale
        window.currentLocale = newLocale;

        // Get the current trader data with the new locale
        if (window.currentTraderData && window.currentTraderData.allLocales) {
            const newLocaleData = window.currentTraderData.allLocales[newLocale] || window.currentTraderData.locales;

            // Store edit mode state before refreshing display
            const wasInEditMode = this.isEditMode;

            // Wait for displayQuests to complete before reinitializing editor
            window.displayQuests(window.currentTraderData.quests, newLocaleData).then(() => {
                this.setupEditControls();

                // Restore edit mode if it was active
                if (wasInEditMode) {
                    // Set edit mode state
                    this.isEditMode = true;
                    const toggleBtn = document.getElementById('edit-mode-toggle');
                    const saveBtn = document.getElementById('save-changes');
                    const cancelBtn = document.getElementById('cancel-changes');
                    const statusSpan = document.getElementById('edit-status');

                    // Hide edit button, show save/cancel buttons
                    if (toggleBtn) toggleBtn.style.display = 'none';
                    if (saveBtn) saveBtn.style.display = 'inline-block';
                    if (cancelBtn) cancelBtn.style.display = 'inline-block';
                    if (statusSpan) {
                        statusSpan.textContent = this.hasChanges ? 'Modified (unsaved changes)' : 'Edit mode enabled';
                        statusSpan.className = this.hasChanges ? 'text-danger ms-2' : 'text-warning ms-2';
                    }

                    // Don't show download button while in edit mode
                    // It will be shown after saving and exiting edit mode

                    this.enableQuestEditing();
                }
            });
        }
    }

    // Download the modified trader as a ZIP file
    async downloadTrader() {
        try {
            // Create the trader package structure
            const traderPackage = this.createTraderPackage();

            // Create ZIP file
            const zip = new JSZip();

            // Add base.json
            if (traderPackage.base) {
                zip.file('db/base.json', JSON.stringify(traderPackage.base, null, 2));
            }

            // Add quest files
            if (traderPackage.quests) {
                Object.keys(traderPackage.quests).forEach(filename => {
                    zip.file(`db/quests/${filename}`, JSON.stringify(traderPackage.quests[filename], null, 2));
                });
            }

            // Add locale files
            if (traderPackage.locales) {
                Object.keys(traderPackage.locales).forEach(language => {
                    Object.keys(traderPackage.locales[language]).forEach(filename => {
                        zip.file(`db/locales/${language}/${filename}`, JSON.stringify(traderPackage.locales[language][filename], null, 2));
                    });
                });
            }

            // Add package.json if available
            if (traderPackage.packageJson) {
                zip.file('package.json', JSON.stringify(traderPackage.packageJson, null, 2));
            }

            // Generate and download the ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const traderName = this.currentTraderData.trader?.name || 'CustomTrader';
            const filename = `${traderName.replace(/[^a-z0-9]/gi, '_')}_modified.zip`;

            this.downloadBlob(zipBlob, filename);

        } catch (error) {
            console.error('Error creating trader package:', error);
            alert('Error creating trader package. Please try again.');
        }
    }
    // Create the trader package structure for download
    createTraderPackage() {
        const trader = this.currentTraderData.trader;
        const quests = this.currentTraderData.quests;
        const locales = this.currentTraderData.locales;

        const traderPackage = {
            base: {
                _id: trader?.id || 'unknown',
                name: trader?.name || 'Unknown Trader',
                nickname: trader?.nickname || trader?.name,
                location: trader?.location || '',
                description: trader?.description || '',
                avatar: trader?.avatar || '',
                currency: trader?.currency || 'RUB'
            },
            quests: {},
            locales: { en: {} }
        };

        // Group quests by their original file
        const questsByFile = {};
        Object.keys(quests).forEach(questId => {
            if (questId === 'trader') return;

            const quest = quests[questId];
            const filename = quest._file || 'quests.json';

            if (!questsByFile[filename]) {
                questsByFile[filename] = {};
            }

            // Clean up the quest data (remove internal fields)
            const cleanQuest = { ...quest };
            delete cleanQuest._file;
            delete cleanQuest._trader_id;
            delete cleanQuest.name_translated;
            delete cleanQuest.description_translated;
            questsByFile[filename][questId] = cleanQuest;
        });

        traderPackage.quests = questsByFile;

        // Add locale data
        if (locales) {
            traderPackage.locales.en = { 'locale.json': locales };
        }

        // Create package.json
        traderPackage.packageJson = {
            name: (trader?.name || 'custom-trader').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            version: '1.0.0',
            description: trader?.description || 'A custom trader mod',
            main: 'src/mod.js',
            scripts: {
                build: 'echo "Build script not implemented"'
            },
            author: 'Unknown',
            license: 'MIT'
        };

        return traderPackage;
    }

    // Helper function to download a blob as a file
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Create global instance
window.customTraderEditor = new CustomTraderEditor();

// Make the class available globally
window.CustomTraderEditor = CustomTraderEditor;
