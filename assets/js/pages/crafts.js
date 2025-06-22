import { fetchData } from '../core/cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const craftsContainer = document.getElementById('craftsContainer');
    const craftsCategoryToggles = document.querySelectorAll('#craftsContainer .btn');
    const craftsContent = document.getElementById('craftsContent');

    const getActiveCraftNavLink = () => {
        const activeCraftCategory = document.querySelector('#craftsContainer .btn-group .btn.active');
        return activeCraftCategory ? activeCraftCategory.textContent.trim() : null;
    };

    const fetchCraftsData = () => {
        const query = `
            query {
                crafts {
                    id
                    station {
                        id
                        name
                    }
                    taskUnlock {
                        id
                        name
                        minPlayerLevel
                    }
                    rewardItems {
                        item {
                            id
                            name
                            iconLink
                        }
                    }
                    requiredItems {
                        item {
                            name
                        }
                        count
                    }
                    level
                }
            }
        `;

        const url = 'https://api.tarkov.dev/graphql';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip'
            },
            body: JSON.stringify({ query })
        };

        fetchData(url, options)
            .then(data => {
                if (data && data.data && data.data.crafts) {
                    // Store the crafts data in localStorage
                    localStorage.setItem('craftsData', JSON.stringify(data.data.crafts));

                    const activeStation = getActiveCraftNavLink();
                    const filteredCrafts = data.data.crafts.filter(craft => craft.station.name === activeStation);
                    filteredCrafts.sort((a, b) => a.level - b.level);
                    const craftsHTML = filteredCrafts.map(craft => `
                        <div class="craft-item card" data-item-station="${craft.station.name}">
                            <div class="title">
                                ${craft.rewardItems.map(reward => `
                                    <img src="${reward.item.iconLink}" alt="${reward.item.name}" />
                                    <div class="item-title">
                                        <h4>${reward.item.name}</h4>
                                        <p class="level">
                                            <i class="bi bi-lightning-charge-fill"></i> Level ${craft.level}
                                        </p>
                                    </div>
                                `).join(', ')}
                            </div>
                            ${Array.isArray(craft.requiredItems) && craft.requiredItems.length > 0 ? `
                                <div class="required-items">
                                    <a href="#" class="toggle-req-items">Required Items</a>
                                    <ul class="req-items-list">
                                    ${craft.requiredItems.map(item => `
                                        <li class="req-item"><div class="req-item-containter"><span class="global-id title">${item.item.name}</span> (${item.count})</div></li>
                                    `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${craft.taskUnlock ? `
                                <p class="quest"><img src="assets/img/notification_icon_quest.png" width="36" height="34" /><strong>${craft.taskUnlock.name}</strong> (Player lvl ${craft.taskUnlock.minPlayerLevel})</p>
                            ` : ''}
                            <div class="craft-id">Craft ID: <span class="global-id">${craft.id}</span></div>
                        </div>
                    `).join('');
                    craftsContent.innerHTML = craftsHTML;

                    // Add event listeners for toggling required items
                    document.querySelectorAll('.toggle-req-items').forEach(toggleLink => {
                        toggleLink.addEventListener('click', (event) => {
                            event.preventDefault();
                            const reqItemsList = toggleLink.nextElementSibling;
                            if (reqItemsList.classList.contains('expanded')) {
                                reqItemsList.classList.remove('expanded');
                            } else {
                                reqItemsList.classList.add('expanded');
                            }
                        });
                    });
                } else {
                    craftsContent.innerHTML = 'No crafts data found.';
                }
            })
            .catch(error => {
                console.error('Error fetching crafts data:', error);
                craftsContent.innerHTML = 'Error fetching crafts data.';
            });
    };

    fetchCraftsData();

    function setActiveCraftCategory(craftCategory) {
        craftsCategoryToggles.forEach(link => link.classList.remove('active'));
        craftCategory.classList.add('active');
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    craftsCategoryToggles.forEach(craftCategory => {
        craftCategory.addEventListener('click', debounce((event) => {
            event.preventDefault();
            setActiveCraftCategory(craftCategory);
            fetchCraftsData();
        }, 100));
    });

});