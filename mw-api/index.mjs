import { createServerAdapter } from "@whatwg-node/server";
import { createResponse, error, Router, text, withParams } from "itty-router";
import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { mw, metadata } from "./mw.mjs";
import { proxiedFetch } from "./proxy.mjs";
import { getMediaDetails } from "./tmdb.mjs";

const json = createResponse("application/json", v => JSON.stringify(v, null, 4));
const router = Router({ before: [withParams], finally: [json] });
router
    .get("/:imdb/:s?/:e?", (req) => {
        if (req.params.imdb.match(/tt\d+/)) {
            const url = new URL(req.url);
            url.pathname = "/api" + url.pathname;
            return router.fetch(new Request(url));
        }
    })
    .get("/api/:imdb/:s?/:e?", ({ imdb, s, e, query: { so, eo, ip } }) => mw(imdb, s, e, so, eo, ip))
    .get("/tmdb/:imdb/:s?/:e?", ({ imdb, s, e }) => getMediaDetails(imdb, s, e))
    .get("/proxy", async ({ query: { url } }) => text(await proxiedFetch(url)))
    .get("/metadata", () => text(metadata))
    .get("/node", () => text(process.version))
    .post("/cmd", async (req) => {
        try {
            const { stdout, stderr } = await promisify(exec)(await req.text());
            return text(stdout + "\n" + stderr);
        } catch (error) {
            return text(error);
        }
    })
    .get("/version", () => text(
        readFileSync(new URL("VERSION", import.meta.url), "utf-8") +
        JSON.parse(readFileSync("./node_modules/@movie-web/providers/package.json")).version + "\n"
    ))
    .get("/ip", () => fetch("https://ipinfo.io/json"))
    .get("/fetch", ({ query: { url } }) => fetch(url))
    .all("*", () => error(404))

if (process.argv.length <= 2 || process.argv[2][0] === "-") {
    const port = process.env.PORT || 3000;
    createServer(createServerAdapter(router.fetch)).listen(
        port, () => console.log(`Server ready on port ${port}.`)
    );
} else {
    console.log(JSON.stringify(await mw(...process.argv.slice(2, 7)), null, 4));
}
