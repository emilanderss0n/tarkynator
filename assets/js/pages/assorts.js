import { fetchData } from '../core/cache.js';
import { ASSORT_URL } from '../core/localData.js';

// Utility to format item icons
const getItemIcon = (iconLink, name) =>
    iconLink ? `<img src="${iconLink}" alt="${name}" class="item-icon">` : '';

// Utility to format currency
const formatCurrency = (currency) => {
    switch (currency) {
        case 'RUB': return '₽';
        case 'USD': return '$';
        case 'EUR': return '€';
        default: return currency;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const assortContainer = document.getElementById('assortContainer');
    const assortContent = document.getElementById('assortContent');

    // Insert search input above assortContent
    const searchContainer = document.createElement('div');
    searchContainer.className = 'component-container search-container';
    searchContainer.innerHTML = `
        <input id="assortSearch" class="form-control" type="text" placeholder="Search barters or cash offers by name or ID...">
        <nav class="btn-group" id="loyaltyFilterBtns">
            <a class="btn sm active" href="javascript:void(0);" data-loyalty="all">All</a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="1">LL 1</a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="2">LL 2</a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="3">LL 3</a>
            <a class="btn sm" href="javascript:void(0);" data-loyalty="4">LL 4</a>
        </nav>
    `;
    assortContainer.insertBefore(searchContainer, assortContent);
    const assortSearch = document.getElementById('assortSearch');
    const loyaltyFilterBtns = document.getElementById('loyaltyFilterBtns');

    let currentSearchTerm = '';
    let currentLoyaltyFilter = 'all';

    const getActiveTraderId = () => {
        const activeTraderAssort = document.querySelector('#assortContainer .trader-nav .btn.active');
        return activeTraderAssort ? activeTraderAssort.getAttribute('data-trader-id') : null;
    };

    const filterAssorts = (barters, cashOffers, searchTerm, loyalty) => {
        let filteredBarters = barters;
        let filteredCashOffers = cashOffers;
        if (loyalty && loyalty !== 'all') {
            const lvl = parseInt(loyalty, 10);
            filteredBarters = filteredBarters.filter(b => (b.level ?? 1) === lvl);
            filteredCashOffers = filteredCashOffers.filter(o => (o.minTraderLevel ?? 1) === lvl);
        }
        if (!searchTerm) return { barters: filteredBarters, cashOffers: filteredCashOffers };
        const term = searchTerm.toLowerCase();
        const filterFn = (item) => {
            // For barters, check rewardItems and id
            if (item.rewardItems) {
                return (
                    item.id.toLowerCase().includes(term) ||
                    item.rewardItems.some(reward => reward.item.name.toLowerCase().includes(term) || reward.item.id.toLowerCase().includes(term))
                );
            }
            // For cashOffers, check item name and id
            if (item.item) {
                return (
                    item.item.name.toLowerCase().includes(term) ||
                    item.item.id.toLowerCase().includes(term)
                );
            }
            return false;
        };
        return {
            barters: filteredBarters.filter(filterFn),
            cashOffers: filteredCashOffers.filter(filterFn)
        };
    };

    const renderBarters = (barters) => {
        if (!barters || barters.length === 0) return '<div class="alert alert-secondary">No barter offers available</div>';
        // Sort by loyalty level (ascending, null/undefined last)
        barters = [...barters].sort((a, b) => {
            const la = a.level ?? 99;
            const lb = b.level ?? 99;
            return la - lb;
        });
        let html = '<div class="barters-list grid grid-400">';
        barters.forEach(barter => {
            html += `<div class="card barter-item"><div class="card-header">`;
            barter.rewardItems.forEach(reward => {
                html += `${getItemIcon(reward.item.iconLink, reward.item.name)}<h3>${reward.item.name}</h3>`;
            });
            html += '</div><div class="card-body"><span class="required-title">Required:</span> ';
            barter.requiredItems.forEach(req => {
                html += `<div class="req-item">${getItemIcon(req.item.iconLink, req.item.name)}${req.item.name} <span class="count">x${req.count}</span></div>`;
            });
            html += '</div><div class="card-footer">';
            if (barter.buyLimit) {
                html += `<div class="buy-limit">Buy Limit: ${barter.buyLimit}</div>`;
            }
            if (barter.level) {
                html += `<div class="tag" title="Loyalty Level">LL ${barter.level}</div>`;
            }
            if (barter.taskUnlock) {
                html += `<div class="quest-unlock" data-tooltip="Unlocked From Quest"><img src="assets/img/notification_icon_quest.png" width="36" height="34" /> ${barter.taskUnlock.name}</div>`;
            }
            html += '</div></div>';
        });
        html += '</div>';
        return html;
    };

    const renderCashOffers = (offers) => {
        if (!offers || offers.length === 0) return '<div class="alert alert-secondary">No cash offers available</div>';
        // Sort by minTraderLevel (ascending, null/undefined last)
        offers = [...offers].sort((a, b) => {
            const la = a.minTraderLevel ?? 99;
            const lb = b.minTraderLevel ?? 99;
            return la - lb;
        });
        let html = '<div class="cashoffers-list grid grid-400">';
        offers.forEach(offer => {
            html += `<div class="card cash-item">
                <div class="card-header">${getItemIcon(offer.item.iconLink, offer.item.name)}<h3>${offer.item.name}</h3></div>
                <div class="card-body">
                <div class="price">Price: <span>${offer.price}</span> ${formatCurrency(offer.currency)}</div>
                </div>
                <div class="card-footer">`;
            if (offer.buyLimit) {
                html += `<div class="buy-limit">Buy Limit: ${offer.buyLimit}</div>`;
            }
            if (offer.minTraderLevel) {
                html += `<div class="tag" data-tooltip="Loyalty Level">LL ${offer.minTraderLevel}</div>`;
            }
            if (offer.taskUnlock) {
                html += `<div class="quest-unlock" title="Unlocked From Quest"><img src="assets/img/notification_icon_quest.png" width="36" height="34" /> ${offer.taskUnlock.name}</div>`;
            }
            html += '</div></div>';
        });
        html += '</div>';
        return html;
    };

    const renderTraderAssort = (trader) => {
        if (!trader) {
            assortContent.innerHTML = '<div class="alert alert-secondary">No trader data found</div>';
            return;
        }
        const { barters, cashOffers } = filterAssorts(trader.barters, trader.cashOffers, currentSearchTerm, currentLoyaltyFilter);
        let html = '';
        html += renderBarters(barters);
        html += renderCashOffers(cashOffers);
        assortContent.innerHTML = html;
    };

    let tradersData = null;

    const loadAssortData = () => {
        fetchData(ASSORT_URL)
            .then(data => {
                if (data && data.traders) {
                    tradersData = data.traders;
                    showActiveTrader();
                } else {
                    assortContent.innerHTML = 'No assort data found.';
                }
            })
            .catch(error => {
                console.error('Error loading assort data:', error);
                assortContent.innerHTML = 'Error loading assort data.';
            });
    };

    const showActiveTrader = () => {
        const traderId = getActiveTraderId();
        if (!traderId || !tradersData) {
            assortContent.innerHTML = 'Select a trader.';
            return;
        }
        const trader = tradersData[traderId];
        renderTraderAssort(trader);
    };

    // Listen for trader nav changes
    assortContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-trader-id')) {
            document.querySelectorAll('#assortContainer .trader-nav .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showActiveTrader();
        }
    });

    // Debounce function for search input
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    // Setup search handler
    assortSearch.addEventListener('input', debounce(() => {
        currentSearchTerm = assortSearch.value.trim();
        showActiveTrader();
    }, 250));

    // Loyalty filter btn group handler
    loyaltyFilterBtns.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn && btn.hasAttribute('data-loyalty')) {
            loyaltyFilterBtns.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLoyaltyFilter = btn.getAttribute('data-loyalty');
            showActiveTrader();
        }
    });

    loadAssortData();
});