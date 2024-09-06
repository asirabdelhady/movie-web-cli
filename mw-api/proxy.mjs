import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { parse } from "node-html-parser";
import UserAgent from "user-agents";

//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function _proxiedFetch(url, proxyUrl) {
    const response = await fetch(url, {
        "agent": new HttpsProxyAgent(proxyUrl),
        "headers": {
            "user-agent": new UserAgent().toString()
        }
    });
    return response.status === 200 ? response.text() : Promise.reject("blocked");
    const html = await response.text();
    console.log(proxyUrl, html.substring(0, 150));
    if (response.status === 200 && !html.includes("__NEXT_DATA__")) {
        console.log("proxyUrl: ", proxyUrl);
        console.log("body: ", html);
        throw new Error("Failed proxy: " + proxyUrl);
    }
    return html.includes("__NEXT_DATA__") ? html : Promise.reject("blocked");
}

export async function proxiedFetch(url) {
    const response = await fetch("https://free-proxy-list.net");
    const html = await response.text();
    const rows = parse(html).querySelector("table").querySelectorAll("tbody tr");
    let proxyUrls = [], backupUrls = [];
    for (const row of rows) {
        const cols = row.querySelectorAll("td");
        const proxyUrl = `http://${cols[0].innerText}:${cols[1].innerText}`;
        if (cols[5].innerText === "yes" && cols[6].innerText === "yes") {
            proxyUrls.push(proxyUrl);
        } else if (cols[6].innerText === "yes") {
            backupUrls.push(proxyUrl);
        }
    }
    proxyUrls.push(...backupUrls.slice(0, 10 - proxyUrls.length));
    return Promise.any(proxyUrls.map(proxyUrl => _proxiedFetch(url, proxyUrl)));
}
