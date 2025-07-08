import { fetchData } from "../core/cache.js";
import { ACHIEVEMENTS } from "../core/localData.js";
import {
    checkJsonEditor,
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";

let achievementsLocalData = []; // Store local achievements data
let originalAchievementsHTML = ''; // Store original achievements HTML

document.addEventListener("DOMContentLoaded", () => {
    const achievementsContainer = document.getElementById("achievementsContainer");
    const achievementsContent = document.getElementById("achievementsContent");
    const jsonQuests = document.querySelectorAll(".json-quests");
    const achievementTitleSpan = document.getElementById("achievementTitle");

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
        const storedAchievements = JSON.parse(localStorage.getItem("achievementsData") || "[]");
        const achievementInfo = storedAchievements.find(ach => ach.id === achievementId);
        const achievementName = achievementInfo ? achievementInfo.name : achievementId;
        
        if (achievement) {
            if (typeof editor !== "undefined" && editor) {
                editor.setValue(JSON.stringify(achievement, null, 2));
                // Refresh the editor after a short delay to ensure it's visible
                setTimeout(() => {
                    editor.refresh();
                }, 100);
                checkJsonEditorSimple();
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                const jsonTextarea = document.getElementById("jsoneditor");
                if (jsonTextarea) {
                    jsonTextarea.value = JSON.stringify(achievement, null, 2);
                }
                console.warn("Editor not available, using textarea fallback");
            }
            achievementTitleSpan.textContent = `JSON for: ${achievementName} (Achievement)`;
        } else {
            console.error("Achievement data not found for ID:", achievementId);
            achievementTitleSpan.textContent = "Achievement not found";
            if (typeof editor !== "undefined" && editor) {
                editor.setValue("{}");
                setTimeout(() => {
                    editor.refresh();
                }, 100);
            } else {
                const jsonTextarea = document.getElementById("jsoneditor");
                if (jsonTextarea) {
                    jsonTextarea.value = "{}";
                }
            }
        }
    }

    // Handle close button
    const closeButtons = document.querySelectorAll(".json-quests .close-btn");
    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            showAchievementsList();
        });
    });

    // Function to attach click event listeners to achievement items
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
                showAchievementJSON(achievementId);
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
                                    <a href="#" class="achievements-item card ${
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
        fetchAchievementsData();
    });
    checkJsonEditor();
});
