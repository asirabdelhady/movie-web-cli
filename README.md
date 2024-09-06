# 🎬 CLI Movie Watcher 📽️

Ever wanted to watch your favorite movies straight from your command line? Well, now you can! With **CLI Movie Watcher**, you can search for any movie or TV show, select the quality, pick subtitles, and stream it directly in VLC, all without leaving your terminal! 🚀

## 📝 Brief Overview

This project lets you search for and watch movies or TV shows right from your CLI. It uses VLC to stream the content and is powered by a Dockerized Node.js backend. Here's how it works:

1. 🎥 Run the app from your terminal.
2. 🔍 Search for a movie or TV show.
3. 📺 Choose your preferred video quality.
4. 📝 Select available subtitles.
5. 🎬 Watch the movie via VLC.

---

## ⚙️ Prerequisites

Before running the app, ensure you have the following installed:

- 🐳 **Docker**  
  [Install Docker](https://docs.docker.com/get-docker/)

- 📦 **Node.js**  
  [Install Node.js](https://nodejs.org/en/download/)

- 📀 **VLC Media Player**  
  [Install VLC](https://www.videolan.org/vlc/)

---

## 🚀 Getting Started

Follow these simple steps to get the app up and running:

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd mw-api
2. **Install dependencies for the backend (mw-api):**
    ```bash
    npm install
3. **Start Docker Continers**
    ```bash
    docker compose up -d
4. **Move to cli directory**
    ```bash
    cd ..
    cd mw-cli
5. **install dependencies for cli app**
    ```bash
    npm install
6. **Run the cli app**
    ```bash
    node main.js

## 🎬 How to Use

Once the app is running, you’ll be prompted to:

1. Enter a movie or TV show title 🎞️.
2. Choose your preferred video quality (480p, 720p, 1080p, etc.) 📺.
3. Select available subtitles 📝.

---

## ✨ Features

1. 🌐 Search for movies and TV shows.
2. 🎞️ Select video quality (480p, 720p, 1080p, etc.).
3. 📝 Choose subtitles.
4. 📀 Watch in VLC player automatically.

