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
    const jsonQuests = document.querySelectorAll(".json-quests");
    const achievementTitleSpan = document.getElementById("achievementTitle");

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
                        <div class="achievement-popover-body">
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
                if (editorElement && typeof CodeMirror !== 'undefined') {
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
                } else {
                    // Fallback if CodeMirror is not available
                    editorElement.innerHTML = `<pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px;"><code>${JSON.stringify(achievement, null, 2)}</code></pre>`;
                }
            }, 50);
        } else {
            achievementPopover.showError('Failed to load achievement template data');
        }
    };

    // Load local achievements data
    const loadLocalAchievementsData = async () => {
        try {
            const response = await fetch(ACHIEVEMENTS);
            achievementsLocalData = await response.json();
        } catch (error) {
            console.error("Error loading local achievements data:", error);
        }
    };

    // Show achievements list
    const showAchievementsList = () => {
        jsonQuests.forEach((jsonQuest) => {
            jsonQuest.style.display = "none";
        });
        achievementsContent.style.display = "grid";
    };

    // Show achievement JSON
    const showAchievementJSON = (achievementId) => {
        if (achievementId) {
            loadAchievementTemplate(achievementId);
            jsonQuests.forEach((jsonQuest) => {
                jsonQuest.style.display = "block";
            });
            achievementsContent.style.display = "none";
        }
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

                    // Fetch the achievements.json file
                    fetch("data/achievements.json")
                        .then((response) => response.json())
                        .then((jsonData) => {
                            const achievementsHTML = data.data.achievements
                                .map((achievement) => {
                                    // Check if achievement has corresponding JSON data
                                    const hasJsonData = achievementsLocalData.some(ach => ach.id === achievement.id);
                                    const disabledClass = hasJsonData ? "" : " disabled";
                                    
                                    return `
                                    <a href="#" class="achievements-item scroll-ani scroll-70 card ${
                                        achievement.hidden ? "ach-hidden" : ""
                                    } ${achievement.rarity.toLowerCase()}${disabledClass}" data-achievement-id="${achievement.id}">
                                        <img src="${
                                            achievement.imageLink
                                        }" alt="${achievement.name}">
                                        <div class="content">
                                            <h4>${achievement.name}</h4>
                                            <p>${achievement.description}</p>
                                            <span class="global-id">${
                                                achievement.id
                                            }</span>
                                        </div>
                                    </a>
                                `;
                                })
                                .join("");
                            achievementsContent.innerHTML = achievementsHTML;
                            
                            // Add click event listeners to achievement items
                            attachAchievementClickHandlers();
                        })
                        .catch((error) => {
                            console.error(
                                "Error fetching achievements.json:",
                                error
                            );
                            achievementsContent.innerHTML =
                                "Error fetching achievements data.";
                        });
                } else {
                    achievementsContent.innerHTML =
                        "No achievements data found.";
                }
            })
            .catch((error) => {
                console.error("Error fetching achievements data:", error);
                achievementsContent.innerHTML =
                    "Error fetching achievements data.";
            });
    };

    // Initialize everything
    loadLocalAchievementsData().then(() => {
        initializeAchievementPopover(); // Initialize popover
        fetchAchievementsData();
    });
    checkJsonEditor();
});
