# Flappy Bird

A browser-based Flappy Bird clone with:
- smooth keyboard/mouse/touch controls
- scoring + best score persistence
- sound effects for flap, scoring, and collisions
- automatic GitHub Pages deployment via GitHub Actions

## Play locally

Just open `index.html` in your browser.

## Controls

- **Space** or **click/tap**: flap
- **R**: restart after game over

## Deployment (GitHub Actions + Pages)

This repository includes `.github/workflows/deploy.yml`.
On every push to `main`, GitHub Actions:
1. uploads the static game files as a Pages artifact
2. deploys them to GitHub Pages

To enable Pages in your repo settings:
1. Go to **Settings → Pages**
2. Set **Source** to **GitHub Actions**

After that, each successful run publishes the latest game.
