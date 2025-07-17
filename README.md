# Word Play Helper

Assistant and solver for the game ["Word Play"](https://store.steampowered.com/app/3586660/Word_Play/) by Game Maker's Toolkit.

**Disclaimer**: This project is not affiliated nor endorsed by Game Maker's Toolkit! This is just a personal project for fun.

## Features

-   Input your current letter grid (including bonus tiles).
-   Find all possible words with your current letters, ordered by length.
-   Filter results by prefix, suffix, infix.

### Future Features

-   Fix: prevent space or other non-tile symbols from being written.
-   Allow for multi-letter tiles (`ing`, `qu`, etc.).
-   Allow for wildcard tiles.
-   Automatically remove tiles corresponding to selected word?
-   Trie for efficient word lookup (sorting by alphabetical).
    -   Ideally built offline
    -   Would be very cool if the results updated as you type.
-   Optimizer/solver (instead of just assistant/helper).
    -   Part 1: including score per tile and bonus scores for length.
    -   Part 2: include calculation using perks and such.
-   Have an idea for a new feature? Open an issue!

## Development

### Running & Hosting

Just a vanilla HTML/CSS/JS project. Locally you can use any simple server (i.e VSCode's Live Preview). It can be hosted on github pages or similar services.

-   `index.html` is the main file.
-   `script.js` is the main (client-side) script.
-   `style.css` is the main stylesheet.
-   `data/compress.ts` is the script that compresses the word list.

### Building

#### Installing dependencies

- Requirement: Node.js V22.6.0 or newer

```bash
npm install
```

#### Compressing the word list

The raw word list is 2MB, so we compress it using gzip for use in the browser.

1. Extract the word list from the game

2. Save to the `data` folder

3. Compress the word list by running:

```bash
npm run build
```

## Contributing

This is still very much a prototype, and I'm not sure what direction to take it. But if you have any ideas, feel free to leave an issue or a PR!
