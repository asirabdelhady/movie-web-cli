import {
    buildProviders,
    getBuiltinEmbeds,
    getBuiltinSources,
    makeProviders,
    makeStandardFetcher,
    targets
} from "@movie-web/providers";
import { proxiedFetch } from "./proxy.mjs";
import { getMediaDetails } from "./tmdb.mjs";

const defaultProviders = makeProviders({
    "fetcher": makeStandardFetcher(fetch),
    "target": targets.ANY,
    "consistentIpForRequests": true
});
export const metadata =
    defaultProviders.listSources().map(s => s.id).join(",") + "\n" +
    defaultProviders.listSources().map(s => s.rank.toString().padStart(s.id.length)).join(",") + "\n" +
    defaultProviders.listEmbeds().map(e => e.id).join(",") + "\n";

function _sort(input, builtin) {
    if (!input || !input.length)
        return builtin;
    input = input.split(",");
    let input_only = true;
    const plus = [], minus = [];
    for (const i of input) {
        if (i[0] === "+") {
            input_only = false;
            const index = builtin.indexOf(i.slice(1));
            if (index > -1) builtin.splice(index, 1);
            plus.push(i.slice(1));
        }
        if (i[0] === "-") {
            input_only = false;
            const index = builtin.indexOf(i.slice(i[1] !== "-" ? 1 : 2));
            if (index > -1) builtin.splice(index, 1);
            if (i[1] !== "-") minus.push(i.slice(1));
        }
    }
    return input_only ? input : [...plus, ...builtin, ...minus];
}

async function _fetch(url, ...args) {
    if (typeof url === 'string' && /^https:\/\/www\.braflix\.[a-z]+\/(movie|tv)\/\d+$/.test(url)) {
        return new Response(await proxiedFetch(url));
    }
    return fetch(url, ...args);
}

export async function mw(query, s = 1, e = 1, so = "", eo = "", ip = false) {
    let media = await getMediaDetails(query, s, e);
    media.type = media.type === "movie" ? "movie" : "show";
    let input = { "media": media };
    input.sourceOrder = _sort(so, defaultProviders.listSources().map(s => s.id));
    input.embedOrder = _sort(eo, defaultProviders.listEmbeds().map(e => e.id));

    let providers = buildProviders()
        .setFetcher(makeStandardFetcher(_fetch))
        .setTarget(targets.ANY)
    if (ip)
        providers.enableConsistentIpForRequests()
    for (const source of input.sourceOrder)
        providers.addSource(source)
    for (const embed of input.embedOrder)
        providers.addEmbed(embed)
    providers = providers.build();

    let output = await providers.runAll(input) || {};
    output.media = media;
    output.sources = input.sourceOrder.join(",");
    return output;
}
