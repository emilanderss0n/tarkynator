import { DATA_URL } from '../core/localData.js';

document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('traderUploadForm');
    const uploadStatus = document.getElementById('uploadStatus'); const questsList = document.getElementById('questsList');
    const loaderContainer = document.getElementById('loaderContainer');

    // Check if we have any saved traders and display a dropdown if we do
    loadSavedTraders();

    // Handle form submission
    uploadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        // Show loader
        loaderContainer.style.display = 'block';
        questsList.innerHTML = '';

        // Create FormData object
        const fileInput = document.getElementById('traderFileInput');
        const formData = new FormData();

        // Check if file is selected
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            formData.append('traderFile', file);
        } else {
            showStatusMessage('danger', 'Please select a file to upload.');
            loaderContainer.style.display = 'none';
            return;
        }

        // Send AJAX request
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/tarkynator/includes/process_trader_upload.php', true);        // Handle response
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    // Check response size before parsing
                    const responseSize = xhr.responseText.length;
                    const data = JSON.parse(xhr.responseText);
                    loaderContainer.style.display = 'none'; if (data.success) {
                        // Store complete data with images in memory for current session
                        window.currentTraderData = {
                            uploadId: data.uploadId,
                            trader: data.trader,
                            quests: data.quests,
                            locales: data.locales,
                            allLocales: data.allLocales || {},
                            availableLocales: data.availableLocales || ['en']
                        };                        // Prepare trader data for storage, removing images to reduce size
                        const traderData = {
                            trader: { ...data.trader },
                            quests: {},
                            locales: data.locales,
                            allLocales: data.allLocales || {},
                            availableLocales: data.availableLocales || ['en']
                        };// Deep copy quests and remove images for storage
                        Object.keys(data.quests).forEach(questId => {
                            traderData.quests[questId] = { ...data.quests[questId] };
                            // Remove quest images from the copy only
                            if (questId !== 'trader' && traderData.quests[questId].questImageData) {
                                delete traderData.quests[questId].questImageData;
                            }
                            // Remove trader avatar from quests.trader copy
                            if (questId === 'trader' && traderData.quests[questId].avatarData) {
                                delete traderData.quests[questId].avatarData;
                            }
                        });

                        // Remove images from trader data for storage (from the copy only)
                        if (traderData.trader.avatarData) {
                            delete traderData.trader.avatarData;
                        }                        // Check size before attempting to store
                        const dataString = JSON.stringify(traderData);
                        const dataSizeInMB = dataString.length / (1024 * 1024);

                        // If data is still too large for sessionStorage (>5MB), compress it further
                        if (dataSizeInMB > 5) {

                            // Remove debug data from quests to reduce size
                            const compressedQuests = {};
                            Object.keys(traderData.quests).forEach(questId => {
                                if (questId === 'trader') {
                                    compressedQuests[questId] = traderData.quests[questId];
                                } else {
                                    const quest = { ...traderData.quests[questId] };
                                    // Remove debug fields
                                    delete quest._debug_attempted_keys;
                                    delete quest._possible_desc_matches;
                                    delete quest._debug_quest_image;
                                    delete quest._locale_key_examples;
                                    delete quest._quest_id;
                                    delete quest._quest_filename;
                                    delete quest._locale_key_count;
                                    delete quest._file;
                                    delete quest._trader_id;
                                    delete quest._matched_desc_key;
                                    delete quest._locale_pattern_match;

                                    compressedQuests[questId] = quest;
                                }
                            });

                            traderData.quests = compressedQuests;
                            traderData.locales = {}; // Remove locale data for large traders
                        }                        // Try to store in browser's session storage
                        try {
                            sessionStorage.setItem(`trader_${data.uploadId}`, JSON.stringify(traderData));

                            // Add to list of trader IDs for easy retrieval
                            const traderIds = JSON.parse(sessionStorage.getItem('trader_ids') || '[]');
                            if (!traderIds.includes(data.uploadId)) {
                                traderIds.push(data.uploadId);
                                sessionStorage.setItem('trader_ids', JSON.stringify(traderIds));
                            }
                        } catch (storageError) {
                            // Only show warning if we didn't already try to compress the data
                            if (dataSizeInMB <= 5) {
                                showStatusMessage('warning', 'Trader processed successfully, but too large to save for later. Data will be lost on page reload.');
                            }
                        }                        // Display quests with original data (including images) if available
                        if (window.currentTraderData && window.currentTraderData.uploadId === data.uploadId) {
                            displayQuests(window.currentTraderData.quests, window.currentTraderData.locales).then(() => {
                                // Initialize the trader editor after displaying quests
                                if (window.customTraderEditor) {
                                    window.customTraderEditor.init(window.currentTraderData, window.currentTraderData.locales);
                                }
                            });
                        } else {
                            displayQuests(data.quests, data.locales).then(() => {
                                // Initialize the trader editor after displaying quests
                                if (window.customTraderEditor) {
                                    window.customTraderEditor.init(window.currentTraderData, window.currentTraderData.locales);
                                }
                            });
                        }

                        // Update the trader dropdown after processing (only if storage succeeded)
                        if (sessionStorage.getItem(`trader_${data.uploadId}`)) {
                            loadSavedTraders();
                        }
                    } else {
                        showStatusMessage('danger', data.message || 'Unknown error');
                    }
                } catch (e) {
                    loaderContainer.style.display = 'none';

                    // Try to determine the specific issue
                    let errorMessage = 'Error processing server response.';
                    if (xhr.responseText.length === 0) {
                        errorMessage = 'Server returned empty response.';
                    } else if (xhr.responseText.length > 50 * 1024 * 1024) {
                        errorMessage = 'Server response too large to process (' + Math.round(xhr.responseText.length / (1024 * 1024)) + 'MB).';
                    } else if (e.name === 'SyntaxError') {
                        errorMessage = 'Server returned invalid JSON response.';
                    } else if (e.name === 'QuotaExceededError') {
                        errorMessage = 'Trader data too large for browser storage. Try refreshing and uploading a smaller trader mod.';
                    }

                    showStatusMessage('danger', errorMessage);
                }
            } else {
                loaderContainer.style.display = 'none';
                showStatusMessage('danger', `HTTP error ${xhr.status}: ${xhr.statusText}`);
            }
        };        // Handle network errors
        xhr.onerror = function () {
            loaderContainer.style.display = 'none';
            showStatusMessage('danger', 'Network error occurred');
        };

        // Send the form data
        xhr.send(formData);
    });

    // Function to show status messages
    function showStatusMessage(type, message) {
        uploadStatus.className = `alert alert-${type}`;
        uploadStatus.textContent = message;
        uploadStatus.style.display = 'block';

        // Hide message after 5 seconds if it's a success message
        if (type === 'success') {
            setTimeout(() => {
                uploadStatus.style.display = 'none';
            }, 5000);
        }
    }
    // Function to load saved traders from session storage
    function loadSavedTraders() {
        // Get list of trader IDs from session storage
        const traderIds = JSON.parse(sessionStorage.getItem('trader_ids') || '[]');

        // Find or create trader selection container
        let traderSelect = document.getElementById('traderSelect');
        if (!traderSelect) {
            const traderSelectContainer = document.createElement('div');
            traderSelectContainer.className = 'trader-select-container';
            traderSelectContainer.innerHTML = `
                <h5>Previously Loaded Traders</h5>
                <div class="d-flex">
                    <select class="form-select me-2" id="traderSelect">
                        <option value="">-- Select a trader --</option>
                    </select>
                    <button class="btn btn-primary" id="loadSavedTrader">Load</button>
                </div>
            `;

            // Insert after the upload form
            questsList.parentNode.insertBefore(traderSelectContainer, questsList.nextSibling);
            traderSelect = document.getElementById('traderSelect');

            // Add event listener to the load button
            document.getElementById('loadSavedTrader').addEventListener('click', function () {
                const traderId = traderSelect.value;
                if (traderId) {
                    loadTraderFromSessionStorage(traderId);
                }
            });
        } else {
            // Clear existing options except the default one
            while (traderSelect.options.length > 1) {
                traderSelect.remove(1);
            }
        }

        // Hide if no saved traders
        const container = traderSelect.parentNode.parentNode;
        if (traderIds.length === 0) {
            container.style.display = 'none';
            return;
        } else {
            container.style.display = 'block';
        }        // Map to track unique traders by their content
        const uniqueTraders = new Map();

        // Process all traders to identify duplicates
        traderIds.forEach(traderId => {
            const traderDataString = sessionStorage.getItem(`trader_${traderId}`);
            if (traderDataString) {
                try {
                    const traderData = JSON.parse(traderDataString);
                    if (traderData && traderData.trader) {
                        // Create a unique key based on trader name and content hash
                        const traderName = traderData.trader.name;

                        // Generate a simple hash of trader content for comparison
                        const traderContentHash = `${traderData.trader.id}_${Object.keys(traderData.quests).length}`;
                        const uniqueKey = `${traderName}_${traderContentHash}`;

                        // If we haven't seen this trader before, add it
                        if (!uniqueTraders.has(uniqueKey)) {
                            uniqueTraders.set(uniqueKey, {
                                traderId: traderId,
                                traderName: traderName
                            });
                        }
                    }
                } catch (e) {
                    // Skip invalid trader data
                }
            }
        });

        // Add options for each unique trader, sorted by name
        Array.from(uniqueTraders.values())
            .sort((a, b) => a.traderName.localeCompare(b.traderName))
            .forEach(trader => {
                const option = document.createElement('option');
                option.value = trader.traderId;
                option.textContent = trader.traderName;
                traderSelect.appendChild(option);
            });
    }    // Function to load trader data from session storage
    function loadTraderFromSessionStorage(traderId) {
        const traderDataString = sessionStorage.getItem(`trader_${traderId}`);
        if (!traderDataString) {
            showStatusMessage('danger', 'Trader data not found in session storage');
            return;
        }

        try {
            const traderData = JSON.parse(traderDataString);

            // Validate trader data structure
            if (!traderData || typeof traderData !== 'object') {
                throw new Error('Invalid trader data format');
            }

            // Make sure we have quests data
            if (!traderData.quests || typeof traderData.quests !== 'object') {
                throw new Error('Missing quests data');
            }

            // Make sure we have trader info
            const traderInfo = traderData.trader || traderData.quests.trader;
            if (!traderInfo || !traderInfo.name) {
                if (traderData.trader && traderData.trader.name) {
                    traderData.quests.trader = traderData.trader;
                } else {
                    traderData.quests.trader = { name: "Unknown Trader", id: traderId };
                }
            }            // Try to merge images from current session data if available and matching
            if (window.currentTraderData &&
                window.currentTraderData.trader &&
                window.currentTraderData.trader.id === traderData.trader.id) {

                // Merge trader avatar
                if (window.currentTraderData.trader.avatarData) {
                    traderData.trader.avatarData = window.currentTraderData.trader.avatarData;
                    traderData.quests.trader.avatarData = window.currentTraderData.trader.avatarData;
                }

                // Merge quest images
                Object.keys(traderData.quests).forEach(questId => {
                    if (questId !== 'trader' &&
                        window.currentTraderData.quests[questId] &&
                        window.currentTraderData.quests[questId].questImageData) {
                        traderData.quests[questId].questImageData = window.currentTraderData.quests[questId].questImageData;
                    }
                });

                // Use current session locales if available (they might have been removed for storage)
                if (window.currentTraderData.locales && Object.keys(window.currentTraderData.locales).length > 0) {
                    traderData.locales = window.currentTraderData.locales;
                }
            }            // Display the quests
            displayQuests(traderData.quests, traderData.locales).then(() => {
                // Initialize the trader editor for loaded data
                if (window.customTraderEditor) {
                    window.customTraderEditor.init(traderData, traderData.locales);
                }
            });
        } catch (e) {
            showStatusMessage('danger', `Error loading trader data: ${e.message}`);
        }
    }    // Function to display quests (make it global for editor access)
    window.displayQuests = async function displayQuests(quests, locales) {
        // Load item data first
        window.itemData = await fetchItemData();

        // Get available locales from current trader data
        const availableLocales = window.currentTraderData?.availableLocales || ['en'];
        const currentLocale = window.currentLocale || 'en';

        // Group quests by file
        const questsByFile = {};

        // Get trader info from multiple potential sources
        let trader = {};

        // First try to get from quests.trader (where we should be explicitly placing it)
        if (quests.trader && typeof quests.trader === 'object') {
            trader = quests.trader;
        }
        // If that fails, try to find a trader object among the quests
        else {
            // Look for an object that seems to be a trader (has name but no quest-specific fields)
            for (const [key, value] of Object.entries(quests)) {
                if (value && typeof value === 'object' && value.name &&
                    !value._file && !value.QuestName && !value.conditions) {
                    trader = value;
                    break;
                }
            }
        }

        // Sort quests by QuestName
        const sortedQuests = Object.entries(quests).sort((a, b) => {
            // Skip trader info
            if (a[0] === 'trader' || b[0] === 'trader') return 0;

            const nameA = a[1].QuestName || a[1].name_translated || a[1].name || a[0];
            const nameB = b[1].QuestName || b[1].name_translated || b[1].name || b[0];
            return nameA.localeCompare(nameB);
        }).filter(([key]) => key !== 'trader');

        // Group quests by file
        sortedQuests.forEach(([questId, questData]) => {
            const fileName = questData._file || 'Unknown File';
            if (!questsByFile[fileName]) {
                questsByFile[fileName] = [];
            }
            questsByFile[fileName].push({ id: questId, data: questData });
        }); let html = '';
        if (trader && typeof trader === 'object' && trader.name) {
            html += `<div class="trader-info-box card">
                    <div class="trader-profile">                        <div class="trader-avatar-container">                        ${trader.avatarData ?
                    `<div class="image-loading-container">
                        <div class="loading-container" id="trader-avatar-loader-${trader.nickname || trader.id}">
                            <span class="loader"></span>
                        </div>
                        <img src="${trader.avatarData}" class="trader-avatar" alt="${trader.name}" 
                                onload="document.getElementById('trader-avatar-loader-${trader.nickname || trader.id}').style.display='none'; this.classList.add('loaded');"
                                onerror="document.getElementById('trader-avatar-loader-${trader.nickname || trader.id}').style.display='none'; this.onerror=null; this.src='assets/img/missing-quest.jpg'; this.classList.add('loaded');">
                    </div>` :
                    `<div class="trader-avatar-placeholder">
                            <span>${trader.name.charAt(0).toUpperCase()}</span>
                        </div>`
                }
                        </div>
                        <div class="trader-details">
                            <h2 class="trader-name">${trader.name}</h2>
                            <div class="trader-details-inner">
                                ${trader.display_name ?
                    `<div class="trader-nickname">Full name: ${trader.display_name}</div>` : ''}
                                ${trader.location ?
                    `<div class="trader-location">Location: ${trader.location}</div>` : ''}
                                ${trader.currency ?
                    `<div class="trader-currency">Currency: ${trader.currency}</div>` : ''}
                                ${trader.description ?
                    `<div class="trader-description">${trader.description}</div>` : ''}
                                <div class="trader-meta">
                                    ${trader.id ?
                    `<span class="trader-id">ID: <span class="global-id">${trader.id}</span></span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += '<div class="quest-list">';
        // Create accordion for each file
        Object.entries(questsByFile).forEach(([fileName, fileQuests]) => {
            // Create locale selector if multiple locales are available
            const localeSelector = availableLocales.length > 1 ? `
                <div class="locale-selector ms-auto">
                    <label for="locale-select-${fileName}" class="form-label me-2 mb-0">Language:</label>
                    <select class="form-control" id="locale-select-${fileName}" onchange="changeQuestLocale('${fileName}', this.value)">
                        ${availableLocales.map(locale =>
                `<option value="${locale}" ${locale === currentLocale ? 'selected' : ''}>${locale.toUpperCase()}</option>`
            ).join('')}
                    </select>
                </div>` : '';

            html += `
                <div class="card-header d-flex align-items-center">
                    <h4 class="mb-0">Quests from ${fileName}</h4>
                    ${localeSelector}
                </div>
                <div class="card-body">
                    <div class="list-group">
            `;// Add each quest
            fileQuests.forEach(quest => {
                const questData = quest.data;

                // Get quest name with locale support
                let questName = questData.QuestName || questData.name_translated || questData.name || quest.id;

                // Try to get locale-specific name if we have locale data
                if (locales && currentLocale !== 'en') {
                    // Try different patterns for quest names
                    const namePatterns = [
                        `${quest.id} name`,
                        `${questData._file?.replace('.json', '')}_${questData.QuestNumber} name`,
                        questData.QuestName
                    ];

                    for (const pattern of namePatterns) {
                        if (pattern && locales[pattern]) {
                            questName = locales[pattern];
                            break;
                        }
                    }
                }                // Enhanced description handling
                let questDescription = '';

                // Try to get locale-specific description first
                if (locales && currentLocale !== 'en') {
                    const descPatterns = [
                        `${quest.id} description`,
                        `${questData._file?.replace('.json', '')}_${questData.QuestNumber} description`,
                        questData.description
                    ];

                    for (const pattern of descPatterns) {
                        if (pattern && locales[pattern]) {
                            questDescription = locales[pattern];
                            break;
                        }
                    }
                }

                // Fallback to default locale or existing translations
                if (!questDescription) {
                    if (questData.description_translated) {
                        questDescription = questData.description_translated;
                    } else if (questData.description) {
                        // If original description is a locale key, try to fetch it directly
                        const possibleKey = questData.description;
                        if (locales[possibleKey]) {
                            questDescription = locales[possibleKey];
                        } else {
                            questDescription = questData.description;
                        }
                    } else {
                        if (questData._possible_desc_matches && questData._possible_desc_matches.length > 0) {
                            // Try these potential matches
                            for (const key of questData._possible_desc_matches) {
                                if (key.includes('description') && locales[key]) {
                                    questDescription = locales[key];
                                    break;
                                }
                            }
                        }

                        if (!questDescription) {
                            questDescription = 'Description not available';
                        }
                    }
                } html += `
                    <div class="list-group-item quest-item" data-quest-id="${quest.id}">
                        <div class="quest-header">                        
                        <div class="quest-title-section">${questData.questImageData ?
                        `<div class="quest-image-container">
                            <div class="loading-container" id="quest-image-loader-${questData._id}">
                                <span class="loader"></span>
                            </div>
                            <img src="${questData.questImageData}" alt="${questName}" class="quest-image" 
                                      onload="document.getElementById('quest-image-loader-${questData._id}').style.display='none'; this.classList.add('loaded');"
                                      onerror="document.getElementById('quest-image-loader-${questData._id}').style.display='none'; this.src='assets/img/icon_quest.png'; this.classList.add('loaded');">
                        </div>` :
                        `<img src="assets/img/icon_quest.png" alt="${questName}" class="quest-image loaded">`}                                <div>
                                    <h5 class="quest-name">${questName}</h5>
                                    <div class="quest-description">${questDescription}</div>
                                    <div class="quest-meta text-muted small">
                                        <span class="quest-id">ID: <span class="global-id">${quest.id}</span></span>
                                    </div>
                                </div>
                            </div>
                            <div class="quest-type tag">${questData.type || 'Unknown Type'}</div>                        </div>                `;                // Add quest dependencies section if available
                if (questData.conditions && questData.conditions.AvailableForStart) {
                    const startDependencies = questData.conditions.AvailableForStart.filter(condition =>
                        (condition.conditionType === 'Quest' && condition.target) ||
                        (condition.conditionType === 'Level' && condition.value)
                    );

                    if (startDependencies.length > 0) {
                        html += '<div class="quest-dependencies card"><h5>Quest Dependencies:</h5><div class="dependency-items-list">';

                        startDependencies.forEach(dependency => {
                            if (dependency.conditionType === 'Quest') {
                                // Handle quest dependencies
                                const prerequisiteQuestId = dependency.target;
                                const statusRequirement = dependency.status ? dependency.status[0] : 4; // Default to completed (4)
                                let statusText = '';

                                // Map status codes to readable text
                                switch (statusRequirement) {
                                    case 2:
                                        statusText = 'Available';
                                        break;
                                    case 3:
                                        statusText = 'Started';
                                        break;
                                    case 4:
                                        statusText = 'Complete';
                                        break;
                                    case 5:
                                        statusText = 'Success';
                                        break;
                                    default:
                                        statusText = `Status ${statusRequirement}`;
                                }

                                // Try to find the quest name in the current quests data
                                let questName = prerequisiteQuestId;
                                let questFound = false;

                                // Look through the original quests object to find the name for this ID
                                Object.entries(quests).forEach(([questId, questData]) => {
                                    // Skip the trader object
                                    if (questId === 'trader' || !questData || typeof questData !== 'object') {
                                        return;
                                    }

                                    // Check if this quest matches the prerequisite ID
                                    if (questId === prerequisiteQuestId || questData._id === prerequisiteQuestId) {
                                        questName = questData.QuestName || questData.name_translated || questData.name || questId;
                                        questFound = true;
                                    }
                                });

                                // If quest not found in current data, show a note
                                const notFoundNote = !questFound ? ' <small>(External Quest)</small>' : '';

                                html += `
                                    <div class="dependency-item">
                                        <img src="assets/img/notification_icon_quest.png" class="quest-completed"></img>
                                        <span class="dependency-quest-name">${questName}${notFoundNote}</span>
                                        <span class="dependency-status">(${statusText})</span>
                                        <span class="dependency-id global-id">${prerequisiteQuestId}</span>
                                    </div>
                                `;
                            } else if (dependency.conditionType === 'Level') {
                                // Handle level requirements
                                const levelValue = dependency.value;

                                html += `
                                    <div class="dependency-item dependency-level">
                                        <img src="assets/img/notification_icon_friend.png" class="quest-start-level"></img>
                                        <span class="dependency-quest-name">Player Level ${levelValue}</span>
                                        <span class="dependency-status">(Required)</span>
                                        <span class="dependency-id">Level Requirement</span>
                                    </div>
                                `;
                            }
                        });

                        html += '</div></div>';
                    }
                }

                // Add conditions section if available
                if (questData.conditions && questData.conditions.AvailableForFinish) {
                    html += '<div class="quest-conditions card"><h5>Conditions:</h5><div class="condition-items-list">';

                    questData.conditions.AvailableForFinish.forEach(condition => {
                        // For item-related conditions, always use our enhanced function to show thumbnails
                        let conditionDesc;
                        if (condition.conditionType === 'HandoverItem' ||
                            condition.conditionType === 'FindItem' ||
                            condition.conditionType === 'LeaveItemAtLocation') {
                            conditionDesc = getConditionDescriptionSync(condition, locales);
                        } else {
                            conditionDesc = condition.description || getConditionDescriptionSync(condition, locales);
                        }

                        html += `<div class="condition-item">${conditionDesc}</div>`;
                    });

                    html += '</div></div>';
                }// Add rewards section if available
                if (questData.rewards && questData.rewards.Success) {
                    html += '<div class="quest-rewards card"><h5>Rewards:</h5>';
                    html += '<div class="reward-items-list">';

                    questData.rewards.Success.forEach(reward => {
                        const rewardDesc = getRewardDescription(reward);
                        html += `<div class="reward-item">${rewardDesc}</div>`;
                    });

                    html += '</div></div>';
                } html += '</div>'; // Close quest-item
            });

            html += `
                        </div>
                    </div>
            `;
        }); questsList.innerHTML = html;
    }; // End of displayQuests function    // Global function to change quest locale
    window.changeQuestLocale = function (fileName, newLocale) {
        window.currentLocale = newLocale;

        // Get the current trader data with the new locale
        if (window.currentTraderData && window.currentTraderData.allLocales) {
            const newLocaleData = window.currentTraderData.allLocales[newLocale] || window.currentTraderData.locales;

            // If editor exists, use its changeLocale method to preserve edit mode
            if (window.customTraderEditor) {
                window.customTraderEditor.changeLocale(newLocale);
            } else {
                // Fallback: just refresh the display
                window.displayQuests(window.currentTraderData.quests, newLocaleData);
            }
        }
    };

    // Function to get a human-readable description for condition (synchronous version)
    function getConditionDescriptionSync(condition, locales) {
        // For item-related conditions, always enhance with thumbnails even if we have a description
        if (condition.conditionType === 'HandoverItem' ||
            condition.conditionType === 'FindItem' ||
            condition.conditionType === 'LeaveItemAtLocation') {
            // Skip the early return and go straight to the switch statement
        } else {
            // For non-item conditions, use existing description if available
            if (condition.description) {
                return condition.description;
            }

            // Try to find a translation in locales
            if (condition.id && locales[condition.id]) {
                return locales[condition.id];
            }
        }

        // Fall back to constructing a description with item data
        switch (condition.conditionType) {
            case 'HandoverItem':
                const handoverCount = condition.value || '1';
                const handoverItemId = condition.target ? condition.target[0] : 'unknown';
                const handoverFirText = condition.onlyFoundInRaid ? ' (FIR)' : '';

                // Format count display like rewards do
                const countText = handoverCount > 1 ? `<strong>${handoverCount}</strong>x ` : '';

                if (window.itemData && window.itemData[handoverItemId]) {
                    const item = window.itemData[handoverItemId];
                    const iconLink = item.iconLink ? item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/') : 'assets/img/icon_quest.png';

                    return `
                        <div class="condition-item-display">
                            <img src="${iconLink}" alt="${item.name}"
                                 style="width: 35px; height: 35px; margin-right: 10px;"
                                 onerror="this.onerror=null; this.src='assets/img/icon_quest.png';">
                            <span>Handover ${countText}${item.name}${handoverFirText}</span>
                        </div>
                    `;
                } else {
                    return `Handover ${countText}${handoverItemId}${handoverFirText}`;
                } case 'FindItem':
                const findItemIds = condition.target || ['unknown'];
                const findCount = condition.value || '1';
                const findFirText = condition.onlyFoundInRaid ? ' in raid' : '';

                // Format count display like rewards do
                const findCountText = findCount > 1 ? `<strong>${findCount}</strong>x ` : '';

                if (window.itemData) {
                    let itemsHtml = `<div class="find-items-display">Find${findFirText}: `;

                    findItemIds.forEach((findItemId, index) => {
                        if (window.itemData[findItemId]) {
                            const item = window.itemData[findItemId];
                            const iconLink = item.iconLink ? item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/') : 'assets/img/icon_quest.png';
                            itemsHtml += `
                                <div class="find-item-entry" style="display: inline-flex; align-items: center; margin-right: 10px;">
                                    <img src="${iconLink}" alt="${item.name}"
                                         style="width: 35px; height: 35px; margin-right: 5px;"
                                         onerror="this.onerror=null; this.src='assets/img/icon_quest.png';">
                                    <span>${findCountText}${item.name}</span>
                                </div>
                            `;
                        } else {
                            itemsHtml += `
                                <div class="find-item-entry" style="display: inline-flex; align-items: center; margin-right: 10px;">
                                    <img src="assets/img/icon_quest.png" alt="Unknown Item"
                                         style="width: 35px; height: 35px; margin-right: 5px;">
                                    <span>${findCountText}Item ${findItemId}</span>
                                </div>
                            `;
                        }
                    });

                    itemsHtml += `</div>`;
                    return itemsHtml;
                } else {
                    return `Find ${findCountText}item${findFirText}: ${findItemIds.join(', ')}`;
                } case 'LeaveItemAtLocation':
                const placeItemId = condition.target ? condition.target[0] : 'unknown';
                const placeLocation = condition.zoneId || condition.target || 'unknown location';
                const placeCount = condition.value || '1';

                // Format count display like rewards do
                const placeCountText = placeCount > 1 ? `<strong>${placeCount}</strong>x ` : '';

                if (window.itemData && window.itemData[placeItemId]) {
                    const item = window.itemData[placeItemId];
                    const iconLink = item.iconLink ? item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/') : 'assets/img/icon_quest.png';

                    return `
                        <div class="place-item-display">
                            <img src="${iconLink}" alt="${item.name}"
                                 style="width: 35px; height: 35px; margin-right: 10px;"
                                 onerror="this.onerror=null; this.src='assets/img/icon_quest.png';">
                            <span>Place ${placeCountText}${item.name} at ${placeLocation}</span>
                        </div>
                    `;
                } else {
                    return `Place ${placeCountText}${placeItemId} at location: ${placeLocation}`;
                }

            case 'CounterCreator':
                if (condition.counter && condition.type === 'Elimination') {
                    return `Kill ${condition.value} ${condition.target || ''} enemies`;
                }
                return `Complete ${condition.type} counter (${condition.value})`;

            case 'Quest':
                return `Complete quest: ${condition.target || 'Unknown'}`;

            case 'Level':
                return `Reach level ${condition.value}`;

            case 'Skill':
                return `Reach skill ${condition.target} level ${condition.value}`;

            case 'TraderLoyalty':
                return `Reach Loyalty Level ${condition.value} with trader ${condition.target || 'unknown'}`;

            case 'PlaceBeacon':
                return `Place beacon at ${condition.target || condition.zoneId || 'specified location'}`;

            case 'ExitStatus':
                return `Extract from raid${condition.status ? ` with status: ${condition.status}` : ''}`;

            default:
                return `${condition.conditionType}: ${JSON.stringify(condition).substring(0, 50)}...`;
        }
    }    // Function to fetch item data from DATA_URL
    async function fetchItemData() {
        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Return items based on data structure
            if (data.items) {
                return data.items;
            } else if (data.data && data.data.items) {
                return data.data.items;
            } else if (data.templates) {
                return data.templates;
            } else {
                return data;
            }
        } catch (error) {
            // Try fallback to items.json
            try {
                const response = await fetch('data/items.json');
                if (response.ok) {
                    return await response.json();
                }
            } catch (fallbackError) {
                // Ignore fallback errors
            }
            return {};
        }
    }

    // Function to get a human-readable description for reward
    function getRewardDescription(reward) {
        // Handle localized reward descriptions if available
        if (reward.description) {
            return reward.description;
        }

        switch (reward.type) {
            case 'Experience':
                return `+${reward.value} EXP`; case 'Item':
                if (reward.items && reward.items.length > 0) {
                    // If there are multiple different items, show only the first item with indicator
                    if (reward.items.length > 1 && reward.items.some(item => item._tpl !== reward.items[0]._tpl)) {
                        const uniqueId = `multi-item-reward-${Math.random().toString(36).substring(2, 9)}`;
                        const firText = reward.findInRaid ? ' (FIR)' : '';
                        const additionalItemsCount = reward.items.length - 1;
                        const firstItem = reward.items[0];
                        const itemId = firstItem._tpl || firstItem;

                        // Get stack count if it exists for the first item
                        let stackCount = 1;
                        if (firstItem.upd && firstItem.upd.StackObjectsCount) {
                            stackCount = firstItem.upd.StackObjectsCount;
                        }
                        // Start loading item data and update the placeholder when done
                        fetchItemData().then(items => {
                            if (items && items[itemId]) {
                                const item = items[itemId];
                                const iconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
                                const itemElement = document.getElementById(uniqueId);

                                if (itemElement) {
                                    const countText = stackCount > 1 ? `<strong>${stackCount}</strong>x ` : '';
                                    const moreText = ` <small style="color: #007bff; cursor: pointer; text-decoration: underline;" 
                                        onclick="toggleMultiItemPopover('${uniqueId}')">(+${additionalItemsCount} more item${additionalItemsCount > 1 ? 's' : ''})</small>`;

                                    // Create detailed items list for popover
                                    let allItemsHtml = '';
                                    reward.items.forEach((rewardItem, index) => {
                                        const itemId = rewardItem._tpl || rewardItem;
                                        let stackCount = 1;
                                        if (rewardItem.upd && rewardItem.upd.StackObjectsCount) {
                                            stackCount = rewardItem.upd.StackObjectsCount;
                                        }

                                        if (items[itemId]) {
                                            const itemData = items[itemId];
                                            const itemIconLink = itemData.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
                                            const itemCountText = stackCount > 1 ? `<strong>${stackCount}</strong>x ` : '';

                                            allItemsHtml += `
                                                <div class="popover-item-entry" style="display: flex; align-items: center; margin-bottom: 8px; padding: 4px;">
                                                    <img src="${itemIconLink}" alt="${itemData.name}" style="width: 30px; height: 30px; margin-right: 8px;">
                                                    <span>${itemCountText}${itemData.name}</span>
                                                </div>
                                            `;
                                        } else {
                                            allItemsHtml += `
                                                <div class="popover-item-entry" style="display: flex; align-items: center; margin-bottom: 8px; padding: 4px;">
                                                    <img src="assets/img/icon_quest.png" alt="Unknown Item" style="width: 30px; height: 30px; margin-right: 8px;">
                                                    <span>${stackCount > 1 ? `<strong>${stackCount}</strong>x ` : ''}Item ${itemId}</span>
                                                </div>
                                            `;
                                        }
                                    }); itemElement.innerHTML = `
                                        <div class="reward-item-display">
                                            <img src="${iconLink}" alt="${item.name}" style="width: 35px; height: 35px; margin-right: 10px;">
                                            <span>${countText}${item.name}${moreText}${firText}</span>
                                            <div id="popover-${uniqueId}" class="multi-item-popover">
                                                <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                                                    All Reward Items:
                                                </div>
                                                ${allItemsHtml}
                                            </div>
                                        </div>
                                    `;
                                }
                            }
                        }).catch(error => {
                            // Ignore error, keep placeholder
                        });
                        const moreText = ` <small style="color: #007bff; cursor: pointer; text-decoration: underline;" 
                            onclick="toggleMultiItemPopover('${uniqueId}')">(+${additionalItemsCount} more item${additionalItemsCount > 1 ? 's' : ''})</small>`;
                        return `<span id="${uniqueId}">Item ID: ${itemId}${moreText}${firText}</span>`;
                    }
                    // If it's a single item type (possibly stacked)
                    else {
                        const rewardItem = reward.items[0];
                        const itemId = rewardItem._tpl || rewardItem;

                        // Check if there's a stack count in the item data
                        let stackCount = 1;
                        if (rewardItem.upd && rewardItem.upd.StackObjectsCount) {
                            stackCount = rewardItem.upd.StackObjectsCount;
                        } else if (reward.items.length > 1) {
                            // If multiple identical items
                            stackCount = reward.items.length;
                        }

                        const countText = stackCount > 1 ? `<strong>${stackCount}</strong>x ` : '';
                        const firText = reward.findInRaid ? ' (FIR)' : '';

                        // Create placeholder with unique ID
                        const uniqueId = `item-reward-${Math.random().toString(36).substring(2, 9)}`;

                        // Start loading item data and update the placeholder when done
                        fetchItemData().then(items => {
                            if (items && items[itemId]) {
                                const item = items[itemId];
                                const iconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
                                const itemElement = document.getElementById(uniqueId);

                                if (itemElement) {
                                    itemElement.innerHTML = `
                                        <div class="reward-item-display">
                                            <img src="${iconLink}" alt="${item.name}"
                                                 style="width: 35px; height: 35px; margin-right: 10px;">
                                            <span>${countText}${item.name}${firText}</span>
                                        </div>
                                    `;
                                }
                            }
                        }).catch(error => {
                            // Ignore error, keep placeholder
                        });

                        // Return a placeholder that will be updated
                        return `<span id="${uniqueId}">${countText}Item ID: ${itemId}${firText}</span>`;
                    }
                }
                // Handle roubles or other currencies
                const uniqueId = `currency-reward-${Math.random().toString(36).substring(2, 9)}`;
                const amount = reward.value || 0;
                const firText = reward.findInRaid ? ' (FIR)' : '';

                // Try to fetch the currency item (most likely Roubles)
                fetchItemData().then(items => {
                    // Common currency IDs
                    const currencyIds = {
                        'RUB': '5449016a4bdc2d6f028b456f', // Roubles
                        'USD': '5696686a4bdc2da3298b456a', // Dollars
                        'EUR': '569668774bdc2da2298b4568'  // Euros
                    };

                    // Try to find the currency in items
                    let currencyItem = null;
                    if (items) {
                        // If we have a target currency ID, use that
                        if (reward.target && items[reward.target]) {
                            currencyItem = items[reward.target];
                        }
                        // Otherwise try standard currencies, defaulting to Roubles
                        else {
                            currencyItem = items[currencyIds.RUB];
                        }
                    }

                    if (currencyItem) {
                        const iconLink = currencyItem.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
                        const itemElement = document.getElementById(uniqueId);

                        if (itemElement) {
                            itemElement.innerHTML = `
                                <div class="reward-item-display">
                                    <img src="${iconLink}" alt="${currencyItem.name}"
                                         style="width: 35px; height: 35px; margin-right: 10px;">
                                    <span>${amount.toLocaleString()} ${currencyItem.name}${firText}</span>
                                </div>
                            `;
                        }
                    }
                }).catch(error => {
                    // Ignore error, keep placeholder
                });

                return `<span id="${uniqueId}">+${amount.toLocaleString()} â‚½${firText}</span>`;

            case 'TraderStanding':
                return `+${reward.value} Trader Standing`;

            case 'TraderUnlock':
                return `Unlock trader ${reward.target || ''}`; case 'AssortmentUnlock':
                if (reward.items && reward.items.length > 0) {
                    // Create a unique ID for async updating
                    const uniqueId = `assort-unlock-${Math.random().toString(36).substring(2, 9)}`;

                    // Start with the item IDs as fallback
                    const itemIds = reward.items.map(item => item._tpl || item);

                    // Attempt to load item data and update the display
                    fetchItemData().then(items => {
                        if (items) {
                            const itemDisplays = [];
                            let hasValidItems = false;
                            reward.items.forEach(rewardItem => {
                                const itemId = rewardItem._tpl || rewardItem;
                                if (items[itemId]) {
                                    hasValidItems = true;
                                    const item = items[itemId];
                                    const iconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
                                    itemDisplays.push(`
                                        <div class="assort-item-display">
                                            <img src="${iconLink}" alt="${item.name}">
                                            <span>${item.name}</span>
                                        </div>
                                    `);
                                } else {
                                    itemDisplays.push(`
                                        <div class="assort-item-display">
                                            <img src="assets/img/icon_quest.png" alt="Unknown Item">
                                            <span>Item ${itemId}</span>
                                        </div>
                                    `);
                                }
                            });
                            const element = document.getElementById(uniqueId);
                            if (element) {
                                element.innerHTML = `
                                    <div class="assort-unlock-display">
                                        <div class="assort-unlock-header">
                                            <img src="assets/img/marker_locked.png" alt="Unlock Items" class="assort-unlock-icon">
                                        </div>
                                        ${itemDisplays.join('')}
                                    </div>
                                `;
                            }
                        }
                    }).catch(error => {
                        // Ignore error, keep fallback display
                    });                    // Return placeholder that will be updated if items are found
                    return `<span id="${uniqueId}">
                        <div class="assort-unlock-display">
                            <div class="assort-unlock-header">
                                <img src="assets/img/marker_locked.png" alt="Unlock Items" class="assort-unlock-icon">
                            </div>
                            <div class="assort-item-display">
                                <span>Items: ${itemIds.join(', ')}</span>
                            </div>
                        </div>
                    </span>`;
                }
                return `<div class="assort-unlock-display">
                    <div class="assort-unlock-header">
                        <img src="assets/img/marker_locked.png" alt="Unlock Items" class="assort-unlock-icon">
                    </div>
                </div>`;

            case 'Skill':
                return `+${reward.value} ${reward.target || 'Skill'} XP`;

            case 'UnlockBarterLevel':
                return `Unlock barter level ${reward.value} for ${reward.target || 'items'}`; default:
                return `${reward.type}: ${reward.value || ''}`;
        }
    }    // Function to toggle multi-item popover
    window.toggleMultiItemPopover = function (uniqueId) {
        const popover = document.getElementById(`popover-${uniqueId}`);
        if (popover) {
            if (popover.style.display === 'none' || popover.style.display === '') {
                // Hide any other open popovers first
                document.querySelectorAll('.multi-item-popover').forEach(p => {
                    if (p !== popover) {
                        p.style.display = 'none';
                    }
                });

                // Move popover to body to avoid z-index issues
                const trigger = document.getElementById(uniqueId);
                if (trigger && popover.parentNode !== document.body) {
                    document.body.appendChild(popover);
                    popover.style.position = 'fixed';
                }

                // Position the popover relative to the trigger
                if (trigger) {
                    const rect = trigger.getBoundingClientRect();
                    popover.style.left = rect.left + 'px';
                    popover.style.top = (rect.bottom + 5) + 'px';
                    popover.style.zIndex = '999999';
                }

                popover.style.display = 'block';
            } else {
                popover.style.display = 'none';
            }
        }
    };    // Close popovers when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.reward-item-display') &&
            !event.target.onclick &&
            !event.target.closest('.multi-item-popover')) {
            document.querySelectorAll('.multi-item-popover').forEach(popover => {
                popover.style.display = 'none';
            });
        }
    });

    // Also close popovers when scrolling to prevent positioning issues
    document.addEventListener('scroll', function () {
        document.querySelectorAll('.multi-item-popover[style*="display: block"]').forEach(popover => {
            const uniqueId = popover.id.replace('popover-', '');
            const trigger = document.getElementById(uniqueId);
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                popover.style.left = rect.left + 'px';
                popover.style.top = (rect.bottom + 5) + 'px';
            }
        });
    });
});
