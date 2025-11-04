# Word Play Helper

Assistant and solver for the game ["Word Play"](https://store.steampowered.com/app/3586660/Word_Play/) by Game Maker's Toolkit. Steam guide [here](https://steamcommunity.com/sharedfiles/filedetails/?id=3527537715).

**Disclaimer**: This project is not affiliated nor endorsed by Game Maker's Toolkit! This is just a personal project for fun.

## Features

-   Input your current letter grid (including bonus tiles). A-Z and wildcards (`*`) are supported.
-   Find all possible words with your current letters, sorted by length and base score.
-   Filter results by prefix, suffix, infix.

Changelog: [CHANGELOG.md](CHANGELOG.md)

### Future Features

-   Unit tests (and some general code organization could be nice too)
-   Allow for multi-letter tiles (`ing`, `qu`, etc.).
-   Automatically remove tiles corresponding to selected word?
-   Trie for efficient word lookup (sorting by alphabetical).
    -   Ideally built offline
    -   Would be very cool if the results updated as you type.
-   Optimizer/solver (instead of just assistant/helper).
    -   ~Part 1: including score per tile and bonus scores for length.~
    -   Part 2: include calculation using perks and such.
-   Inputting tiles from a screenshot of the game board.
-   👀 Have an idea for a new feature? Open an issue!

## Development

### Running & Hosting

Just a vanilla HTML/CSS/JS project. Locally you can use any simple server (i.e VSCode's Live Preview). It can be hosted on github pages or similar services.

-   `index.html` is the main file.
-   `script.js` is the main (client-side) script.
-   `style.css` is the main stylesheet.
-   `scripts/compress.ts` is the script that compresses the word list.
-   `scripts/update-timestamp.ts` is the script that updates the timestamp in the page footer.

### Building

#### Installing dependencies

-   Requirement: Node.js V22.6.0 or newer

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

### Contributors

-   [@Nyveon](https://github.com/Nyveon) - Maintainer
-   [@tampueroc](https://github.com/tampueroc) - Timestamp updating & documentation
-   [@nateify](https://github.com/nateify) - Score calculations, wildcard underlines, and hotkeys.
-   And all the steam users who have given feedback!
