import { fetchData } from '../core/cache.js';

document.addEventListener('DOMContentLoaded', () => {
    const commonIdContainer = document.getElementById('commonIdContainer');
    const commonIdContent = document.getElementById('commonIdContent');

    const fetchCommonData = () => {
        const query = `
            query {
                traders {
                    id
                    name
                }
                bosses {
                    id
                    name
                }
                hideoutStations {
                    id
                    name
                }
                handbookCategories {
                    id
                    name
                }
                lootContainers {
                    name
                    id
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
                if (data && data.data) {
                    // Store the common data in localStorage
                    localStorage.setItem('commonData', JSON.stringify(data.data));

                    const ITEMS_PER_PAGE = 10;
                    let currentPageBosses = 1;
                    let currentPageStations = 1;
                    let currentPageTraders = 1;
                    let currentPageHandbook = 1;
                    let currentPageContainers = 1;

                    const createTableRows = (items, page) => {
                        // Add null check for items
                        if (!items || !Array.isArray(items)) return '';

                        const start = (page - 1) * ITEMS_PER_PAGE;
                        const end = start + ITEMS_PER_PAGE;
                        return items.slice(start, end).map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td><span class="global-id">${item.id}</span></td>
                            </tr>
                        `).join('');
                    };

                    const createPaginationControls = (items, currentPage, containerId, updatePageCallback) => {
                        // Add null check for items
                        if (!items || !Array.isArray(items)) return;

                        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                        let paginationHTML = '<nav><ul class="pagination">';
                        for (let i = 1; i <= totalPages; i++) {
                            paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
                        }
                        paginationHTML += '</ul></nav>';

                        const paginationElement = document.getElementById(containerId);
                        if (paginationElement) {
                            paginationElement.innerHTML = paginationHTML;

                            paginationElement.querySelectorAll('.page-link').forEach(link => {
                                link.addEventListener('click', (event) => {
                                    event.preventDefault();
                                    const newPage = parseInt(event.target.getAttribute('data-page'));
                                    updatePageCallback(newPage);
                                    renderTables();
                                });
                            });
                        }
                    };

                    const renderTables = () => {
                        if (!data || !data.data) return;

                        const bossesHTML = createTableRows(data.data.bosses, currentPageBosses);
                        const stationsHTML = createTableRows(data.data.hideoutStations, currentPageStations);
                        const tradersHTML = createTableRows(data.data.traders, currentPageTraders);
                        const handbookCategoriesHTML = createTableRows(data.data.handbookCategories, currentPageHandbook);
                        const lootContainersHTML = createTableRows(data.data.lootContainers, currentPageContainers);


                        commonIdContent.innerHTML = `
                            <div class="bosses card">
                                <div class="table-responsive">
                                    <table class="table caption-top">
                                        <div class="page-top-title">
                                            <img src="assets/img/handbook/icon_gear_facecovers.png" height="38" width="29" />
                                            <h4>Bosses</h4>
                                        </div>
                                        <thead>
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            ${bossesHTML}
                                        </tbody>
                                    </table>
                                    <div class="pagination-controls" id="bosses-pagination"></div>
                                </div>
                            </div>
                            <div class="hideout-stations card">
                                <div class="table-responsive">
                                    <table class="table caption-top">
                                        <div class="page-top-title">
                                            <img src="assets/img/handbook/icon_gear_secured.png" height="34" width="32" />
                                            <h4>Hideout Stations</h4>
                                        </div>
                                        <thead>
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            ${stationsHTML}
                                        </tbody>
                                    </table>
                                    <div class="pagination-controls" id="stations-pagination"></div>
                                </div>
                            </div>
                            <div class="traders card">
                                <div class="table-responsive">
                                    <table class="table caption-top">
                                        <div class="page-top-title">
                                            <img src="assets/img/handbook/icon_barter.png" height="24" width="25" />
                                            <h4>Traders</h4>
                                        </div>
                                        <thead>
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            ${tradersHTML}
                                        </tbody>
                                    </table>
                                    <div class="pagination-controls" id="traders-pagination"></div>
                                </div>
                            </div>
                            <div class="handbook-categories card">
                                <div class="table-responsive">
                                    <table class="table caption-top">
                                        <div class="page-top-title">
                                            <img src="assets/img/handbook/icon_info.png" height="27" width="29" />
                                            <h4>Handbook Categories</h4>
                                        </div>
                                        <thead>
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            ${handbookCategoriesHTML}
                                        </tbody>
                                    </table>
                                    <div class="pagination-controls" id="handbook-pagination"></div>
                                </div>
                            </div>
                            <div class="loot-containers card">
                                <div class="table-responsive">
                                    <table class="table caption-top">
                                        <div class="page-top-title">
                                            <img src="assets/img/handbook/icon_gear_cases.png" height="29" width="34" />
                                            <h4>Loot Containers</h4>
                                        </div>
                                        <thead>
                                            <tr>
                                                <th scope="col">Name</th>
                                                <th scope="col">ID</th>
                                            </tr>
                                        </thead>
                                        <tbody class="table-group-divider">
                                            ${lootContainersHTML}
                                        </tbody>
                                    </table>
                                    <div class="pagination-controls" id="containers-pagination"></div>
                                </div>
                            </div>
                        `;

                        createPaginationControls(data.data.bosses, currentPageBosses, 'bosses-pagination', (newPage) => {
                            currentPageBosses = newPage;
                        });
                        createPaginationControls(data.data.hideoutStations, currentPageStations, 'stations-pagination', (newPage) => {
                            currentPageStations = newPage;
                        });
                        createPaginationControls(data.data.traders, currentPageTraders, 'traders-pagination', (newPage) => {
                            currentPageTraders = newPage;
                        });
                        createPaginationControls(data.data.handbookCategories, currentPageHandbook, 'handbook-pagination', (newPage) => {
                            currentPageHandbook = newPage;
                        });
                        createPaginationControls(data.data.lootContainers, currentPageContainers, 'containers-pagination', (newPage) => {
                            currentPageContainers = newPage;
                        });
                    };

                    renderTables();
                }
            })
            .catch(error => {
                console.error('Error fetching common data:', error);
                commonIdContent.innerHTML = 'Error fetching common data.';
            });
    };

    fetchCommonData();

});