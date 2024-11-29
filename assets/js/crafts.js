import { fetchData } from './cache.js';

document.addEventListener('DOMContentLoaded', () => {

    const craftsContainer = document.getElementById('craftsContainer');
    const craftsNavLinks = document.querySelectorAll('#craftsContainer .btn');
    const craftsContent = document.getElementById('craftsContent');

    const navLinksAll = document.querySelectorAll('.head-nav .btn');

    const getActiveCraftNavLink = () => {
        const activeNavLink = document.querySelector('#craftsContainer .btn-group .btn.active');
        return activeNavLink ? activeNavLink.textContent.trim() : null;
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
                                        <h4><span class="global-id title">${reward.item.name}</span></h4>
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
                            ${Array.isArray(craft.taskUnlock) && craft.taskUnlock.length > 0 ? `
                                <p class="quest"><i class="bi bi-check-circle"></i> <strong>${craft.taskUnlock.name}</strong> (Level ${craft.taskUnlock.minPlayerLevel})</p>
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

    // Navlinks are matched by their text content, example: templateNavLink is connected to templateContainer
    function setActiveNavLink(navLink) {
        navLinksAll.forEach(link => link.classList.remove('active'));
        navLink.classList.add('active');
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    craftsNavLinks.forEach(navLink => {
        navLink.addEventListener('click', debounce((event) => {
            event.preventDefault();
            setActiveNavLink(navLink);
            fetchCraftsData();
        }, 100));
    });

});