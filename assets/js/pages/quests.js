import { navigationManager } from "../core/navigationManager.js";
import { fetchData } from "../core/cache.js";
import { QUESTS_URL, TASKS_URL } from "../core/localData.js";
import {
    checkJsonEditor,
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";

document.addEventListener("DOMContentLoaded", () => {
    const questsContainer = document.getElementById("questsContainer");
    const questsCategoryToggles = document.querySelectorAll(
        "#questsContainer .btn"
    );
    const questsContent = document.getElementById("questsContent");
    const jsonQuests = document.querySelectorAll(".json-quests");
    const questFilters = document.getElementById("questFilters");
    const traderQuests = document.getElementById("traderQuests");
    const selectMap = document.getElementById("selectMap");
    const questNameSpan = document.getElementById("questName");
    const questSearch = document.getElementById("questSearch");
    let allQuests = [];
    let currentSearchTerm = "";

    navigationManager.init();

    const questDefaultState = {
        trader: "Prapor",
        map: "All",
        search: "",
        questId: null,
        view: "list",
    };

    let currentQuestState = { ...questDefaultState };
    const setupNavigationHandlers = () => {

        navigationManager.onStateChange((state, previousState) => {
            handleNavigationChange(state, previousState);
        });

        restoreStateFromURL();
    };

    const handleNavigationChange = (state, previousState) => {
        const urlParams = new URLSearchParams(window.location.search);

        const newQuestState = {
            trader: urlParams.get("trader") || questDefaultState.trader,
            map: urlParams.get("map") || questDefaultState.map,
            search: urlParams.get("search") || questDefaultState.search,
            questId: urlParams.get("questId") || questDefaultState.questId,
            view: urlParams.get("view") || questDefaultState.view,
        };

        // Only update if state actually changed
        if (
            JSON.stringify(newQuestState) !== JSON.stringify(currentQuestState)
        ) {
            currentQuestState = { ...newQuestState };
            applyQuestState(currentQuestState);
        }
    };

    const updateQuestURL = (questState) => {
        const url = new URL(window.location);
        const params = url.searchParams;

        ["trader", "map", "search", "questId", "view"].forEach((param) => {
            params.delete(param);
        });

        if (questState.trader !== questDefaultState.trader) {
            params.set("trader", questState.trader);
        }
        if (questState.map !== questDefaultState.map) {
            params.set("map", questState.map);
        }
        if (questState.search !== questDefaultState.search) {
            params.set("search", questState.search);
        }
        if (questState.questId) {
            params.set("questId", questState.questId);
        }
        if (questState.view !== questDefaultState.view) {
            params.set("view", questState.view);
        }

        window.history.pushState(questState, "", url);
    };

    const restoreStateFromURL = () => {
        const urlParams = new URLSearchParams(window.location.search);

        const restoredState = {
            trader: urlParams.get("trader") || questDefaultState.trader,
            map: urlParams.get("map") || questDefaultState.map,
            search: urlParams.get("search") || questDefaultState.search,
            questId: urlParams.get("questId") || questDefaultState.questId,
            view: urlParams.get("view") || questDefaultState.view,
        };

        currentQuestState = { ...restoredState };
        applyQuestState(currentQuestState);
    };
    const applyQuestState = (questState) => {

        setActiveQuestCategory(questState.trader, false);

        selectMap.value = questState.map;

        currentSearchTerm = questState.search;
        questSearch.value = questState.search;

        if (questState.view === "json" && questState.questId) {
            showQuestJSON(questState.questId);
        } else {
            showQuestsList();
            if (allQuests.length > 0) {
                const filteredQuests = filterQuests();
                renderQuests(filteredQuests);
            } else {
                setTimeout(() => fetchQuestsData(), 0);
            }
        }
    };
    const updateQuestState = (newState) => {
        currentQuestState = { ...currentQuestState, ...newState };
        updateQuestURL(currentQuestState);
        applyQuestState(currentQuestState);
    };

    const showQuestsList = () => {
        jsonQuests.forEach((jsonQuest) => {
            jsonQuest.style.display = "none";
        });
        questsContent.style.display = "grid";
        questFilters.style.display = "block";
        traderQuests.style.display = "block";
    };
    const showQuestJSON = (questId) => {
        if (questId) {
            loadQuestTemplate(questId);
            jsonQuests.forEach((jsonQuest) => {
                jsonQuest.style.display = "block";
            });
            traderQuests.style.display = "none";
            questFilters.style.display = "none";
            questsContent.style.display = "none";
        }
    };

    const closeButtons = document.querySelectorAll(".json-quests .close-btn");
    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            updateQuestState({
                view: "list",
                questId: null,
            });
        });
    });

    setupNavigationHandlers();

    const getActiveQuestCategory = () => {
        const activeQuestCategory = document.querySelector(
            "#questsContainer .btn-group .btn.active"
        );
        return activeQuestCategory
            ? activeQuestCategory.textContent.trim()
            : null;
    };

    const updateMapOptions = (availableMaps) => {
        const options = selectMap.options;
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === "All" || option.value === "Any") {
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

        // Chain filters for better performance
        let filteredQuests = allQuests;

        // Filter by trader
        if (activeCategory) {
            filteredQuests = filterQuestsByTrader(
                filteredQuests,
                activeCategory
            );
        }

        // Filter by map
        filteredQuests = filterQuestsByMap(filteredQuests, selectedMap);

        // Filter by search term
        filteredQuests = filterQuestsBySearch(filteredQuests, searchTerm);

        // Sort the filtered quests by name
        filteredQuests = filteredQuests.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        return filteredQuests;
    };
    const renderQuests = (quests) => {
        if (quests.length === 0) {
            questsContent.innerHTML =
                '<div class="no-results">No quests match your search criteria</div>';
            return;
        }

        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const questsHTML = quests
            .map(
                (quest) => `
            <div class="quest-item scroll-ani card" data-quest-id="${
                quest.id
            }" data-quest-map="${
                    quest.map ? quest.map.name : "Any"
                }" data-quest-level="${quest.minPlayerLevel || 0}">
                <div class="card-body">
                    <a href="javascript:void(0);" class="image">
                        <img src="data/quest-images/${quest.id}.webp" alt="${
                    quest.name
                }" onerror="this.onerror=null; this.src='assets/img/missing-quest.jpg';">
                    </a>
                    <div class="details">
                        <a href="javascript:void(0);" class="titleLink"><h4>${highlightSearchTerms(
                            quest.name,
                            searchTerm
                        )}</h4></a>
                        <p class="map">${
                            quest.map && quest.map.name ? quest.map.name : "Any"
                        }</p>
                        ${quest.type ? `<p class="type">${quest.type}</p>` : ""}
                        ${
                            quest.minPlayerLevel
                                ? `<p class="level">Level ${quest.minPlayerLevel}</p>`
                                : ""
                        }
                    </div>
                </div>
                <details class="quest-tasks">
                    <summary class="btn">Show Objectives</summary>
                    <ul class="objectives inner-list">
                        ${quest.objectives
                            .map(
                                (obj) =>
                                    `<li>${highlightSearchTerms(
                                        obj.description,
                                        searchTerm
                                    )}</li>`
                            )
                            .join("")}
                    </ul>
                </details>
                <div class="card-footer">
                    <div class="quest-id">
                        Quest ID: <span class="global-id">${highlightSearchTerms(
                            quest.id,
                            searchTerm
                        )}</span>
                    </div>
                    <div class="quest-buttons">
                        <a href="?questId=${
                            quest.id
                        }&view=json" class="btn sm btn-outline json-link" title="View JSON template"><i class="bi bi-filetype-json"></i> JSON</a>
                        <a href="${
                            quest.wikiLink || "#"
                        }" target="_blank" class="btn sm ${
                    !quest.wikiLink ? "disabled" : ""
                }" title="Open Tarkov Wiki"><i class="bi bi-book"></i> Wiki</a>
                    </div>
                </div>
            </div>
        `
            )
            .join("");

        questsContent.innerHTML = questsHTML;
    };
    const fetchQuestsData = () => {
        questsContent.innerHTML =
            '<div class="loading-container"><span class="loader"></span></div>';

        fetchData(TASKS_URL)
            .then((data) => {
                if (data && data.tasks) {
                    allQuests = Object.values(data.tasks); // Convert tasks object to array
                    processQuestData();
                } else {
                    questsContent.innerHTML = "No quests data found.";
                }
            })
            .catch((error) => {
                console.error("Error fetching quests data:", error);
                questsContent.innerHTML = "Error fetching quests data.";
            });
    };

    const processQuestData = () => {
        const activeCategory = getActiveQuestCategory();
        const availableMaps = new Set();
        allQuests.forEach((quest) => {
            if (
                quest.trader &&
                quest.trader.name === activeCategory &&
                quest.map &&
                quest.map.name
            ) {
                availableMaps.add(quest.map.name);
            }
        });

        updateMapOptions(Array.from(availableMaps));

        const filteredQuests = filterQuests();
        renderQuests(filteredQuests);
    };
    function setActiveQuestCategory(questCategoryName, updateState = true) {
        // Find the button by text content
        const targetButton = Array.from(questsCategoryToggles).find(
            (button) => button.textContent.trim() === questCategoryName
        );

        if (targetButton) {
            questsCategoryToggles.forEach((link) =>
                link.classList.remove("active")
            );
            targetButton.classList.add("active");

            if (updateState) {
                updateQuestState({
                    trader: questCategoryName,
                    map: "All",
                    search: "",
                });
                // Reset filters when changing trader
                selectMap.value = "All";
                currentSearchTerm = "";
                questSearch.value = "";

                fetchQuestsData();
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    questsCategoryToggles.forEach((questCategory) => {
        questCategory.addEventListener(
            "click",
            debounce((event) => {
                event.preventDefault();
                const traderName = questCategory.textContent.trim();
                setActiveQuestCategory(traderName, true);
            }, 100)
        );
    });
    selectMap.addEventListener("change", () => {
        updateQuestState({ map: selectMap.value });
        const filteredQuests = filterQuests();
        renderQuests(filteredQuests);
    });
    questSearch.addEventListener(
        "input",
        debounce(() => {
            const searchValue = questSearch.value;
            currentSearchTerm = searchValue;
            updateQuestState({ search: searchValue });
            const filteredQuests = filterQuests();
            renderQuests(filteredQuests);
        }, 300)
    );
    questsContent.addEventListener("click", (event) => {
        const questItem = event.target.closest(".quest-item");
        if (questItem) {
            const questId = questItem.getAttribute("data-quest-id");

            const isJsonLink =
                event.target.classList.contains("json-link") ||
                event.target.closest(".json-link") ||
                (event.target.tagName === "I" &&
                    event.target.closest(".json-link"));

            if (
                event.target.tagName === "IMG" ||
                event.target.tagName === "H4" ||
                event.target.closest(".titleLink") ||
                isJsonLink
            ) {
                // Check if Ctrl/Cmd key is pressed for opening in new tab
                if (event.ctrlKey || event.metaKey) {
                    // Open in new tab
                    const url = new URL(window.location);
                    url.searchParams.set("questId", questId);
                    url.searchParams.set("view", "json");
                    window.open(url.toString(), "_blank");
                } else {
                    // Normal click - prevent default and update current tab
                    event.preventDefault();
                    updateQuestState({
                        questId: questId,
                        view: "json",
                    });
                }
            }
        }
    });
    function loadQuestTemplate(questId) {
        fetch(QUESTS_URL)
            .then((response) => response.json())
            .then((data) => {
                const questData = data[questId];
                if (questData) {
                    if (typeof editor !== "undefined" && editor) {
                        editor.setValue(JSON.stringify(questData, null, 2));
                        editor.refresh();
                        checkJsonEditorSimple();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                        const jsonTextarea =
                            document.getElementById("jsoneditor");
                        if (jsonTextarea) {
                            jsonTextarea.value = JSON.stringify(
                                questData,
                                null,
                                2
                            );
                        }
                        console.warn(
                            "Editor not available, using textarea fallback"
                        );
                    }
                    questNameSpan.textContent = questData.QuestName;
                } else {
                    console.error("Quest data not found for ID:", questId);
                    questNameSpan.textContent = "Quest not found";
                    if (typeof editor !== "undefined" && editor) {
                        editor.setValue("{}");
                    } else {
                        const jsonTextarea =
                            document.getElementById("jsoneditor");
                        if (jsonTextarea) {
                            jsonTextarea.value = "{}";
                        }
                    }
                }
            })
            .catch((error) => {
                console.error("Error fetching quest data:", error);
                questNameSpan.textContent = "Error loading quest";
                if (typeof editor !== "undefined" && editor) {
                    editor.setValue("{}");
                } else {
                    const jsonTextarea = document.getElementById("jsoneditor");
                    if (jsonTextarea) {
                        jsonTextarea.value = "{}";
                    }
                }
            });
    }

    const highlightSearchTerms = (text, searchTerm) => {
        if (!searchTerm || searchTerm === "") {
            return text;
        }

        const regex = new RegExp(
            `(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
            "gi"
        );
        return text.replace(regex, '<span class="highlight-search">$1</span>');
    };
    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "f") {
            // Ctrl+F or Cmd+F (Mac) - Focus on search field
            event.preventDefault();
            questSearch.focus();
        } else if (event.key === "Escape") {
            if (document.activeElement === questSearch) {
                questSearch.value = "";
                currentSearchTerm = "";
                updateQuestState({ search: "" });
                const filteredQuests = filterQuests();
                renderQuests(filteredQuests);
            } else if (currentQuestState.view === "json") {
                updateQuestState({
                    view: "list",
                    questId: null,
                });
            }
        } else if (
            event.key === "ArrowLeft" &&
            event.altKey &&
            currentQuestState.view === "json"
        ) {
            event.preventDefault();
            updateQuestState({
                view: "list",
                questId: null,
            });
        }
    });
    questSearch.addEventListener("focus", () => {
        questSearch.select();
    });

    window.addEventListener("popstate", (event) => {
        if (event.state) {
            currentQuestState = { ...questDefaultState, ...event.state };
            applyQuestState(currentQuestState);
        } else {
            restoreStateFromURL();
        }
    });
    const filterQuestsByTrader = (quests, traderName) => {
        return quests.filter(
            (quest) => quest.trader && quest.trader.name === traderName
        );
    };

    const filterQuestsByMap = (quests, mapName) => {
        if (mapName === "All") return quests;
        if (mapName === "Any") return quests.filter((quest) => !quest.map);
        return quests.filter(
            (quest) => quest.map && quest.map.name === mapName
        );
    };

    const filterQuestsBySearch = (quests, searchTerm) => {
        if (!searchTerm) return quests;
        const term = searchTerm.toLowerCase();
        return quests.filter(
            (quest) =>
                quest.name.toLowerCase().includes(term) ||
                quest.id.toLowerCase().includes(term) ||
                (quest.objectives &&
                    quest.objectives.some((obj) =>
                        obj.description.toLowerCase().includes(term)
                    ))
        );
    };

    checkJsonEditor();
});
