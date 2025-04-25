import { fetchData } from './cache.js';
import { QUESTS_URL, TASKS_URL } from './localData.js';
import { checkJsonEditor, checkJsonEditorSimple } from './checkJsonEditor.js';

document.addEventListener('DOMContentLoaded', () => {

    const questsContainer = document.getElementById('questsContainer');
    const questsCategoryToggles = document.querySelectorAll('#questsContainer .btn');
    const questsContent = document.getElementById('questsContent');
    const jsonQuests = document.querySelectorAll('.json-quests');
    const questMaps = document.getElementById('questMaps');
    const traderQuests = document.getElementById('traderQuests');
    const selectMap = document.getElementById('selectMap');
    const questNameSpan = document.getElementById('questName');

    const closeButtons = document.querySelectorAll('.json-quests .close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            jsonQuests.forEach(jsonQuest => {
                jsonQuest.style.display = "none";
            });
            questsContent.style.display = "grid";
            questMaps.style.display = "block";
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

    const fetchQuestsData = () => {
        const url = TASKS_URL; // Ensure TASKS_URL is used
        const options = {
            method: 'GET', // Change to GET since TASKS_URL is a local JSON file
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip'
            }
        };

        fetch(url, options)
            .then(response => response.json())
            .then(data => {
                if (data && data.tasks) { // Ensure data structure matches expected format
                    const tasksArray = Object.values(data.tasks); // Convert tasks object to array
                    localStorage.setItem('questsData', JSON.stringify(tasksArray));
                    const activeCategory = getActiveQuestCategory();
                    const selectedMap = selectMap.value;
                    const availableMaps = new Set();
                    const filteredQuests = tasksArray.filter(quest => {
                        const isCategoryMatch = quest.trader && quest.trader.name === activeCategory;
                        const isMapMatch = selectedMap === 'All' || (quest.map && quest.map.name === selectedMap) || (selectedMap === 'Any' && !quest.map);
                        if (isCategoryMatch && quest.map && quest.map.name) {
                            availableMaps.add(quest.map.name);
                        }
                        return isCategoryMatch && isMapMatch;
                    });
                    updateMapOptions(Array.from(availableMaps));
                    const questsHTML = filteredQuests.map(quest => `
                        <div class="quest-item card" data-quest-id="${quest.id}" data-quest-map="${quest.map ? quest.map.name : 'Any'}">
                            <div class="card-body">
                                <a href="javascript:void(0);" class="image">
                                    <img src="data/quest-images/${quest.id}.webp" alt="${quest.name}">
                                </a>
                                <div class="details">
                                    <a href="javascript:void(0);" class="titleLink"><h4>${quest.name}</h4></a>
                                    <p class="map">${quest.map && quest.map.name ? quest.map.name : 'Any'}</p>
                                </div>
                            </div>
                            <ul class="objectives">
                                ${quest.objectives.map(obj => `<li>${obj.description}</li>`).join('')}
                            </ul>
                            <div class="card-footer">
                                <div class="quest-id">
                                    Quest ID: <span class="global-id">${quest.id}</span>
                                </div>
                                <div class="quest-buttons">
                                    <a href="javascript:void(0);" class="btn sm btn-outline json-link"><i class="bi bi-filetype-json"></i> JSON</a>
                                    <a href="${quest.wikiLink}" target="_blank" class="btn sm"><i class="bi bi-book"></i> Wiki</a>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    questsContent.innerHTML = questsHTML;
                } else {
                    questsContent.innerHTML = 'No quests data found.';
                }
            })
            .catch(error => {
                console.error('Error fetching quests data:', error);
                questsContent.innerHTML = 'Error fetching quests data.';
            });
    };

    fetchQuestsData();

    function setActiveQuestCategory(questCategory) {
        questsCategoryToggles.forEach(link => link.classList.remove('active'));
        questCategory.classList.add('active');
        selectMap.value = 'All'; // Reset the select box to "All Quests"
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
            fetchQuestsData();
        }, 100));
    });

    selectMap.addEventListener('change', () => {
        fetchQuestsData();
    });

    questsContent.addEventListener('click', (event) => {
        const questItem = event.target.closest('.quest-item');
        if (questItem) {
            const questId = questItem.getAttribute('data-quest-id');
            if (event.target.tagName === 'IMG' || event.target.tagName === 'H4' || event.target.classList.contains('json-link')) {
                loadQuestTemplate(questId);
                jsonQuests.forEach(jsonQuest => {
                    jsonQuest.style.display = "block";
                });
                traderQuests.style.display = "none";
                questMaps.style.display = "none";
                questsContent.style.display = "none";
            }
        }
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

});