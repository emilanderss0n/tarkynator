import { fetchData } from "./cache.js";

const GRAPHQL_URL = "https://api.tarkov.dev/graphql";

export function fetchGraphQL(query) {
    return fetchData(GRAPHQL_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept-Encoding": "gzip",
        },
        body: JSON.stringify({ query }),
    });
}
