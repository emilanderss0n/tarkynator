import { fetchData } from './cache.js';
import { QUESTS_URL, TASKS_URL } from './localData.js';
import { checkJsonEditor, checkJsonEditorSimple } from './checkJsonEditor.js';

document.addEventListener('DOMContentLoaded', () => {

    const questsContainer = document.getElementById('questsContainer');
    const questsCategoryToggles = document.querySelectorAll('#questsContainer .btn');
    const questsContent = document.getElementById('questsContent');
    const jsonQuests = document.querySelectorAll('.json-quests');
    const questFilters = document.getElementById('questFilters');
    const traderQuests = document.getElementById('traderQuests');
    const selectMap = document.getElementById('selectMap');
    const questNameSpan = document.getElementById('questName');
    const questSearch = document.getElementById('questSearch');
    let allQuests = [];
    let currentSearchTerm = '';

    const closeButtons = document.querySelectorAll('.json-quests .close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            jsonQuests.forEach(jsonQuest => {
                jsonQuest.style.display = "none";
            });
            questsContent.style.display = "grid";
            questFilters.style.display = "block";
            traderQuests.style.display = "block";
        });
    });

    checkJsonEditor();

    const getActiveQuestCategory = () => {
        const activeQuestCategory = document.querySelector('#questsContainer .btn-group .btn.active');
        return activeQuestCategory ? activeQuestCategory.textContent.trim() : null;
    };
    
    const updateMapOptions = (availableMaps) => {
        const options = selectMap.options;
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === 'All' || option.value === 'Any') {
                option.disabled = false;
            } else {
                option.disabled = !availableMaps.includes(option.value);
            }
        }
    };

    const filterQuests = () => {
        const activeCategory = getActiveQuestCategory();
        const selectedMap = selectMap.value;
        const searchTerm = currentSearchTerm.toLowerCase().trim();
        
        let filteredQuests = allQuests.filter(quest => {
            // Filter by trader
            const isCategoryMatch = quest.trader && quest.trader.name === activeCategory;
            
            // Filter by map
            const isMapMatch = selectedMap === 'All' || 
                (quest.map && quest.map.name === selectedMap) || 
                (selectedMap === 'Any' && !quest.map);
                  // Filter by search term
            const isSearchMatch = searchTerm === '' || 
                quest.name.toLowerCase().includes(searchTerm) ||
                quest.id.toLowerCase().includes(searchTerm) ||
                (quest.objectives && quest.objectives.some(obj => 
                    obj.description.toLowerCase().includes(searchTerm)
                ));
                
            return isCategoryMatch && isMapMatch && isSearchMatch;
        });
        
        // Sort the filtered quests by name
        filteredQuests = filteredQuests.sort((a, b) => a.name.localeCompare(b.name));
        
        return filteredQuests;
    };

    const renderQuests = (quests) => {
        if (quests.length === 0) {
            questsContent.innerHTML = '<div class="no-results">No quests match your search criteria</div>';
            return;
        }
          const searchTerm = currentSearchTerm.toLowerCase().trim();
        const questsHTML = quests.map(quest => `
            <div class="quest-item card" data-quest-id="${quest.id}" data-quest-map="${quest.map ? quest.map.name : 'Any'}" data-quest-level="${quest.minPlayerLevel || 0}">
                <div class="card-body">
                    <a href="javascript:void(0);" class="image">
                        <img src="data/quest-images/${quest.id}.webp" alt="${quest.name}" onerror="this.onerror=null; this.src='assets/img/missing-quest.jpg';">
                    </a>
                    <div class="details">
                        <a href="javascript:void(0);" class="titleLink"><h4>${highlightSearchTerms(quest.name, searchTerm)}</h4></a>
                        <p class="map">${quest.map && quest.map.name ? quest.map.name : 'Any'}</p>
                        ${quest.minPlayerLevel ? `<p class="level">Level ${quest.minPlayerLevel}</p>` : ''}
                    </div>
                </div>
                <details class="quest-tasks">
                    <summary class="btn">Show Objectives</summary>
                    <ul class="objectives">
                        ${quest.objectives.map(obj => `<li>${highlightSearchTerms(obj.description, searchTerm)}</li>`).join('')}
                    </ul>
                </details>
                <div class="card-footer">
                    <div class="quest-id">
                        Quest ID: <span class="global-id">${highlightSearchTerms(quest.id, searchTerm)}</span>
                    </div>
                    <div class="quest-buttons">
                        <a href="javascript:void(0);" class="btn sm btn-outline json-link"><i class="bi bi-filetype-json"></i> JSON</a>
                        <a href="${quest.wikiLink || '#'}" target="_blank" class="btn sm ${!quest.wikiLink ? 'disabled' : ''}"><i class="bi bi-book"></i> Wiki</a>
                    </div>
                </div>
            </div>
        `).join('');
        
        questsContent.innerHTML = questsHTML;
    };

    const fetchQuestsData = () => {
        const url = TASKS_URL; // Ensure TASKS_URL is used
        const options = {
            method: 'GET', // Change to GET since TASKS_URL is a local JSON file
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip'
            }
        };        questsContent.innerHTML = '<div class="loading-container"><span class="loader"></span></div>';

        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                if (data && data.tasks) { // Ensure data structure matches expected format
                    allQuests = Object.values(data.tasks); // Convert tasks object to array
                    localStorage.setItem('questsData', JSON.stringify(allQuests));
                    
                    // Calculate available maps for the current trader
                    const activeCategory = getActiveQuestCategory();
                    const availableMaps = new Set();
                    allQuests.forEach(quest => {
                        if (quest.trader && quest.trader.name === activeCategory && quest.map && quest.map.name) {                            availableMaps.add(quest.map.name);
                        }
                    });
                    
                    updateMapOptions(Array.from(availableMaps));
                    
                    // Filter and render quests
                    const filteredQuests = filterQuests();
                    renderQuests(filteredQuests);
                } else {
                    questsContent.innerHTML = 'No quests data found.';
                }
            })
            .catch(error => {
                console.error('Error fetching quests data:', error);
                questsContent.innerHTML = 'Error fetching quests data.';
            });
    };

    function setActiveQuestCategory(questCategory) {
        questsCategoryToggles.forEach(link => link.classList.remove('active'));
        questCategory.classList.add('active');
        selectMap.value = 'All'; // Reset the select box to "All Quests"
        currentSearchTerm = ''; // Clear search term
        questSearch.value = ''; // Clear search input
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    questsCategoryToggles.forEach(questCategory => {
        questCategory.addEventListener('click', debounce((event) => {
            event.preventDefault();
            setActiveQuestCategory(questCategory);
            fetchQuestsData();        }, 100));
    });
    
    selectMap.addEventListener('change', () => {
        const filteredQuests = filterQuests();
        renderQuests(filteredQuests);
    });
    
    // Search functionality
    questSearch.addEventListener('input', debounce(() => {
        currentSearchTerm = questSearch.value;
        const filteredQuests = filterQuests();
        renderQuests(filteredQuests);
    }, 300));

    questsContent.addEventListener('click', (event) => {
        const questItem = event.target.closest('.quest-item');
        if (questItem) {
            const questId = questItem.getAttribute('data-quest-id');
            
            if (event.target.tagName === 'IMG' || 
                event.target.tagName === 'H4' || 
                event.target.closest('.titleLink') || 
                event.target.classList.contains('json-link')) {
                
                loadQuestTemplate(questId);
                jsonQuests.forEach(jsonQuest => {
                    jsonQuest.style.display = "block";
                });
                traderQuests.style.display = "none";
                questFilters.style.display = "none";
                questsContent.style.display = "none";
            }        }
    });
    
    function loadQuestTemplate(questId) {
        fetch(QUESTS_URL)
            .then(response => response.json())
            .then(data => {
                const questData = data[questId];
                if (questData) {
                    editor.setValue(JSON.stringify(questData, null, 2));
                    if (editor) {
                        editor.refresh();
                        checkJsonEditorSimple();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    questNameSpan.textContent = questData.QuestName; // Set the quest name in the span
                } else {
                    console.error('Quest data not found for ID:', questId);
                }
            })
            .catch(error => {
                console.error('Error fetching quest data:', error);
            });
    }

    const highlightSearchTerms = (text, searchTerm) => {
        if (!searchTerm || searchTerm === '') {
            return text;
        }
        
        const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="highlight-search">$1</span>');
    };

    // Add keyboard event handling
    document.addEventListener('keydown', (event) => {        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            // Ctrl+F or Cmd+F (Mac) - Focus on search field
            event.preventDefault();
            questSearch.focus();
        } else if (event.key === 'Escape' && document.activeElement === questSearch) {
            // Escape key - Clear search when focus is in search field
            questSearch.value = '';
            currentSearchTerm = '';
            const filteredQuests = filterQuests();
            renderQuests(filteredQuests);
        }
    });

    // Focus in search input selects all text for easy replacement
    questSearch.addEventListener('focus', () => {
        questSearch.select();
    });

    fetchQuestsData();

});