# BX Hexagon Miner Game

BX Hexagon Miner Game is a honey-themed hex Minesweeper built with plain HTML, CSS, and JavaScript. It takes the tension of classic Minesweeper, swaps the square field for a hexagonal hive, and wraps the whole experience in bees, honey bursts, leather scoreboards, fireworks, eggs, hatchlings, and a more playful presentation.

Live site:

[Play BX Hexagon Miner Game](https://radimbrixi.github.io/bx-hexagon-miner-game/)

## Overview

The game runs as a static browser app with no framework and no build step. Everything is in the repository as simple front-end files, so it is easy to open, edit, and deploy.

Core gameplay:

- Hexagonal board instead of square tiles
- Safe first click
- Right-click flagging
- Flood reveal for empty cells
- Hover highlighting to show the six neighboring hexes a number is counting
- Timer with tenths-of-a-second precision
- Mine counter and reset button

## Hive Modes

Preset hives:

- `Starter Hive` - `8 x 8`, calm opening board
- `Scout Comb` - `10 x 10`, warm-up challenge
- `Worker Nest` - `13 x 13`, balanced mid-level board
- `Queen Chamber` - `21 x 13`, wide advanced hive
- `Storm Swarm` - `29 x 13`, largest preset board

Custom hive:

- Size slider from `6 x 6` up to `24 x 24`
- Difficulty slider from `10%` to `32%`
- One shared leather board for all custom combinations

## Win And Loss Presentation

Victory sequence:

- Long firework celebration
- Mother bee arrives after the fireworks
- Eggs are laid into safe hexes
- Baby bees hatch one by one
- Hatchlings learn to fly, then spiral away off the page
- Sweet victory result window with close button and final time

Loss sequence:

- Honey-drop explosion across the screen
- Result window with your final time and replay option

## Leather Boards

The game stores best times in `localStorage`.

- Each preset hive has its own separate top-5 leather board
- Custom mode uses one shared top-5 leather board
- The leather board switches automatically when the player changes the selected hive

## Files

- [index.html](./index.html): page structure, meta tags, UI, and overlay markup
- [styles.css](./styles.css): theme, layout, board visuals, bees, fireworks, and animation styling
- [script.js](./script.js): game rules, timers, leaderboard logic, and all interactive effects
- [robots.txt](./robots.txt): crawler instructions
- [sitemap.xml](./sitemap.xml): sitemap for the published site
- [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml): GitHub Pages deployment workflow

## Run Locally

Open [index.html](./index.html) in a browser.

## Deploy

The site is deployed through GitHub Pages with GitHub Actions. Pushes to `main` publish the current static site.

Production URL:

[Play BX Hexagon Miner Game on GitHub Pages](https://radimbrixi.github.io/bx-hexagon-miner-game/)
