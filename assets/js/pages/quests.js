import { navigationManager } from "../core/navigationManager.js";
import { fetchData } from "../core/cache.js";
import { QUESTS_URL, TASKS_URL } from "../core/localData.js";
import {
    checkJsonEditor,
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";
import { debounce, highlightSearchTerms } from "../core/utils.js";
import { withViewTransition } from "../core/viewTransitionManager.js";
import { enhanceContainerImages } from "../core/imageManager.js";
import { setPageLoading } from "../core/pageLoading.js";

document.addEventListener("DOMContentLoaded", () => {
    const questsContainer = document.getElementById("questsContainer");
    const questsCategoryToggles = document.querySelectorAll(
        "#traderQuests .trader-nav .btn[data-trader-id]:not([data-trader-id='all-quests'])"
    );
    const allQuestsTraderBtn = document.querySelector(
        "#traderQuests .trader-nav .btn[data-trader-id='all-quests']"
    );
    const questsContent = document.getElementById("questsContent");
    const jsonQuests = document.querySelectorAll(".json-quests");
    const questFilters = document.getElementById("questFilters");
    const traderQuests = document.getElementById("traderQuests");
    const selectMap = document.getElementById("selectMap");
    const questNameSpan = document.getElementById("questName");
    const questSearch = document.getElementById("questSearch");
    const questGlobalSearch = document.getElementById("questGlobalSearch");
    let allQuests = [];
    let localQuestsData = null;
    let currentSearchTerm = "";
    let currentGlobalSearchTerm = "";
    let listScrollPositionBeforeJsonOpen = null;
    let shouldRestoreListScrollOnNextRender = false;
    let latestFetchToken = 0;
    const questsTransitionOptions = {
        skipIfBusy: true,
        scopeElement: questsContent,
        transitionName: "quests-content",
    };
    const legacyQuestMapAliases = {
        Labs: "The Lab",
    };

    function normalizeQuestMapFilter(mapName) {
        return legacyQuestMapAliases[mapName] || mapName;
    }

    function hasMapOption(mapName) {
        return Array.from(selectMap.options).some(
            (option) => option.value === mapName
        );
    }

    navigationManager.init();

    const questDefaultState = {
        scope: "trader",
        trader: "Prapor",
        map: "All",
        search: "",
        globalSearch: "",
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
        const newQuestState = getQuestStateFromParams(urlParams, questDefaultState);

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

        ["scope", "trader", "map", "search", "globalSearch", "questId", "view"].forEach((param) => {
            params.delete(param);
        });

        if (questState.scope !== questDefaultState.scope) {
            params.set("scope", questState.scope);
        }

        if (questState.trader !== questDefaultState.trader) {
            params.set("trader", questState.trader);
        }
        if (questState.map !== questDefaultState.map) {
            params.set("map", questState.map);
        }
        if (questState.search !== questDefaultState.search) {
            params.set("search", questState.search);
        }
        if (questState.globalSearch !== questDefaultState.globalSearch) {
            params.set("globalSearch", questState.globalSearch);
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

        const restoredState = getQuestStateFromParams(urlParams, questDefaultState);

        currentQuestState = { ...restoredState };
        applyQuestState(currentQuestState);
    };
    const applyQuestState = (questState) => {
        setQuestScope(questState.scope, false);

        if (questState.scope === "trader") {
            setActiveQuestCategory(questState.trader, false);
        }

        const normalizedMap = normalizeQuestMapFilter(questState.map);
        selectMap.value = hasMapOption(normalizedMap) ? normalizedMap : "All";

        currentSearchTerm = questState.search;
        questSearch.value = questState.search;
        currentGlobalSearchTerm = questState.globalSearch;
        if (questGlobalSearch) {
            questGlobalSearch.value = questState.globalSearch;
        }

        if (questState.view === "json" && questState.questId) {
            showQuestJSON(questState.questId);
        } else {
            showQuestsList();
            if (allQuests.length > 0) {
                processQuestData();
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

    const setQuestScope = (scope, updateState = true) => {
        const normalizedScope = scope === "global" ? "global" : "trader";

        if (questFilters) {
            questFilters.dataset.scope = normalizedScope;
        }

        if (allQuestsTraderBtn) {
            allQuestsTraderBtn.classList.toggle(
                "active",
                normalizedScope === "global"
            );
        }

        if (normalizedScope === "global") {
            questsCategoryToggles.forEach((button) =>
                button.classList.remove("active")
            );
        } else if (allQuestsTraderBtn) {
            allQuestsTraderBtn.classList.remove("active");
        }

        if (updateState) {
            updateQuestState({ scope: normalizedScope });
        }
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
            shouldRestoreListScrollOnNextRender = true;
            updateQuestState({
                view: "list",
                questId: null,
            });
        });
    });

    setupNavigationHandlers();

    const getActiveQuestCategory = () => {
        const activeQuestCategory = document.querySelector(
            "#traderQuests .trader-nav .btn.active[data-trader-id]:not([data-trader-id='all-quests'])"
        );
        return activeQuestCategory
            ? activeQuestCategory.textContent.trim()
            : null;
    };

    const updateMapOptions = (availableMaps) => {
        const normalizedAvailableMaps = new Set(
            availableMaps.map((mapName) => normalizeQuestMapFilter(mapName))
        );

        const options = selectMap.options;
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === "All" || option.value === "Any") {
                option.disabled = false;
            } else {
                option.disabled = !normalizedAvailableMaps.has(
                    normalizeQuestMapFilter(option.value)
                );
            }
        }
    };
    const filterQuests = () => {
        const activeCategory = getActiveQuestCategory();
        const selectedMap = selectMap.value;
        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const globalSearchTerm = currentGlobalSearchTerm.toLowerCase().trim();
        const isGlobalScope = currentQuestState.scope === "global";

        // Chain filters for better performance
        let filteredQuests = allQuests;

        // Filter by trader unless global scope is active
        if (activeCategory && !isGlobalScope) {
            filteredQuests = filterQuestsByTrader(
                filteredQuests,
                activeCategory
            );
        }

        // Filter by map
        filteredQuests = filterQuestsByMap(filteredQuests, selectedMap);

        // Global search: name/ID only, across all traders
        if (isGlobalScope && globalSearchTerm) {
            filteredQuests = filterQuestsBySearch(
                filteredQuests,
                globalSearchTerm,
                false
            );
        }

        // Trader-scoped search: keep objective text matching
        if (!isGlobalScope) {
            filteredQuests = filterQuestsBySearch(filteredQuests, searchTerm, true);
        }

        // Sort the filtered quests by name
        filteredQuests = filteredQuests.sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        return filteredQuests;
    };

    const ensureLocalQuestsLoaded = async () => {
        if (localQuestsData) {
            return localQuestsData;
        }

        localQuestsData = await fetchData(QUESTS_URL);
        return localQuestsData;
    };

    const renderQuests = (quests) => {
        if (quests.length === 0) {
            withViewTransition(() => {
                questsContent.innerHTML =
                    '<div class="no-results">No quests match your search criteria</div>';
            }, questsTransitionOptions);

            if (shouldRestoreListScrollOnNextRender) {
                requestAnimationFrame(() => {
                    window.scrollTo({
                        top: listScrollPositionBeforeJsonOpen || 0,
                        behavior: "auto",
                    });
                });
                shouldRestoreListScrollOnNextRender = false;
            }
            return;
        }

        const searchTerm =
            currentQuestState.scope === "global"
                ? currentGlobalSearchTerm.toLowerCase().trim()
                : currentSearchTerm.toLowerCase().trim();
        const questsHTML = quests
            .map(
                (quest) => {
                    const isMissingInModdedData = Boolean(localQuestsData) && !localQuestsData[quest.id];
                    return `
            <div class="quest-item scroll-ani card" data-quest-id="${
                quest.id
            }" data-quest-map="${
                    quest.map ? quest.map.name : "Any"
                }" data-quest-level="${quest.minPlayerLevel || 0}" data-has-local-json="${!isMissingInModdedData}">
                <div class="card-body">
                    <a href="javascript:void(0);" class="image">
                        <img src="data/quest-images/${quest.id}.webp" alt="${
                    quest.name
                }" data-fallback-src="assets/img/missing-quest.jpg">
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
                        ${isMissingInModdedData ? '<p class="modded-missing-tag">Live Only</p>' : ""}
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
                        ${!isMissingInModdedData ? `<a href="?questId=${
                            quest.id
                        }&view=json" class="btn sm btn-outline json-link" title="View JSON template"><i class="bi bi-filetype-json"></i> JSON</a>` : ""}
                        <a href="${
                            quest.wikiLink || "#"
                        }" target="_blank" class="btn sm ${
                    !quest.wikiLink ? "disabled" : ""
                }" title="Open Tarkov Wiki"><i class="bi bi-book"></i> Wiki</a>
                    </div>
                </div>
            </div>
        `;
                }
            )
            .join("");

        withViewTransition(() => {
            questsContent.innerHTML = questsHTML;
            enhanceContainerImages(questsContent, {
                fallbackSrc: "assets/img/missing-quest.jpg",
            });
        }, questsTransitionOptions);

        if (shouldRestoreListScrollOnNextRender) {
            requestAnimationFrame(() => {
                window.scrollTo({
                    top: listScrollPositionBeforeJsonOpen || 0,
                    behavior: "auto",
                });
            });
            shouldRestoreListScrollOnNextRender = false;
        }
    };
    const fetchQuestsData = async () => {
        const fetchToken = ++latestFetchToken;
        setPageLoading(questsContent, true, { label: "Loading quests..." });

        try {
            await ensureLocalQuestsLoaded();
            const data = await fetchData(TASKS_URL);

            if (fetchToken !== latestFetchToken) {
                return;
            }

            if (data && data.tasks) {
                allQuests = Object.values(data.tasks); // Convert tasks object to array
                processQuestData();
            } else {
                withViewTransition(() => {
                    questsContent.innerHTML = "No quests data found.";
                }, questsTransitionOptions);
            }
        } catch (error) {
            console.error("Error fetching quests data:", error);
            if (fetchToken === latestFetchToken) {
                withViewTransition(() => {
                    questsContent.innerHTML = "Error fetching quests data.";
                }, questsTransitionOptions);
            }
        } finally {
            if (fetchToken === latestFetchToken) {
                setPageLoading(questsContent, false);
            }
        }
    };

    const processQuestData = () => {
        const activeCategory = getActiveQuestCategory();
        const availableMaps = new Set();
        const isGlobalScope = currentQuestState.scope === "global";
        allQuests.forEach((quest) => {
            if (isGlobalScope) {
                if (quest.map && quest.map.name) {
                    availableMaps.add(quest.map.name);
                }
                return;
            }

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
                    scope: "trader",
                    trader: questCategoryName,
                    map: "All",
                    search: "",
                    globalSearch: currentGlobalSearchTerm,
                });
                // Reset filters when changing trader
                selectMap.value = "All";
                currentSearchTerm = "";
                questSearch.value = "";

                fetchQuestsData();
            }
        }
    }

    questsCategoryToggles.forEach((questCategory) => {
        questCategory.addEventListener(
            "click",
            debounce((event) => {
                event.preventDefault();
                const traderName = questCategory.textContent.trim();

                // Any explicit trader selection should switch scope back to trader mode.
                setQuestScope("trader", false);
                setActiveQuestCategory(traderName, true);
            }, 100)
        );
    });
    if (allQuestsTraderBtn) {
        allQuestsTraderBtn.addEventListener(
            "click",
            debounce((event) => {
                event.preventDefault();
                currentSearchTerm = "";
                questSearch.value = "";
                setQuestScope("global", false);
                updateQuestState({
                    scope: "global",
                    search: "",
                    view: "list",
                    questId: null,
                });
            }, 100)
        );
    }
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
    if (questGlobalSearch) {
        questGlobalSearch.addEventListener(
            "input",
            debounce(() => {
                const searchValue = questGlobalSearch.value;
                currentGlobalSearchTerm = searchValue;
                updateQuestState({ globalSearch: searchValue });
                const filteredQuests = filterQuests();
                renderQuests(filteredQuests);
            }, 300)
        );
    }
    questsContent.addEventListener("click", (event) => {
        const questItem = event.target.closest(".quest-item");
        if (questItem) {
            const questId = questItem.getAttribute("data-quest-id");
            const hasLocalJson = questItem.getAttribute("data-has-local-json") === "true";

            const isJsonLink =
                event.target.classList.contains("json-link") ||
                event.target.closest(".json-link") ||
                (event.target.tagName === "I" &&
                    event.target.closest(".json-link"));

            const isTitleOrImageClick =
                event.target.tagName === "IMG" ||
                event.target.tagName === "H4" ||
                event.target.closest(".titleLink");

            if (
                (isTitleOrImageClick && hasLocalJson) ||
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

                    if (isJsonLink) {
                        listScrollPositionBeforeJsonOpen =
                            window.scrollY || window.pageYOffset || 0;
                    }

                    updateQuestState({
                        questId: questId,
                        view: "json",
                    });
                }
            }
        }
    });
    async function loadQuestTemplate(questId) {
        try {
            const data = await ensureLocalQuestsLoaded();
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
        } catch (error) {
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
        }
    }

    function getQuestStateFromParams(urlParams, defaultState) {
        return {
            scope: urlParams.get("scope") || defaultState.scope,
            trader: urlParams.get("trader") || defaultState.trader,
            map: normalizeQuestMapFilter(
                urlParams.get("map") || defaultState.map
            ),
            search: urlParams.get("search") || defaultState.search,
            globalSearch:
                urlParams.get("globalSearch") || defaultState.globalSearch,
            questId: urlParams.get("questId") || defaultState.questId,
            view: urlParams.get("view") || defaultState.view,
        };
    }
    document.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "f") {
            // Ctrl+F or Cmd+F (Mac) - Focus on search field
            event.preventDefault();
            if (currentQuestState.scope === "global" && questGlobalSearch) {
                questGlobalSearch.focus();
            } else {
                questSearch.focus();
            }
        } else if (event.key === "Escape") {
            if (document.activeElement === questSearch) {
                questSearch.value = "";
                currentSearchTerm = "";
                updateQuestState({ search: "" });
                const filteredQuests = filterQuests();
                renderQuests(filteredQuests);
            } else if (questGlobalSearch && document.activeElement === questGlobalSearch) {
                questGlobalSearch.value = "";
                currentGlobalSearchTerm = "";
                updateQuestState({ globalSearch: "" });
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
    if (questGlobalSearch) {
        questGlobalSearch.addEventListener("focus", () => {
            questGlobalSearch.select();
        });
    }

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
        const normalizedMapName = normalizeQuestMapFilter(mapName);

        if (normalizedMapName === "All") return quests;
        if (normalizedMapName === "Any") {
            return quests.filter((quest) => !quest.map);
        }

        return quests.filter(
            (quest) => quest.map && quest.map.name === normalizedMapName
        );
    };

    const filterQuestsBySearch = (quests, searchTerm, includeObjectives = true) => {
        if (!searchTerm) return quests;
        const term = searchTerm.toLowerCase();
        return quests.filter(
            (quest) =>
                quest.name.toLowerCase().includes(term) ||
                quest.id.toLowerCase().includes(term) ||
                (includeObjectives && quest.objectives &&
                    quest.objectives.some((obj) =>
                        obj.description.toLowerCase().includes(term)
                    ))
        );
    };

    checkJsonEditor();
});
