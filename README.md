# BX Hexagon Miner Game

BX Hexagon Miner Game is a browser-based reimagining of classic Minesweeper, rebuilt around a warm honeycomb world of hexagonal cells, bees, honey bursts, leather scoreboards, and animated win sequences. It keeps the tension of the old puzzle game, but swaps rigid square grids for a more organic hive design and a much richer presentation.

The game is built entirely with vanilla `HTML`, `CSS`, and `JavaScript`. There are no frameworks, no build step, and no install process required to play or modify it.

## What It Includes

- Hexagonal honeycomb gameplay instead of square Minesweeper tiles
- Five preset hive sizes plus a custom mode
- Custom board size and difficulty sliders
- Safe first click, flagging, flood reveal, timer, and mine counter
- Hover guidance for hex-number adjacency
- Win fireworks, mother bee egg-laying, hatching bees, and loss honey splashes
- Leather-board best-time tracking with separate records per preset and one shared custom board
- Static-site deployment through GitHub Pages

## Play Online

Once GitHub Pages finishes deploying, the game is expected at:

`https://radimbrixi.github.io/bx-hexagon-miner-game/`

## Run Locally

Open [index.html](./index.html) in a browser.

## Project Files

- [index.html](./index.html): app structure, SEO meta tags, and UI markup
- [styles.css](./styles.css): visual design, board styling, overlays, animations, and responsive layout
- [script.js](./script.js): gameplay logic, timing, leaderboard handling, and animated effects
- [robots.txt](./robots.txt): crawler rules
- [sitemap.xml](./sitemap.xml): sitemap for indexing
- [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml): GitHub Pages deployment workflow

## Deployment

This repository includes a GitHub Actions workflow that deploys the static site to GitHub Pages on every push to `main`.

If GitHub Pages is not already configured for the repository:

1. Open the repository settings on GitHub.
2. Go to `Pages`.
3. Set the source to `GitHub Actions`.

After that, every push to `main` will publish the latest version automatically.

The production site is published through GitHub Pages at `https://radimbrixi.github.io/bx-hexagon-miner-game/`.
