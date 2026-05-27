class WordPlayHelper {
    constructor() {
        this.wordList = [];
        this.letterGrid = [];
        this.isLoading = false;
        this.currentResults = []; // Store current unfiltered results
        this.currentTiles = []; // Store current tiles used
        this.extraSlots = 0; // Track number of extra slots
        this.achievementWords = new Set(["WORDPLAY", "MAGNET"]);
        this.multiLetterTiles = {
            I: "ING",
            E: "ERS",
            Q: "QU",
        };
        this.letterScores = {
            A: 1,
            B: 3,
            C: 3,
            D: 2,
            E: 1,
            F: 4,
            G: 2,
            H: 4,
            I: 1,
            J: 8,
            K: 5,
            L: 1,
            M: 3,
            N: 1,
            O: 1,
            P: 3,
            Q: 10,
            R: 1,
            S: 1,
            T: 1,
            U: 1,
            V: 4,
            W: 4,
            X: 8,
            Y: 4,
            Z: 10,
        };

        // List of interactive elements to prevent focus hijacking
        this.interactiveElements = [
            "INPUT",
            "BUTTON",
            "A",
            "SELECT",
            "LABEL",
            "OPTION",
        ];

        this.initializeTheme();
        this.initializeSettings();
        this.initializeGrid();
        this.attachEventListeners();
        this.loadWordList();
    }

    initializeTheme() {
        // Check for saved theme preference or default to system preference
        const savedTheme = localStorage.getItem("theme");
        const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        if (savedTheme) {
            // Use saved preference
            this.setTheme(savedTheme);
        } else if (systemPrefersDark) {
            // Use system preference
            this.setTheme("dark");
        } else {
            this.setTheme("light");
        }

        // Update UI to reflect current theme
        this.updateThemeUI();
    }

    initializeSettings() {
        // Load settings from localStorage with defaults (all disabled/false)
        const defaultSettings = {
            showTileScore: false,
            showPositionScore: false,
            showCombinedScore: false,
        };

        const savedSettings = localStorage.getItem("scoreSettings");
        this.settings = savedSettings
            ? JSON.parse(savedSettings)
            : defaultSettings;

        // Apply settings to UI
        this.applySettings();
        this.updateSettingsUI();
    }

    applySettings() {
        // Remove all hide classes first
        document.body.classList.remove(
            "hide-tile-score",
            "hide-position-score",
            "hide-combined-score"
        );

        // Add hide classes based on settings
        if (!this.settings.showTileScore) {
            document.body.classList.add("hide-tile-score");
        }
        if (!this.settings.showPositionScore) {
            document.body.classList.add("hide-position-score");
        }
        if (!this.settings.showCombinedScore) {
            document.body.classList.add("hide-combined-score");
        }
    }

    updateSettingsUI() {
        // Update checkbox states to match current settings
        document.getElementById("showTileScore").checked =
            this.settings.showTileScore;
        document.getElementById("showPositionScore").checked =
            this.settings.showPositionScore;
        document.getElementById("showCombinedScore").checked =
            this.settings.showCombinedScore;
    }

    saveSettings() {
        // Save current settings to localStorage
        localStorage.setItem("scoreSettings", JSON.stringify(this.settings));
        this.applySettings();
    }

    toggleSettingsPanel() {
        const panel = document.getElementById("settingsPanel");
        if (panel.style.display === "none") {
            panel.style.display = "flex";
        } else {
            panel.style.display = "none";
        }
    }

    closeSettingsPanel() {
        document.getElementById("settingsPanel").style.display = "none";
    }

    setTheme(theme) {
        this.currentTheme = theme;
        if (theme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.setAttribute("data-theme", "light");
        }
    }

    updateThemeUI() {
        // Update radio button states to match current theme
        const lightRadio = document.getElementById("themeLight");
        const darkRadio = document.getElementById("themeDark");

        if (this.currentTheme === "dark") {
            darkRadio.checked = true;
        } else {
            lightRadio.checked = true;
        }
    }

    initializeGrid() {
        const gridContainer = document.getElementById("letterGrid");
        gridContainer.innerHTML = ""; // Clear existing content

        // Create 5x4 grid container
        const mainGrid = document.createElement("div");
        mainGrid.className = "letter-grid-5x4";
        mainGrid.id = "letterGrid5x4";

        // Create 5x4 grid (20 inputs total) with left-to-right, top-to-bottom indexing
        // Row 0: indices 0-4 (0=extra, 1-4=main)
        // Row 1: indices 5-9 (5=extra, 6-9=main)
        // Row 2: indices 10-14 (10=extra, 11-14=main)
        // Row 3: indices 15-19 (15=extra, 16-19=main)
        for (let i = 0; i < 20; i++) {
            const input = this.createLetterInput(i);

            // Determine if this is an extra slot (first column of each row)
            const isExtraSlot = i % 5 === 0;

            if (isExtraSlot) {
                input.classList.add("extra-slot");
            } else {
                input.classList.add("main-slot");
            }

            mainGrid.appendChild(input);
        }

        gridContainer.appendChild(mainGrid);

        // Initialize with current extra slots count
        this.updateExtraSlots();
    }

    createLetterInput(index) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "letter-input";
        input.maxLength = 3;
        input.dataset.index = index;

        // Add input event listener for auto-advance
        input.addEventListener("input", (e) => {
            this.normalizeLetterInput(e.target);
            this.updateInputTileClass(e.target);
            this.handleLetterInput(e);
        });

        // Add keyboard navigation
        input.addEventListener("keydown", (e) => {
            this.handleKeyNavigation(e);
        });

        return input;
    }

    normalizeLetterInput(input) {
        if (input.dataset.tileInput) {
            return;
        }

        const value = input.value.replace(/[^A-Za-z*!]/g, "");
        if (!value) {
            input.value = "";
            return;
        }

        input.value = value[value.length - 1].toUpperCase();
    }

    updateExtraSlots() {
        const gridContainer = document.getElementById("letterGrid5x4");

        // Show/hide inputs in the first column based on extra slots count
        // Extra slot indices: 0, 5, 10, 15 (first column of each row)
        const extraSlotIndices = [0, 5, 10, 15];

        for (let i = 0; i < 4; i++) {
            const input = document.querySelector(
                `[data-index="${extraSlotIndices[i]}"]`
            );
            if (input) {
                if (i < this.extraSlots) {
                    input.style.display = "block";
                    input.style.visibility = "visible";
                } else {
                    input.style.display = "none";
                    input.style.visibility = "hidden";
                    input.value = ""; // Clear value when hiding
                    this.updateInputTileClass(input);
                }
            }
        }

        // Update grid layout class based on extra slots
        if (this.extraSlots === 0) {
            gridContainer.classList.add("no-extra-slots");
            gridContainer.classList.remove("has-extra-slots");
        } else {
            gridContainer.classList.add("has-extra-slots");
            gridContainer.classList.remove("no-extra-slots");
        }
    }

    handleLetterInput(e) {
        const index = parseInt(e.target.dataset.index);
        const value = e.target.value;
        const totalInputs = 20;

        // Auto-advance to next input if letter is entered
        if (value && index < totalInputs - 1) {
            let nextIndex = index + 1;

            // Find the next visible input
            while (nextIndex < totalInputs) {
                const nextInput = document.querySelector(
                    `[data-index="${nextIndex}"]`
                );
                if (nextInput && nextInput.style.display !== "none") {
                    nextInput.focus();
                    break;
                }
                nextIndex++;
            }
        }
    }

    moveToNextVisibleInput(index) {
        const totalInputs = 20;
        if (index >= totalInputs - 1) return;

        let nextIndex = index + 1;
        while (nextIndex < totalInputs) {
            const nextInput = document.querySelector(
                `[data-index="${nextIndex}"]`
            );
            if (nextInput && nextInput.style.display !== "none") {
                nextInput.focus();
                break;
            }
            nextIndex++;
        }
    }

    setInputTile(input, tileInput) {
        const tileText = this.multiLetterTiles[tileInput] || tileInput;
        input.value = tileText;

        if (this.multiLetterTiles[tileInput]) {
            input.dataset.tileInput = tileInput;
        } else {
            delete input.dataset.tileInput;
        }

        this.updateInputTileClass(input);
    }

    handleSpecialTileKey(e) {
        if (
            e.ctrlKey ||
            e.altKey ||
            e.metaKey ||
            !e.shiftKey ||
            !this.multiLetterTiles[e.key]
        ) {
            return false;
        }

        e.preventDefault();
        this.setInputTile(e.target, e.key);
        this.moveToNextVisibleInput(parseInt(e.target.dataset.index));
        return true;
    }

    handleKeyNavigation(e) {
        if (this.handleSpecialTileKey(e)) {
            return;
        }

        const index = parseInt(e.target.dataset.index);
        const totalInputs = 20;
        let newIndex = index;

        // Calculate current row and column
        const row = Math.floor(index / 5);
        const col = index % 5;

        switch (e.key) {
            case "ArrowUp":
                if (row > 0) {
                    newIndex = index - 5;
                }
                break;
            case "ArrowDown":
                if (row < 3) {
                    newIndex = index + 5;
                }
                break;
            case "ArrowLeft":
                if (col > 0) {
                    newIndex = index - 1;
                }
                break;
            case "ArrowRight":
                if (col < 4) {
                    newIndex = index + 1;
                }
                break;
            case "Delete":
                e.preventDefault();
                e.target.value = "";
                delete e.target.dataset.tileInput;
                this.updateInputTileClass(e.target);
                return;
            case "Backspace":
                e.preventDefault(); // Prevent default browser action
                e.target.value = ""; // Clear the current input's value
                delete e.target.dataset.tileInput;
                this.updateInputTileClass(e.target);

                if (index > 0) {
                    // Find the previous visible input to focus
                    let prevIndex = index - 1;
                    while (prevIndex >= 0) {
                        const prevInput = document.querySelector(
                            `[data-index="${prevIndex}"]`
                        );
                        if (prevInput && prevInput.style.display !== "none") {
                            prevInput.focus();
                            break; // Exit loop once focus is moved
                        }
                        prevIndex--;
                    }
                }
                return;
            case "Enter":
                e.preventDefault();
                this.findWords();
                return;
            default:
                return;
        }

        // Ensure the target input is visible (not hidden by extra slots setting)
        if (newIndex !== index && newIndex >= 0 && newIndex < totalInputs) {
            const targetInput = document.querySelector(
                `[data-index="${newIndex}"]`
            );
            if (targetInput && targetInput.style.display !== "none") {
                e.preventDefault();
                targetInput.focus();
            }
        }
    }

    isInteractiveElement(element) {
        return (
            this.interactiveElements.includes(element.tagName) ||
            element.classList.contains("word") ||
            element.hasAttribute("aria-controls")
        );
    }

    getFirstVisibleEmptyInput() {
        const grid = document.querySelector("#letterGrid5x4");
        if (!grid) return null;

        const inputs = grid.querySelectorAll('input[type="text"]');
        for (const input of inputs) {
            const computedStyle = window.getComputedStyle(input);
            if (computedStyle.visibility !== "hidden" && input.value === "") {
                return input;
            }
        }
        return null;
    }

    handlePageClick(event) {
        // Allow text selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            return;
        }

        // Check if clicked element or any parent is interactive
        let element = event.target;
        while (element) {
            if (this.isInteractiveElement(element)) {
                return; // Don't focus if interactive element was clicked
            }
            element = element.parentElement;
        }

        // Focus the first visible empty input
        const firstInput = this.getFirstVisibleEmptyInput();
        if (firstInput) {
            firstInput.focus();
        }
    }

    handleGlobalKeyDown(event) {
        // Handle Escape key to clear the grid
        if (event.key === "Escape") {
            // Prevent clearing if user is typing in a filter input
            if (event.target.classList.contains("filter-input")) {
                return;
            }
            this.clearGrid();
        }
    }

    attachEventListeners() {
        // Settings panel toggle
        document
            .getElementById("settingsToggle")
            .addEventListener("click", () => {
                this.toggleSettingsPanel();
            });

        document
            .getElementById("closeSettings")
            .addEventListener("click", () => {
                this.closeSettingsPanel();
            });

        // Close settings panel when clicking outside
        document
            .getElementById("settingsPanel")
            .addEventListener("click", (e) => {
                if (e.target.id === "settingsPanel") {
                    this.closeSettingsPanel();
                }
            });

        // Theme radio buttons
        document
            .getElementById("themeLight")
            .addEventListener("change", (e) => {
                if (e.target.checked) {
                    this.setTheme("light");
                    localStorage.setItem("theme", "light");
                }
            });

        document.getElementById("themeDark").addEventListener("change", (e) => {
            if (e.target.checked) {
                this.setTheme("dark");
                localStorage.setItem("theme", "dark");
            }
        });

        // Settings checkboxes
        document
            .getElementById("showTileScore")
            .addEventListener("change", (e) => {
                this.settings.showTileScore = e.target.checked;
                this.saveSettings();
            });

        document
            .getElementById("showPositionScore")
            .addEventListener("change", (e) => {
                this.settings.showPositionScore = e.target.checked;
                this.saveSettings();
            });

        document
            .getElementById("showCombinedScore")
            .addEventListener("change", (e) => {
                this.settings.showCombinedScore = e.target.checked;
                this.saveSettings();
            });

        document.getElementById("findWords").addEventListener("click", () => {
            this.findWords();
        });

        document.getElementById("clearGrid").addEventListener("click", () => {
            this.clearGrid();
        });

        // Extra slots dropdown listener
        document
            .getElementById("extraSlots")
            .addEventListener("change", (e) => {
                this.extraSlots = parseInt(e.target.value);
                this.updateExtraSlots();
            });

        // Filter event listeners
        document
            .getElementById("startsWithFilter")
            .addEventListener("input", (e) => {
                e.target.value = e.target.value.toUpperCase();
                this.applyFilters();
            });

        document
            .getElementById("endsWithFilter")
            .addEventListener("input", (e) => {
                e.target.value = e.target.value.toUpperCase();
                this.applyFilters();
            });

        document
            .getElementById("containsFilter")
            .addEventListener("input", (e) => {
                e.target.value = e.target.value.toUpperCase();
                this.applyFilters();
            });

        document
            .getElementById("clearFilters")
            .addEventListener("click", () => {
                this.clearFilters();
            });

        document.addEventListener("click", this.handlePageClick.bind(this));
        document.addEventListener(
            "keydown",
            this.handleGlobalKeyDown.bind(this)
        );
    }

    async loadWordList() {
        try {
            // Load compressed word list
            const response = await fetch("data/wordsfull.txt.gz");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log(
                `Loaded compressed data: ${response.headers.get(
                    "content-length"
                )} bytes`
            );

            // Decompress using browser's built-in DecompressionStream
            const decompressedStream = response.body.pipeThrough(
                new DecompressionStream("gzip")
            );

            // Read the decompressed data as text
            const decompressedResponse = new Response(decompressedStream);
            const decompressed = await decompressedResponse.text();

            this.wordList = decompressed
                .split("\n")
                .map((word) => word.trim().toUpperCase())
                .filter((word) => word.length > 0);

            console.log(`Loaded ${this.wordList.length} words`);
        } catch (error) {
            console.error("Error loading word list:", error);
            this.showError(
                "Failed to load word list. Please refresh the page."
            );
        }
    }

    updateInputTileClass(input) {
        const value = input.value.toUpperCase();
        const tileInput = input.dataset.tileInput;
        const isMultiLetterTile =
            Boolean(tileInput && this.multiLetterTiles[tileInput]) ||
            Object.values(this.multiLetterTiles).includes(value);
        const isSuffixTile = value === "!";

        input.classList.toggle(
            "multi-letter-input",
            isMultiLetterTile
        );
        input.classList.toggle("suffix-input", isSuffixTile);
        input.title = isSuffixTile
            ? "! tile appends to the end of every word"
            : isMultiLetterTile
            ? `${tileInput || value} tile counts as ${value}`
            : "";
    }

    createTile(input, index) {
        const value = input.value.toUpperCase();
        if (!value) return null;

        if (value === "!") {
            return {
                input: value,
                text: value,
                letters: [],
                score: 0,
                index,
                isWildcard: false,
                isMultiLetter: false,
                isSuffix: true,
            };
        }

        const specialTileInput =
            input.dataset.tileInput ||
            Object.entries(this.multiLetterTiles).find(
                ([, tileText]) => tileText === value
            )?.[0];
        if (specialTileInput) {
            const tileText = this.multiLetterTiles[specialTileInput];
            return {
                input: specialTileInput,
                text: tileText,
                letters: [...tileText],
                score: this.letterScores[specialTileInput] || 0,
                index,
                isWildcard: false,
                isMultiLetter: true,
                isSuffix: false,
            };
        }

        if (value === "*") {
            return {
                input: value,
                text: value,
                letters: [],
                score: 0,
                index,
                isWildcard: true,
                isMultiLetter: false,
                isSuffix: false,
            };
        }

        return {
            input: value,
            text: value,
            letters: [value],
            score: this.letterScores[value] || 0,
            index,
            isWildcard: false,
            isMultiLetter: false,
            isSuffix: false,
        };
    }

    getGridTiles() {
        const inputs = document.querySelectorAll(".letter-input");
        return Array.from(inputs)
            .map((input, index) => this.createTile(input, index))
            .filter((tile) => tile);
    }

    clearGrid() {
        const inputs = document.querySelectorAll(".letter-input");
        inputs.forEach((input) => {
            input.value = "";
            delete input.dataset.tileInput;
            this.updateInputTileClass(input);
        });

        // Focus on the first visible input
        // With the new indexing, find the first input that's not hidden
        let firstInput = null;
        for (let i = 0; i < 20; i++) {
            const input = document.querySelector(`[data-index="${i}"]`);
            if (input && input.style.display !== "none") {
                firstInput = input;
                break;
            }
        }

        if (firstInput) {
            firstInput.focus();
        }

        this.clearResults();
    }

    clearResults() {
        const wordList = document.getElementById("wordList");
        const filtersSection = document.getElementById("filtersSection");
        const foundWordsHeader = document.getElementById("foundWordsHeader");
        const achievementResultsNote = document.getElementById(
            "achievementResultsNote"
        );

        wordList.innerHTML =
            '<p class="placeholder">Enter letters and click "Find Words" to see results</p>';
        filtersSection.style.display = "none";
        foundWordsHeader.innerHTML = "Found Words";
        achievementResultsNote.innerHTML = "";
        achievementResultsNote.style.display = "none";
        achievementResultsNote.classList.remove("has-achievement");

        // Clear stored results
        this.currentResults = [];
        this.currentTiles = [];

        // Clear filters
        this.clearFilters();
    }

    showLoading() {
        const loading = document.getElementById("loading");
        const findBtn = document.getElementById("findWords");

        loading.style.display = "flex";
        findBtn.disabled = true;
        this.isLoading = true;
    }

    hideLoading() {
        const loading = document.getElementById("loading");
        const findBtn = document.getElementById("findWords");

        loading.style.display = "none";
        findBtn.disabled = false;
        this.isLoading = false;
    }

    showError(message) {
        const wordList = document.getElementById("wordList");
        wordList.innerHTML = `<p class="placeholder" style="color: var(--error);">${message}</p>`;
    }

    passesLetterCountFilter(word, availableTiles) {
        const letterCount = {};
        let wildcardCount = 0;

        // Count expanded tile letters and one-character wildcards separately.
        for (const tile of availableTiles) {
            if (tile.isSuffix) {
                continue;
            } else if (tile.isWildcard) {
                wildcardCount++;
            } else {
                for (const letter of tile.letters) {
                    letterCount[letter] = (letterCount[letter] || 0) + 1;
                }
            }
        }

        for (let i = 0; i < word.length; i++) {
            const letter = word[i];
            if (letterCount[letter] > 0) {
                letterCount[letter]--;
            } else if (wildcardCount > 0) {
                wildcardCount--;
            } else {
                return false;
            }
        }

        return true;
    }

    canTileMatchAt(word, startIndex, tile) {
        if (tile.isWildcard) {
            return startIndex < word.length
                ? {
                      endIndex: startIndex + 1,
                      segment: {
                          text: word[startIndex],
                          type: "wildcard",
                      },
                  }
                : null;
        }

        if (word.startsWith(tile.text, startIndex)) {
            return {
                endIndex: startIndex + tile.text.length,
                segment: {
                    text: tile.text,
                    type: tile.isMultiLetter ? "multi" : "normal",
                },
            };
        }

        return null;
    }

    canFormWord(word, availableTiles) {
        if (!this.passesLetterCountFilter(word, availableTiles)) {
            return false;
        }

        const tiles = availableTiles.filter((tile) => !tile.isSuffix).sort((a, b) => {
            if (a.isWildcard !== b.isWildcard) {
                return a.isWildcard ? 1 : -1;
            }
            return b.text.length - a.text.length;
        });
        const usedTiles = new Array(tiles.length).fill(false);

        const search = (wordIndex, score, segments) => {
            if (wordIndex === word.length) {
                return { score, segments };
            }

            for (let i = 0; i < tiles.length; i++) {
                if (usedTiles[i]) continue;

                const match = this.canTileMatchAt(word, wordIndex, tiles[i]);
                if (!match) continue;

                usedTiles[i] = true;
                const result = search(
                    match.endIndex,
                    score + tiles[i].score,
                    [...segments, match.segment]
                );
                if (result) {
                    return result;
                }
                usedTiles[i] = false;
            }

            return false;
        };

        return search(0, 0, []);
    }

    getSuffixText(tiles) {
        return tiles
            .filter((tile) => tile.isSuffix)
            .map((tile) => tile.text)
            .join("");
    }

    createWordResult(baseWord, result, suffixText, isAchievementWord) {
        const word = `${baseWord}${suffixText}`;
        const segments = [...result.segments];
        if (suffixText) {
            segments.push({
                text: suffixText,
                type: "suffix",
            });
        }

        const tileScore = result.score;
        const positionScore = this.getPositionScore(word.length);
        const combinedScore = tileScore + positionScore;

        return {
            word,
            baseWord,
            tileScore,
            positionScore,
            combinedScore,
            segments,
            isAchievementWord,
        };
    }

    getPositionScore(length) {
        let totalPositionScore = 0;
        // Loop through each position in the word (1-indexed)
        for (let i = 1; i <= length; i++) {
            if (i >= 20) {
                totalPositionScore += 50;
            } else if (i === 19) {
                totalPositionScore += 40;
            } else if (i === 18) {
                totalPositionScore += 30;
            } else if (i >= 15) {
                totalPositionScore += 25;
            } else if (i >= 12) {
                totalPositionScore += 20;
            } else if (i >= 10) {
                totalPositionScore += 15;
            } else if (i >= 8) {
                totalPositionScore += 10;
            } else if (i >= 5) {
                totalPositionScore += 5;
            }
        }
        return totalPositionScore;
    }

    applyFilters() {
        if (this.currentResults.length === 0) return;

        const startsWithFilter = document
            .getElementById("startsWithFilter")
            .value.toUpperCase();
        const endsWithFilter = document
            .getElementById("endsWithFilter")
            .value.toUpperCase();
        const containsFilter = document
            .getElementById("containsFilter")
            .value.toUpperCase();

        let filteredWords = this.currentResults.filter((wordObj) => {
            let word = wordObj.word;
            if (startsWithFilter && !word.startsWith(startsWithFilter)) {
                return false;
            }
            if (endsWithFilter && !word.endsWith(endsWithFilter)) {
                return false;
            }
            if (containsFilter && !word.includes(containsFilter)) {
                return false;
            }
            return true;
        });

        this.displayFilteredResults(filteredWords);
    }

    clearFilters() {
        document.getElementById("startsWithFilter").value = "";
        document.getElementById("endsWithFilter").value = "";
        document.getElementById("containsFilter").value = "";

        if (this.currentResults.length > 0) {
            this.displayFilteredResults(this.currentResults);
        }
    }

    displayFilteredResults(words) {
        const wordList = document.getElementById("wordList");

        if (words.length === 0) {
            wordList.innerHTML =
                '<p class="placeholder">No words match the current filters.</p>';
            return;
        }

        const wordsByLength = words.reduce((acc, wordObj) => {
            const length = wordObj.word.length;
            if (!acc[length]) acc[length] = [];
            acc[length].push(wordObj);
            return acc;
        }, {});

        const lengths = Object.keys(wordsByLength)
            .map(Number)
            .sort((a, b) => b - a);
        let html = "";

        lengths.forEach((length) => {
            const wordsForLength = wordsByLength[length];
            html += `
                <div class="word-group">
                    <h3 class="word-group-header" data-length="${length}" role="button" tabindex="0" aria-expanded="true" aria-controls="words-${length}">
                        <span class="collapse-icon">▼</span>
                        ${length} letters
                        <span class="word-count">${wordsForLength.length}</span>
                    </h3>
                    <div class="words" data-words-for="${length}" id="words-${length}">
                        ${wordsForLength
                            .map((wordObj) => this.createWordHtml(wordObj))
                            .join("")}
                    </div>
                </div>`;
        });

        wordList.innerHTML = html;
        this.attachCollapseHandlers();
    }

    createWordHtml(wordObj) {
        const {
            word,
            tileScore,
            positionScore,
            combinedScore,
            segments,
            isHighScore,
            isAchievementWord,
        } = wordObj;
        const wordDisplay = this.createWordDisplay(word, segments);

        const classList = ["word"];
        if (isHighScore) {
            classList.push("highlight-score");
        }
        if (isAchievementWord) {
            classList.push("achievement-word");
        }

        return `
            <div class="${classList.join(" ")}" alt="${combinedScore}">
                <span class="word-score-tile">${tileScore}</span>
                <span class="word-text">${wordDisplay}</span>
                ${
                    isAchievementWord
                        ? '<span class="achievement-badge">Achievement</span>'
                        : ""
                }
                <span class="word-score-position">${positionScore}</span>
                <span class="word-score-combined">${combinedScore}</span>
            </div>
        `;
    }

    createWordDisplay(word, segments) {
        if (!segments || segments.length === 0) {
            return word;
        }

        return segments
            .map((segment) => {
                if (segment.type === "wildcard") {
                    return `<span class="wildcard-letter">${segment.text}</span>`;
                }
                if (segment.type === "multi") {
                    return `<span class="multi-letter-tile">${segment.text}</span>`;
                }
                if (segment.type === "suffix") {
                    return `<span class="suffix-letter">${segment.text}</span>`;
                }
                return segment.text;
            })
            .join("");
    }

    attachCollapseHandlers() {
        const headers = document.querySelectorAll(".word-group-header");
        headers.forEach((header) => {
            const toggleCollapse = () => {
                const length = header.dataset.length;
                const wordsContainer = document.querySelector(
                    `[data-words-for="${length}"]`
                );
                const icon = header.querySelector(".collapse-icon");

                if (wordsContainer.style.display === "none") {
                    // Expand
                    wordsContainer.style.display = "grid";
                    icon.textContent = "▼";
                    header.classList.remove("collapsed");
                    header.setAttribute("aria-expanded", "true");
                } else {
                    // Collapse
                    wordsContainer.style.display = "none";
                    icon.textContent = "▶";
                    header.classList.add("collapsed");
                    header.setAttribute("aria-expanded", "false");
                }
            };

            // Mouse click handler
            header.addEventListener("click", toggleCollapse);

            // Keyboard handler for accessibility
            header.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleCollapse();
                }
            });
        });
    }
    async findWords() {
        if (this.isLoading) return;

        const tiles = this.getGridTiles();
        if (tiles.length === 0) {
            this.showError("Please enter some letters first.");
            return;
        }
        if (this.wordList.length === 0) {
            this.showError(
                "Word list is still loading. Please wait and try again."
            );
            return;
        }

        this.showLoading();

        setTimeout(() => {
            try {
                const foundWords = [];
                const suffixText = this.getSuffixText(tiles);
                this.wordList.forEach((word) => {
                    if (word.length >= 4) {
                        const result = this.canFormWord(word, tiles);
                        if (result) {
                            foundWords.push(
                                this.createWordResult(
                                    word,
                                    result,
                                    suffixText,
                                    this.achievementWords.has(word)
                                )
                            );
                        }
                    }
                });

                this.achievementWords.forEach((word) => {
                    if (foundWords.some((wordObj) => wordObj.baseWord === word)) {
                        return;
                    }

                    const result = this.canFormWord(word, tiles);
                    if (result) {
                        foundWords.push(
                            this.createWordResult(
                                word,
                                result,
                                suffixText,
                                true
                            )
                        );
                    }
                });

                // Sort by length (desc), combined score (desc), then alphabetically
                foundWords.sort((a, b) => {
                    const lengthDiff = b.word.length - a.word.length;
                    if (lengthDiff !== 0) return lengthDiff;
                    const scoreDiff = b.combinedScore - a.combinedScore;
                    if (scoreDiff !== 0) return scoreDiff;
                    return a.word.localeCompare(b.word);
                });

                // Add high score highlighting based on combined score
                if (foundWords.length > 0) {
                    const maxLength = foundWords[0].word.length;
                    const maxScoreAtMaxLength = Math.max(
                        ...foundWords
                            .filter((w) => w.word.length === maxLength)
                            .map((w) => w.combinedScore)
                    );
                    foundWords.forEach((w) => {
                        if (
                            w.word.length < maxLength &&
                            w.combinedScore > maxScoreAtMaxLength
                        ) {
                            w.isHighScore = true;
                        }
                    });
                }

                this.displayResults(foundWords, tiles);
                this.hideLoading();
            } catch (error) {
                console.error("Error finding words:", error);
                this.showError("An error occurred while finding words.");
                this.hideLoading();
            }
        }, 100);
    }

    displayResults(words, tiles) {
        const wordList = document.getElementById("wordList");
        const filtersSection = document.getElementById("filtersSection");
        const foundWordsHeader = document.getElementById("foundWordsHeader");
        const achievementResultsNote = document.getElementById(
            "achievementResultsNote"
        );

        // Store current results for filtering
        this.currentResults = words;
        this.currentTiles = tiles;

        if (words.length === 0) {
            wordList.innerHTML =
                '<p class="placeholder">No words found with these letters.</p>';
            filtersSection.style.display = "none";
            foundWordsHeader.innerHTML = "Found Words";
            achievementResultsNote.innerHTML = "";
            achievementResultsNote.style.display = "none";
            achievementResultsNote.classList.remove("has-achievement");
            return;
        }

        // Show filters section when there are results
        filtersSection.style.display = "block";

        // Update header with word count chip
        const totalWords = words.length;
        foundWordsHeader.innerHTML = `Found Words <span class="word-count">${totalWords}</span>`;

        const achievementWordsFound = words
            .filter((wordObj) => wordObj.isAchievementWord)
            .map((wordObj) => wordObj.baseWord);
        if (achievementWordsFound.length > 0) {
            achievementResultsNote.innerHTML = `Achievement available: <strong>${achievementWordsFound.join(
                "</strong>, <strong>"
            )}</strong>`;
            achievementResultsNote.style.display = "block";
            achievementResultsNote.classList.add("has-achievement");
        } else {
            achievementResultsNote.innerHTML = "";
            achievementResultsNote.style.display = "none";
            achievementResultsNote.classList.remove("has-achievement");
        }

        // Apply existing filters if any, otherwise display all results
        this.applyFilters();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new WordPlayHelper();
});
