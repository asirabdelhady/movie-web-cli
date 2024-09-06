async function makeTmdbRequest(path) {
    const response = await fetch(`https://api.themoviedb.org/3/${path}`, {
        "headers": {
            "accept": "application/json",
            "authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4OWJlMDJjYjM4ZDdkMmQxZjQzMjJmZDQwZDE1MDRmYSIsIm5iZiI6MTcyMTgwNTI1Ny45NDE5OTEsInN1YiI6IjYzOWEwMjBjYTRhZjhmMDA5MWNkYjcxMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.oNW5ls2Zc0zNqDtDf7jNhRtvqmnlfsUiVcyHubsY1P8"
        }
    });
    return response.json();
}


function guessBestMatch(query, results) {
    const enResults = results.filter((result) => result.original_language === "en");
    const _equal = (a, b) => a.localeCompare(b, "en", { "sensitivity": "accent" });
    return enResults.find((result) => _equal(query, result.title) || _equal(query, result.name)) ||
        results.find((result) => _equal(query, result.title) || _equal(query, result.name)) ||
        results[0];
}

export async function getMediaDetails(query, seasonNumber, episodeNumber) {
    query = decodeURIComponent(query);
    let response, imdbId;
    if (query.match(/tt\d+/)) {
        response = await makeTmdbRequest(`find/${query}?external_source=imdb_id`);
        response = response.movie_results[0] || response.tv_results[0];
        imdbId = query;
    } else {
        response = await makeTmdbRequest(`search/multi?query=${query}`);
        response = guessBestMatch(query, response.results);
        const path = `${response.media_type}/${response.id}?append_to_response=external_ids`;
        imdbId = (await makeTmdbRequest(path)).external_ids.imdb_id;
    }

    if (response.media_type === "movie") {
        return {
            "type": "movie",
            "title": response.title,
            "releaseYear": Number(response.release_date.split("-")[0]),
            "tmdbId": response.id,
            "imdbId": imdbId
        };
    }

    if (response.media_type === "tv") {
        const path = `tv/${response.id}/season/${seasonNumber}/episode/${episodeNumber}`;
        return {
            "type": "tv",
            "title": response.name,
            "releaseYear": Number(response.first_air_date.split("-")[0]),
            "tmdbId": response.id,
            "imdbId": imdbId,
            "season": {
                "number": seasonNumber
            },
            "episode": {
                "number": episodeNumber,
                "name": (await makeTmdbRequest(path)).name
            }
        };
    }
}
