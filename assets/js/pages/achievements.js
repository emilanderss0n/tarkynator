import { fetchData } from "../core/cache.js";
import { ACHIEVEMENTS } from "../core/localData.js";
import {
    checkJsonEditor,
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";
import { Popover } from "../components/popover.js";

let achievementsLocalData = []; // Store local achievements data
let originalAchievementsHTML = ''; // Store original achievements HTML
let achievementPopover = null; // Store popover instance

document.addEventListener("DOMContentLoaded", () => {
    const achievementsContainer = document.getElementById("achievementsContainer");
    const achievementsContent = document.getElementById("achievementsContent");
    const achievementTitleSpan = document.getElementById("achievementTitle");

    // Add search and filter UI elements
    const createSearchAndFilterUI = () => {
        const searchAndFilterHTML = `
            <div class="animate-in component-container flex-container">
                <div class="search-container">
                    <input id="achievementSearch" class="form-control" type="text" placeholder="Search achievements by name, ID, or description..." />
                </div>
                <nav class="btn-group filters" id="rarityFilters">
                    <a class="btn sm active" href="javascript:void(0);" data-rarity="all">All</a>
                    <a class="btn sm" href="javascript:void(0);" data-rarity="common">Common</a>
                    <a class="btn sm" href="javascript:void(0);" data-rarity="rare">Rare</a>
                    <a class="btn sm" href="javascript:void(0);" data-rarity="legendary">Legendary</a>
                </nav>
            </div>
        `;
        
        // Insert before the achievements content
        achievementsContent.insertAdjacentHTML('beforebegin', searchAndFilterHTML);
        
        // Get references to the new elements
        const achievementSearch = document.getElementById("achievementSearch");
        const rarityFilters = document.getElementById("rarityFilters");
        
        return { achievementSearch, rarityFilters };
    };

    // Search and filter variables
    let allAchievements = [];
    let filteredAchievements = [];
    let currentSearchTerm = "";
    let currentRarityFilter = "all";
    
    // Get UI elements after creation
    const { achievementSearch, rarityFilters } = createSearchAndFilterUI();

    // Initialize achievement popover
    const initializeAchievementPopover = () => {
        // Create popover HTML structure if it doesn't exist
        if (!document.getElementById('achievement-popover')) {
            const popoverHTML = `
                <div id="achievement-popover" class="achievement-popover" popover>
                    <div class="popover-content">
                        <div class="popover-header">
                            <h4 class="popover-title">Achievement Template</h4>
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
        achievementPopover = new Popover('achievement-popover', {
            closeOnBackdrop: true,
            closeOnEscape: true
        });
    };

    // Show achievement popover
    const showAchievementPopover = async (achievementId) => {
        if (!achievementPopover || !achievementPopover.isReady()) {
            console.error('Achievement popover not initialized');
            return;
        }

        // Show loading state
        achievementPopover.showLoading('Loading achievement template...');
        
        // Show popover
        achievementPopover.show();

        // Load achievement template data
        const achievement = achievementsLocalData.find(ach => ach.id === achievementId);
        
        if (achievement) {
            // Get achievement name from the GraphQL data stored in localStorage
            const storedAchievements = localStorage.getItem("achievementsData");
            let achievementName = "Unknown Achievement";
            
            if (storedAchievements) {
                try {
                    const graphqlAchievements = JSON.parse(storedAchievements);
                    const graphqlAchievement = graphqlAchievements.find(ach => ach.id === achievementId);
                    if (graphqlAchievement) {
                        achievementName = graphqlAchievement.name;
                    }
                } catch (error) {
                    console.error("Error parsing stored achievements:", error);
                }
            }

            // Update popover title
            achievementPopover.setTitle(`${achievementName} - Template Structure`);

            // Create CodeMirror editor container
            const editorId = `achievement-editor-${achievementId}`;
            const editorContent = `
                <div class="achievement-template-editor">
                    <div id="${editorId}" class="achievement-codemirror"></div>
                </div>
            `;
            
            achievementPopover.setContent(editorContent);

            // Initialize CodeMirror editor
            setTimeout(() => {
                const editorElement = document.getElementById(editorId);
                if (editorElement) {
                    if (typeof CodeMirror !== 'undefined') {
                        try {
                            const achievementEditor = CodeMirror(editorElement, {
                                value: JSON.stringify(achievement, null, 2),
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
                            achievementEditor.setSize('100%', '70vh');
                        } catch (error) {
                            console.error('Error initializing CodeMirror:', error);
                            // Fallback to plain text if CodeMirror fails
                            editorElement.innerHTML = `<pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px;"><code>${JSON.stringify(achievement, null, 2)}</code></pre>`;
                        }
                    } else {
                        // Fallback if CodeMirror is not available
                        editorElement.innerHTML = `<pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px;"><code>${JSON.stringify(achievement, null, 2)}</code></pre>`;
                    }
                } else {
                    console.error(`Editor element with ID ${editorId} not found`);
                }
            }, 100);
        } else {
            achievementPopover.showError('Failed to load achievement template data');
        }
    };

    // Load local achievements data
    const loadLocalAchievementsData = async () => {
        try {
            if (!ACHIEVEMENTS || ACHIEVEMENTS === 'null' || ACHIEVEMENTS === null) {
                console.error("ACHIEVEMENTS constant is invalid:", ACHIEVEMENTS);
                return;
            }
            const response = await fetch(ACHIEVEMENTS);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            achievementsLocalData = await response.json();
        } catch (error) {
            console.error("Error loading local achievements data:", error);
        }
    };

    // Show achievements list
    const showAchievementsList = () => {
        achievementsContent.style.display = "grid";
    };

    // Load achievement template
    function loadAchievementTemplate(achievementId) {
        const achievement = achievementsLocalData.find(ach => ach.id === achievementId);
        
        // Get achievement name from the GraphQL data stored in localStorage
        const storedAchievements = localStorage.getItem("achievementsData");
        let achievementName = "Unknown Achievement";
        
        if (storedAchievements) {
            try {
                const graphqlAchievements = JSON.parse(storedAchievements);
                const graphqlAchievement = graphqlAchievements.find(ach => ach.id === achievementId);
                if (graphqlAchievement) {
                    achievementName = graphqlAchievement.name;
                }
            } catch (error) {
                console.error("Error parsing stored achievements:", error);
            }
        }

        achievementTitleSpan.textContent = achievementName;
        checkJsonEditorSimple(achievement);
    }

    // Attach click event listeners to achievement items
    const attachAchievementClickHandlers = () => {
        const achievementItems = document.querySelectorAll('.achievements-item');
        achievementItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                // Check if the item is disabled
                if (item.classList.contains('disabled')) {
                    return; // Don't do anything for disabled items
                }
                const achievementId = item.getAttribute('data-achievement-id');
                showAchievementPopover(achievementId);
            });
        });
    };

    const fetchAchievementsData = () => {
        const query = `
            query {
                achievements {
                    id
                    name
                    imageLink
                    description
                    rarity
                    hidden
                }
            }
        `;

        const url = "https://api.tarkov.dev/graphql";
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip",
            },
            body: JSON.stringify({ query }),
        };

        fetchData(url, options)
            .then((data) => {
                if (data && data.data && data.data.achievements) {
                    // Store the achievements data in localStorage
                    localStorage.setItem(
                        "achievementsData",
                        JSON.stringify(data.data.achievements)
                    );

                    // Store all achievements for filtering
                    allAchievements = data.data.achievements;
                    
                    // Apply initial filters and render
                    filteredAchievements = filterAchievements();
                    renderAchievements(filteredAchievements);
                } else {
                    achievementsContent.innerHTML = "No achievements data found.";
                }
            })
            .catch((error) => {
                console.error("Error fetching achievements data:", error);
                achievementsContent.innerHTML = "Error fetching achievements data.";
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

    // Filter achievements by search term
    const filterAchievementsBySearch = (achievements, searchTerm) => {
        if (!searchTerm) return achievements;
        const term = searchTerm.toLowerCase();
        return achievements.filter(
            (achievement) =>
                achievement.name.toLowerCase().includes(term) ||
                achievement.id.toLowerCase().includes(term) ||
                achievement.description.toLowerCase().includes(term)
        );
    };

    // Filter achievements by rarity
    const filterAchievementsByRarity = (achievements, rarity) => {
        if (rarity === "all") return achievements;
        return achievements.filter(
            (achievement) => achievement.rarity.toLowerCase() === rarity
        );
    };

    // Main filter function
    const filterAchievements = () => {
        let filtered = allAchievements;
        
        // Apply search filter
        filtered = filterAchievementsBySearch(filtered, currentSearchTerm);
        
        // Apply rarity filter
        filtered = filterAchievementsByRarity(filtered, currentRarityFilter);
        
        // Sort by name
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        return filtered;
    };

    // Highlight search terms in text
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

    // Render filtered achievements
    const renderAchievements = (achievements) => {
        if (achievements.length === 0) {
            achievementsContent.innerHTML = '<div class="no-results">No achievements match your search criteria</div>';
            return;
        }

        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const achievementsHTML = achievements
            .map((achievement) => {
                // Check if achievement has corresponding JSON data
                const hasJsonData = achievementsLocalData.some(ach => ach.id === achievement.id);
                const disabledClass = hasJsonData ? "" : " disabled";
                
                return `
                <a href="#" class="achievements-item scroll-ani scroll-70 card ${
                    achievement.hidden ? "ach-hidden" : ""
                } ${achievement.rarity.toLowerCase()}${disabledClass}" data-achievement-id="${achievement.id}">
                    <img src="${achievement.imageLink}" alt="${achievement.name}">
                    <div class="content">
                        <h4>${highlightSearchTerms(achievement.name, searchTerm)}</h4>
                        <p>${highlightSearchTerms(achievement.description, searchTerm)}</p>
                        <span class="global-id">${highlightSearchTerms(achievement.id, searchTerm)}</span>
                    </div>
                </a>
            `;
            })
            .join("");
        
        achievementsContent.innerHTML = achievementsHTML;
        
        // Re-attach click handlers after rendering
        attachAchievementClickHandlers();
    };

    // Setup event handlers for search and filters
    const setupSearchAndFilterHandlers = () => {
        // Search input handler
        achievementSearch.addEventListener(
            "input",
            debounce(() => {
                currentSearchTerm = achievementSearch.value.trim();
                filteredAchievements = filterAchievements();
                renderAchievements(filteredAchievements);
            }, 300)
        );

        // Rarity filter handlers
        rarityFilters.addEventListener("click", (event) => {
            const filterButton = event.target.closest("[data-rarity]");
            if (filterButton) {
                event.preventDefault();
                
                // Update active state
                rarityFilters.querySelectorAll(".btn").forEach(btn => btn.classList.remove("active"));
                filterButton.classList.add("active");
                
                // Update current filter
                currentRarityFilter = filterButton.getAttribute("data-rarity");
                
                // Apply filters
                filteredAchievements = filterAchievements();
                renderAchievements(filteredAchievements);
            }
        });

        // Keyboard shortcuts
        document.addEventListener("keydown", (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "f") {
                // Ctrl+F or Cmd+F (Mac) - Focus on search field
                event.preventDefault();
                achievementSearch.focus();
            } else if (event.key === "Escape") {
                if (document.activeElement === achievementSearch) {
                    achievementSearch.value = "";
                    currentSearchTerm = "";
                    filteredAchievements = filterAchievements();
                    renderAchievements(filteredAchievements);
                }
            }
        });

        // Focus handler for search input
        achievementSearch.addEventListener("focus", () => {
            achievementSearch.select();
        });
    };

    // Initialize everything
    loadLocalAchievementsData().then(() => {
        initializeAchievementPopover(); // Initialize popover
        setupSearchAndFilterHandlers(); // Setup search and filter event handlers
        fetchAchievementsData();
    });
    checkJsonEditor();
});
