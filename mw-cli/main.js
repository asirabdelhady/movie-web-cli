const axios = require("axios");
const inquirer = require("inquirer");
const MovieDB = require("node-themoviedb");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const clc = require("cli-color");
const { get } = require("http");

const tmdb = new MovieDB("89be02cb38d7d2d1f4322fd40d1504fa");

const prompt = inquirer
  .createPromptModule()
  .registerPrompt("suggest", require("inquirer-prompt-suggest"));

const projectDir = path.dirname(require.main.filename);

async function fetchMediaDetails(id, media_type) {
  try {
    const [details, externalIds] = await Promise.all([
      media_type === "tv"
        ? tmdb.tv.getDetails({ pathParameters: { tv_id: id } })
        : tmdb.movie.getDetails({ pathParameters: { movie_id: id } }),
      media_type === "tv"
        ? tmdb.tv.getExternalIDs({ pathParameters: { tv_id: id } })
        : tmdb.movie.getExternalIDs({ pathParameters: { movie_id: id } }),
    ]);

    return { details: details.data, imdbId: externalIds.data.imdb_id };
  } catch (error) {
    console.error(clc.red("Failed to fetch media details:"), error.message);
    throw error;
  }
}

async function printMediaInfo(media) {
  console.log();
  console.log(clc.bold("Media Info:"));
  console.log(clc.bold("Type:"), clc.red(media.type));
  console.log(clc.bold("Title:"), clc.green(media.title));
  console.log(clc.bold("Release Year:"), media.releaseYear);

  if (media.season) {
    console.log(clc.bold("Season:"), media.season.number);
  }
  if (media.episode) {
    console.log(clc.bold("Episode:"), media.episode.number);
    console.log(clc.bold("Episode Name:"), media.episode.name);
  }

  console.log();
}

async function downloadSubtitle(subtitleUrl) {
  const tempDir = path.join(projectDir, "vlc-subtitles");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const filename = subtitleUrl.split("/").pop();
  const tempFilePath = path.join(tempDir, filename);

  if (fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
    return tempFilePath;
  }

  try {
    const response = await axios.get(subtitleUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(tempFilePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => resolve(tempFilePath));
      writer.on("error", (err) => {
        console.error(clc.red("Failed to write subtitle file:"), err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error(clc.red("Failed to download subtitle:"), error.message);
    throw error;
  }
}

async function getVlcPathBasedOnOS() {
  const isWindows = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const isLinux = process.platform === "linux";

  if (isWindows) {
    return "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe";
  } else if (isMac) {
    return "/Applications/VLC.app/Contents/MacOS/VLC";
  } else if (isLinux) {
    return "vlc";
  } else {
    throw new Error("Unsupported operating system.");
  }
}

async function openInVLC(videoUrl, subtitleUrl = null) {
  let subtitlePath = null;
  let vlcPath = null;

  try {
    vlcPath = await getVlcPathBasedOnOS();
  } catch (error) {
    console.error(clc.red("Failed to get VLC path:"), error.message);
    return;
  }

  if (subtitleUrl) {
    try {
      subtitlePath = await downloadSubtitle(subtitleUrl);
    } catch (error) {
      console.error(clc.red("Failed to download subtitle:"), error.message);
      return;
    }
  }

  const command = subtitlePath
    ? `"${vlcPath}" "${videoUrl}" --sub-file="${subtitlePath}"`
    : `"${vlcPath}" "${videoUrl}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(clc.red(`Error opening VLC: ${error.message}`));
      return;
    }
    if (stderr) {
      console.error(clc.red(`VLC stderr: ${stderr}`));
      return;
    }
  });
}

// function to return the latest progress of serie season number and episode number
async function getTheNextSeasonAndEpisode(serie_id, progress) {
  serieProgress = Object.keys(progress).filter(
    (key) => progress[key].id == serie_id
  );

  if (serieProgress.length == 0) {
    return { season: 1, episode: 1 };
  }

  serieProgress = progress[serieProgress[0]];

  if (serieProgress.season) {
    return {
      season: serieProgress.season.number,
      episode: serieProgress.season.episode.number,
    };
  }

  return { season: 1, episode: 1 };
}

async function getTvSeasonsAndEpisodes(tmdb_id = null, progress) {
  try {
    const response = await tmdb.tv.getDetails({
      pathParameters: { tv_id: tmdb_id },
    });
    const seasons = response.data.seasons
      .filter((season) => season.season_number !== 0)
      .map((season) => ({
        name: `Season ${season.season_number}`,
        value: season.season_number,
      }));

    if (seasons.length === 0) {
      console.error(clc.red("No seasons found for this TV show."));
      return;
    }

    defaultSeason = 1;
    if (progress.season) {
      defaultSeason = progress.season;
    }

    const { season } = await prompt([
      {
        type: "list",
        name: "season",
        message: "Select season number (or type to select):",
        choices: seasons,
        default: defaultSeason,
        filter: (input) => parseInt(input),
      },
    ]);

    const seasonDetails = await tmdb.tv.season.getDetails({
      pathParameters: {
        tv_id: tmdb_id,
        season_number: season,
      },
    });

    const episodes = seasonDetails.data.episodes.map((episode) => ({
      name: `Episode ${episode.episode_number} - ${episode.name}`,
      value: episode.episode_number,
    }));

    if (episodes.length === 0) {
      console.error(clc.red("No episodes found for this season."));
      return;
    }

    // set current episode selected from progress
    // progress contains {season : number , episode : number}
    defaultEpisode = 1;
    if (progress.season && progress.episode) {
      defaultEpisode = progress.episode;
    }

    const { episode } = await prompt([
      {
        type: "list",
        name: "episode",
        message: "Select episode number (or type to select):",
        choices: episodes,
        default: defaultEpisode,
        filter: (input) => parseInt(input),
      },
    ]);

    return { season, episode };
  } catch (error) {
    console.error(
      clc.red("Failed to get TV seasons and episodes:"),
      error.message
    );
    throw error;
  }
}

async function searchTitle(suggestions) {
  try {
    const { title } = await prompt([
      {
        type: "suggest",
        name: "title",
        message: "Enter the title to search:",
        suggestions: suggestions,
      },
    ]);

    suggestProgressId = Object.keys(progress).filter(
      (key) => progress[key].title === title
    )[0];

    suggest = progress[suggestProgressId];

    const searchResults = await tmdb.search.multi({ query: { query: title } });
    const choices = searchResults.data.results
      .filter((result) => result.media_type !== "person") // Exclude persons (actors)
      .map((result) => ({
        name: `${result.title || result.name} (${
          result.release_date
            ? result.release_date.split("-")[0]
            : result.first_air_date
            ? result.first_air_date.split("-")[0]
            : "N/A"
        })`,
        value: result.id,
        media_type: result.media_type, // Include media type for later use
      }));

    if (choices.length === 0) {
      console.error(clc.red("No results found for the given title."));
      return;
    }

    const { selectedMovie } = await prompt([
      {
        type: "list",
        name: "selectedMovie",
        message: "Select a title:",
        choices,
      },
    ]);

    return searchResults.data.results.find(
      (movie) => movie.id === selectedMovie
    );
  } catch (error) {
    console.error(clc.red("Failed to search for title:"), error.message);
    throw error;
  }
}

async function getStreams(imdbId, season = null, episode = null) {
  const apiUrl =
    season && episode
      ? `http://localhost:8657/${imdbId}/${season}/${episode}`
      : `http://localhost:8657/${imdbId}`;

  try {
    const response = await axios.get(apiUrl);
    if (!response.data || !response.data.stream) {
      console.error(clc.red("No streams found for this content."));
      return { stream: { qualities: {}, captions: [] }, media: {} };
    }
    return {
      stream: response.data.stream,
      media: response.data.media,
    };
  } catch (error) {
    console.error(clc.red("Failed to get streams:"), error.message);
    throw error;
  }
}

async function selectStreamAndCaption(streams, captions) {
  try {
    if (!streams || Object.keys(streams).length === 0) {
      console.error(clc.red("No streams available."));
      return;
    }
    let choices = [];

    if (streams["720"]) {
      choices.push({
        name: `720 (${streams["720"].type})`,
        value: streams["720"].url,
      });
    }

    choices.push(
      ...Object.keys(streams)
        .filter((quality) => quality !== "720")
        .map((quality) => ({
          name: `${quality} (${streams[quality].type})`,
          value: streams[quality].url,
        }))
    );

    const { selectedStream } = await prompt([
      {
        type: "list",
        name: "selectedStream",
        message: "Select a stream:",
        choices,
      },
    ]);

    // Ensure captions is defined and is an array
    // Ensure captions is defined and is an array
    const filteredCaptions = Array.isArray(captions)
      ? captions.filter((caption) => caption.language === "ar")
      : [];

    if (filteredCaptions.length === 0) {
      console.error(clc.red("No captions available."));
      await openInVLC(selectedStream);
      return;
    }

    if (filteredCaptions.length === 1) {
      await openInVLC(selectedStream, filteredCaptions[0].url);
      return;
    }

    const { selectedCaption } = await prompt([
      {
        type: "list",
        name: "selectedCaption",
        message: "Select a caption:",
        choices: filteredCaptions.map((caption) => ({
          name: `${caption.language} (${caption.type}) ${
            caption.opensubtitles ? "opensubtitles" : ""
          }`,
          value: caption.url,
        })),
      },
    ]);

    await openInVLC(selectedStream, selectedCaption);
  } catch (error) {
    console.error(
      clc.red("Failed to select stream or caption:"),
      // trace
      error.stack
    );
  }
}

async function saveProgress(mediaInfo) {
  const filePath = path.join(projectDir, "progress.json");
  let progress = {};

  if (fs.existsSync(filePath)) {
    progress = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  timeNow = new Date();
  mediaInfo.time = timeNow.toISOString();
  progress[mediaInfo.id] = mediaInfo;

  fs.writeFileSync(filePath, JSON.stringify(progress, null, 2));
}

async function getProgress() {
  const filePath = path.join(projectDir, "progress.json");
  let progress = {};

  if (fs.existsSync(filePath)) {
    progress = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  progress = Object.fromEntries(
    Object.entries(progress).sort(([, a], [, b]) => {
      return new Date(b.time) - new Date(a.time);
    })
  );

  return progress;
}

async function showLatestProgress() {
  const progress = await getProgress();

  if (Object.keys(progress).length > 0) {
    console.log(clc.bold("Latest Progress:"));
  }

  // latest movies
  Object.keys(progress).forEach((key) => {
    const media = progress[key];
    console.log();

    const time = new Date(media.time);
    // time Y-m-d H:i:s
    time_string =
      time.toISOString().split("T")[0] +
      " " +
      time.toTimeString().split(" ")[0];
    title =
      clc.green(clc.underline(media.title)) + " (" + media.releaseYear + ")";
    if (media.season) {
      title += " - Season " + media.season.number;

      if (media.season.episode) {
        ep = media.season.episode;
        title += " Episode " + ep.number + (ep.name ? " - " + ep.name : "");
      }
    }

    console.log(clc.bold(clc.blue(time_string)), title);

    console.log();
  });
  return progress;
}

async function main() {
  progress = await showLatestProgress();
  try {
    const suggestions =
      Object.keys(progress).map((key) => progress[key].title) || [];
    const selectedMovie = await searchTitle(suggestions);
    if (!selectedMovie) return;

    const { details, imdbId } = await fetchMediaDetails(
      selectedMovie.id,
      selectedMovie.media_type
    );

    const mediaInfo = {
      id: selectedMovie.id,
      type: selectedMovie.media_type,
      title: details.title || details.name,
      releaseYear: details.release_date
        ? details.release_date.split("-")[0]
        : details.first_air_date
        ? details.first_air_date.split("-")[0]
        : "N/A",
    };

    if (selectedMovie.media_type === "tv") {
      const { season, episode } = await getTvSeasonsAndEpisodes(
        selectedMovie.id,
        await getTheNextSeasonAndEpisode(selectedMovie.id, progress)
      );
      mediaInfo.season = {
        number: season,
        episode: { number: episode, name: null },
      }; // Update with correct season and episode
    }

    await saveProgress(mediaInfo);
    await printMediaInfo(mediaInfo);

    const { stream, media } = await getStreams(
      imdbId,
      mediaInfo.season ? mediaInfo.season.number : null,
      mediaInfo.season ? mediaInfo.season.episode.number : null
    );

    await selectStreamAndCaption(stream.qualities, stream.captions);
  } catch (error) {
    console.error(clc.red("An error occurred:"), error.message);
  }
}

main();
