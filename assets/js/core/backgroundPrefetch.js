import { fetchData } from "./cache.js";
import { DATA_URL, TASKS_URL, QUESTS_URL, GLOBALS } from "./localData.js";

const ASSORT_TRADER_IDS = [
    "54cb50c76803fa8b248b4571",
    "54cb57776803fa99248b456e",
    "579dc571d53a0658a154fbec",
    "58330581ace78e27b8b10cee",
    "5935c25fb3acc3127c3d8cd9",
    "5a7c2eca46aef81a7ca2145d",
    "5ac3b934156ae10c4430e83c",
    "5c0647fdd443bc2504c2d371",
    "638f541a29ffd1183d187f57",
    "656f0f98d80a697f855d34b1",
    "6617beeaa9cfa777ca915b7c",
    "6864e812f9fe664cb8b8e152",
];

const QUESTASSORT_MISSING_TRADER_IDS = new Set([
    "638f541a29ffd1183d187f57",
]);

function scheduleIdleWork(callback, timeout = 4000) {
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout });
        return;
    }

    setTimeout(callback, 1200);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmUrls(urls, delayMs = 120) {
    for (const url of urls) {
        try {
            await fetchData(url, { method: "GET" });
        } catch (error) {
            // Non-blocking by design: if one file fails, continue warming others.
            console.warn("Background prefetch failed for", url, error);
        }

        if (delayMs > 0) {
            await sleep(delayMs);
        }
    }
}

function isHomepageContext() {
    return Boolean(
        document.getElementById("mainSearch") &&
            document.getElementById("itemSearch")
    );
}

export function startHomepageBackgroundPrefetch() {
    if (!isHomepageContext()) {
        return;
    }

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection ||
        null;

    const isSaveData = Boolean(connection?.saveData);
    const isVerySlowConnection =
        typeof connection?.effectiveType === "string" &&
        connection.effectiveType.includes("2g");

    const coreUrls = [TASKS_URL, QUESTS_URL, DATA_URL, GLOBALS];
    const traderAssortUrls = ASSORT_TRADER_IDS.flatMap((traderId) => {
        const urls = [`data/traders/${traderId}/assort.json`];

        if (!QUESTASSORT_MISSING_TRADER_IDS.has(traderId)) {
            urls.push(`data/traders/${traderId}/questassort.json`);
        }

        return urls;
    });

    const coreDelay = isVerySlowConnection ? 280 : 120;
    const assortDelay = isVerySlowConnection ? 320 : 140;

    const startWarmup = () => {
        scheduleIdleWork(async () => {
            await warmUrls(coreUrls, coreDelay);

            if (isSaveData) {
                return;
            }

            scheduleIdleWork(() => {
                void warmUrls(traderAssortUrls, assortDelay);
            }, 8000);
        }, 6000);
    };

    if (document.readyState === "complete") {
        startWarmup();
        return;
    }

    window.addEventListener("load", startWarmup, { once: true });
}
