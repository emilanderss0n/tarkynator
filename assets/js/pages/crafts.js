import { fetchData } from '../core/cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const craftsContainer = document.getElementById('craftsContainer');
    const craftsCategoryToggles = document.querySelectorAll('#craftsContainer .btn');
    const craftsContent = document.getElementById('craftsContent');

    const getActiveStationId = () => {
        const activeCraftCategory = document.querySelector('#craftsContainer .btn-group .btn.active');
        return activeCraftCategory ? activeCraftCategory.getAttribute('data-id') : null;
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
                            id
                            name
                            iconLink
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

                    const activeStationId = getActiveStationId();
                    const filteredCrafts = data.data.crafts.filter(craft => craft.station.id === activeStationId);
                    filteredCrafts.sort((a, b) => a.level - b.level);
                    const craftsHTML = filteredCrafts.map(craft => `
                        <div class="craft-item card" data-item-station="${craft.station.name}">
                            <div class="main-title">
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
                                <details class="required-items">
                                    <summary class="toggle-req-items btn">Required Items</summary>
                                    <ul class="inner-list">
                                    ${craft.requiredItems.map(item => `
                                        <li class="req-item"><div class="req-item-containter"><span class="count">${item.count}x</span><img src="${item.item.iconLink}" alt="${item.item.name}" /><span class="global-id title">${item.item.name}</span></div></li>
                                    `).join('')}
                                    </ul>
                                </details>
                            ` : ''}
                            <div class="card-footer">
                                <div class="craft-id"><a href="#" data-id="${craft.id}" class="global-id btn"><i class="bi bi-copy"></i> Craft ID</a></div>
                                ${craft.taskUnlock ? `
                                <p class="quest"><img src="assets/img/notification_icon_quest.png" width="36" height="34" /><a href="#" data-id="${craft.taskUnlock.id}" class="global-id">${craft.taskUnlock.name}</a></p>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');
                    craftsContent.innerHTML = craftsHTML;
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