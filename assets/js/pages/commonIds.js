import { fetchGraphQL } from '../core/graphqlClient.js';
import { withViewTransition } from '../core/viewTransitionManager.js';
import { enhanceContainerImages } from '../core/imageManager.js';
import { setPageLoading } from '../core/pageLoading.js';

document.addEventListener('DOMContentLoaded', () => {
    const commonIdContent = document.getElementById('commonIdContent');
    const commonIdsTransitionOptions = {
        skipIfBusy: true,
        scopeElement: commonIdContent,
        transitionName: 'commonids-content'
    };

    const fetchCommonData = () => {
        setPageLoading(commonIdContent, true, { label: 'Loading common IDs...' });

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
                maps {
                    id
                    name
                    nameId
                }
                skills {
                    id
                    imageLink
                    name
                }
            }
        `;

        fetchGraphQL(query)
            .then(data => {
                if (!data?.data) {
                    return;
                }

                localStorage.setItem('commonData', JSON.stringify(data.data));

                const ITEMS_PER_PAGE = 10;
                const sectionConfigs = [
                    {
                        key: 'bosses',
                        title: 'Bosses',
                        icon: 'assets/img/handbook/icon_gear_facecovers.png',
                        iconHeight: 38,
                        iconWidth: 29,
                        items: data.data.bosses,
                        isMap: false,
                    },
                    {
                        key: 'stations',
                        title: 'Hideout Stations',
                        icon: 'assets/img/handbook/icon_gear_secured.png',
                        iconHeight: 34,
                        iconWidth: 32,
                        items: data.data.hideoutStations,
                        isMap: false,
                    },
                    {
                        key: 'traders',
                        title: 'Traders',
                        icon: 'assets/img/handbook/icon_barter.png',
                        iconHeight: 24,
                        iconWidth: 25,
                        items: data.data.traders,
                        isMap: false,
                    },
                    {
                        key: 'handbook',
                        title: 'Handbook Categories',
                        icon: 'assets/img/handbook/icon_info.png',
                        iconHeight: 27,
                        iconWidth: 29,
                        items: data.data.handbookCategories,
                        isMap: false,
                    },
                    {
                        key: 'containers',
                        title: 'Loot Containers',
                        icon: 'assets/img/handbook/icon_gear_cases.png',
                        iconHeight: 29,
                        iconWidth: 34,
                        items: data.data.lootContainers,
                        isMap: false,
                    },
                    {
                        key: 'maps',
                        title: 'Maps',
                        icon: 'assets/img/handbook/icon_maps.png',
                        iconHeight: 25,
                        iconWidth: 29,
                        items: data.data.maps,
                        isMap: true,
                    },
                    {
                        key: 'skills',
                        title: 'Skills',
                        icon: 'assets/img/handbook/icon_barter_tools.png',
                        iconHeight: 25,
                        iconWidth: 29,
                        items: data.data.skills,
                        isMap: false,
                    },
                ];

                const sectionMap = Object.fromEntries(
                    sectionConfigs.map(config => [config.key, config])
                );

                const pageState = Object.fromEntries(
                    sectionConfigs.map(config => [config.key, 1])
                );

                const sortItems = (items) => {
                    if (!items || !Array.isArray(items)) {
                        return [];
                    }

                    return [...items].sort((a, b) => a.name.localeCompare(b.name));
                };

                const createTableRows = (items, page, isMap = false) => {
                    const sortedItems = sortItems(items);
                    const start = (page - 1) * ITEMS_PER_PAGE;
                    const end = start + ITEMS_PER_PAGE;

                    return sortedItems.slice(start, end).map(item => `
                        <tr>
                            <td>${isMap ? `${item.name} / ${item.nameId}` : item.name}</td>
                            <td><span class="global-id">${item.id}</span></td>
                        </tr>
                    `).join('');
                };

                const createPaginationInner = (items, currentPage, sectionKey) => {
                    if (!items || !Array.isArray(items)) {
                        return '';
                    }

                    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
                    if (totalPages <= 1) {
                        return '';
                    }

                    let paginationHTML = '<nav aria-label="Page navigation"><ul class="pagination">';
                    for (let i = 1; i <= totalPages; i++) {
                        paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}" data-section="${sectionKey}">${i}</a></li>`;
                    }
                    paginationHTML += '</ul></nav>';
                    return paginationHTML;
                };

                const renderCardMarkup = (config) => {
                    const currentPage = pageState[config.key];
                    const rows = createTableRows(config.items, currentPage, config.isMap);
                    const paginationInner = createPaginationInner(config.items, currentPage, config.key);

                    return `
                        <div id="commonids-card-${config.key}" class="${config.key} card scroll-ani scroll-70">
                            <div class="table-responsive">
                                <table class="table caption-top">
                                    <div class="page-top-title">
                                        <img src="${config.icon}" height="${config.iconHeight}" width="${config.iconWidth}" />
                                        <h4>${config.title}</h4>
                                    </div>
                                    <thead>
                                        <tr>
                                            <th scope="col">Name</th>
                                            <th scope="col">ID</th>
                                        </tr>
                                    </thead>
                                    <tbody class="table-group-divider">
                                        ${rows}
                                    </tbody>
                                </table>
                                <div class="pagination-controls" id="${config.key}-pagination">${paginationInner}</div>
                            </div>
                        </div>
                    `;
                };

                const renderTables = async () => {
                    await withViewTransition(() => {
                        commonIdContent.innerHTML = sectionConfigs.map(renderCardMarkup).join('');

                        enhanceContainerImages(commonIdContent, {
                            fallbackSrc: 'assets/img/icon_quest.png'
                        });
                    }, commonIdsTransitionOptions);
                };

                const updateSectionPage = (sectionKey, direction) => {
                    const config = sectionMap[sectionKey];
                    if (!config) {
                        return;
                    }

                    const cardElement = document.getElementById(`commonids-card-${sectionKey}`);
                    if (!cardElement) {
                        return;
                    }

                    const transitionScope = cardElement.querySelector('.table-responsive table') || cardElement.querySelector('.table-responsive') || cardElement;

                    const currentPage = pageState[sectionKey];
                    withViewTransition(() => {
                        const table = cardElement.querySelector('table.caption-top');
                        const tbody = table?.querySelector('tbody.table-group-divider') || null;
                        if (tbody) {
                            tbody.innerHTML = createTableRows(config.items, currentPage, config.isMap);
                        }

                        const paginationContainer = cardElement.querySelector('.pagination-controls');
                        if (paginationContainer) {
                            paginationContainer.innerHTML = createPaginationInner(config.items, currentPage, sectionKey);
                        }
                    }, {
                        skipIfBusy: true,
                        scopeElement: transitionScope,
                        transitionName: `commonids-card-${direction}`,
                    });
                };

                let paginationDelegationBound = false;
                const bindPaginationDelegation = () => {
                    if (paginationDelegationBound) {
                        return;
                    }

                    paginationDelegationBound = true;
                    commonIdContent.addEventListener('click', (event) => {
                        const pageLink = event.target.closest('.pagination-controls .page-link');
                        if (!pageLink || !commonIdContent.contains(pageLink)) {
                            return;
                        }

                        event.preventDefault();

                        const sectionKey = pageLink.dataset.section;
                        const newPage = parseInt(pageLink.dataset.page, 10);
                        if (!sectionKey || Number.isNaN(newPage) || !pageState[sectionKey]) {
                            return;
                        }

                        const previousPage = pageState[sectionKey];
                        if (newPage === previousPage) {
                            return;
                        }

                        pageState[sectionKey] = newPage;
                        const direction = newPage > previousPage ? 'next' : 'prev';
                        updateSectionPage(sectionKey, direction);
                    });
                };

                bindPaginationDelegation();
                void renderTables();
            })
            .catch(error => {
                console.error('Error fetching common data:', error);
                withViewTransition(() => {
                    commonIdContent.innerHTML = 'Error fetching common data.';
                }, commonIdsTransitionOptions);
            })
            .finally(() => {
                setPageLoading(commonIdContent, false);
            });
    };

    fetchCommonData();
});
