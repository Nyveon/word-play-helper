import {
    ACHIEVEMENT_WORDS,
    GAME_MODIFIERS,
    INTERACTIVE_ELEMENTS,
    LETTER_SCORES,
    MULTI_LETTER_TILE_SCORES,
    MULTI_LETTER_TILES,
    TILE_UPGRADES,
} from "./src/config.js";
import { findWordResults } from "./src/search.js?v=scan-fast-1";
import { getTileScore as calculateTileScore } from "./src/scoring.js";
import {
    renderLengthGroupedResults,
    renderScoreSortedResults,
} from "./src/rendering.js?v=render-cap-1";

class WordPlayHelper {
    constructor() {
        this.wordList = [];
        this.letterGrid = [];
        this.isLoading = false;
        this.currentResults = []; // Store current unfiltered results
        this.currentTiles = []; // Store current tiles used
        this.resultViewMode = "length";
        this.activeGameModifiers = Array(6).fill("none");
        this.extraSlots = 0; // Track number of extra slots
        this.hoveredTileInput = null;
        this.pointerPosition = null;
        this.achievementWords = new Set(ACHIEVEMENT_WORDS);
        this.multiLetterTiles = MULTI_LETTER_TILES;
        this.multiLetterTileScores = MULTI_LETTER_TILE_SCORES;
        this.tileUpgrades = TILE_UPGRADES;
        this.gameModifiers = GAME_MODIFIERS;
        this.letterScores = LETTER_SCORES;
        this.interactiveElements = INTERACTIVE_ELEMENTS;

        this.initializeTheme();
        this.initializeSettings();
        this.initializeGrid();
        this.initializeUpgradeMenu();
        this.initializeGameModifierSlots();
        this.attachEventListeners();
        this.updateGameModifiers();
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
            showCombinedScore: false,
            showScoreBreakdown: false,
        };

        const savedSettings = localStorage.getItem("scoreSettings");
        this.settings = savedSettings
            ? { ...defaultSettings, ...JSON.parse(savedSettings) }
            : defaultSettings;

        // Apply settings to UI
        this.applySettings();
        this.updateSettingsUI();
    }

    applySettings() {
        // Remove all hide classes first
        document.body.classList.remove(
            "hide-combined-score",
            "hide-score-breakdown"
        );

        // Add hide classes based on settings
        if (!this.settings.showCombinedScore) {
            document.body.classList.add("hide-combined-score");
        }
        if (!this.settings.showScoreBreakdown) {
            document.body.classList.add("hide-score-breakdown");
        }
    }

    updateSettingsUI() {
        // Update checkbox states to match current settings
        document.getElementById("showCombinedScore").checked =
            this.settings.showCombinedScore;
        document.getElementById("showScoreBreakdown").checked =
            this.settings.showScoreBreakdown;
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
            mainGrid.appendChild(this.createUpgradeMarker(i));
            mainGrid.appendChild(this.createTileScoreMarker(i));
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

        input.addEventListener("contextmenu", (e) => {
            this.handleTileContextMenu(e);
        });

        input.addEventListener("mouseenter", () => {
            this.hoveredTileInput = input;
        });

        input.addEventListener("mouseleave", () => {
            if (this.hoveredTileInput === input) {
                this.hoveredTileInput = null;
            }
        });

        return input;
    }

    createUpgradeMarker(index) {
        const marker = document.createElement("span");
        marker.className = "tile-upgrade-marker";
        marker.dataset.index = index;
        marker.textContent = ".";
        return marker;
    }

    createTileScoreMarker(index) {
        const marker = document.createElement("span");
        marker.className = "tile-score-marker";
        marker.dataset.index = index;
        return marker;
    }

    normalizeLetterInput(input) {
        if (input.dataset.tileInput) {
            return;
        }

        const value = input.value.replace(/[^A-Za-z*!+]/g, "");
        if (!value) {
            input.value = "";
            this.clearTileUpgrade(input);
            return;
        }

        input.value = value[value.length - 1].toUpperCase();
    }

    initializeUpgradeMenu() {
        const menu = document.createElement("div");
        menu.id = "upgradeMenu";
        menu.className = "upgrade-menu";
        menu.style.display = "none";
        menu.innerHTML = Object.entries(this.tileUpgrades)
            .map(
                ([id, upgrade]) =>
                    `<button type="button" class="upgrade-menu-item" data-upgrade="${id}">${upgrade.label}</button>`
            )
            .join("");
        document.body.appendChild(menu);

        menu.addEventListener("click", (e) => {
            const button = e.target.closest("[data-upgrade]");
            if (!button) return;

            const input = this.getUpgradeMenuTarget();
            if (input) {
                this.setTileUpgrade(input, button.dataset.upgrade);
            }
            this.closeUpgradeMenu();
        });
    }

    handleTileContextMenu(e) {
        if (!e.target.value) {
            this.closeUpgradeMenu();
            return;
        }

        e.preventDefault();
        this.openUpgradeMenu(e.target, e.clientX, e.clientY);
    }

    openUpgradeMenu(input, x, y) {
        const menu = document.getElementById("upgradeMenu");
        menu.dataset.targetIndex = input.dataset.index;

        menu.querySelectorAll("[data-upgrade]").forEach((button) => {
            button.classList.toggle(
                "selected",
                button.dataset.upgrade === this.getTileUpgrade(input)
            );
        });

        menu.style.display = "block";

        const menuRect = menu.getBoundingClientRect();
        const left = Math.min(x, window.innerWidth - menuRect.width - 8);
        const top = Math.min(y, window.innerHeight - menuRect.height - 8);

        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${Math.max(8, top)}px`;
    }

    closeUpgradeMenu() {
        const menu = document.getElementById("upgradeMenu");
        if (menu) {
            menu.style.display = "none";
            delete menu.dataset.targetIndex;
        }
    }

    getUpgradeMenuTarget() {
        const menu = document.getElementById("upgradeMenu");
        if (!menu || !menu.dataset.targetIndex) return null;

        return document.querySelector(
            `[data-index="${menu.dataset.targetIndex}"]`
        );
    }

    getTileUpgrade(input) {
        return this.tileUpgrades[input.dataset.upgrade]
            ? input.dataset.upgrade
            : "none";
    }

    setTileUpgrade(input, upgrade) {
        if (!this.tileUpgrades[upgrade]) {
            upgrade = "none";
        }
        if (upgrade === "none") {
            delete input.dataset.upgrade;
        } else {
            input.dataset.upgrade = upgrade;
        }
        this.updateInputTileClass(input);
    }

    clearTileUpgrade(input) {
        delete input.dataset.upgrade;
        this.updateInputTileClass(input);
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
                this.clearTileUpgrade(e.target);
                this.updateInputTileClass(e.target);
                return;
            case "Backspace":
                e.preventDefault(); // Prevent default browser action
                e.target.value = ""; // Clear the current input's value
                delete e.target.dataset.tileInput;
                this.clearTileUpgrade(e.target);
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
        if (this.handleHoveredTileUpgradeKey(event)) {
            return;
        }

        // Handle Escape key to clear the grid
        if (event.key === "Escape") {
            if (document.getElementById("upgradeMenu")?.style.display === "block") {
                this.closeUpgradeMenu();
                return;
            }
            // Prevent clearing if user is typing in a filter input
            if (event.target.classList.contains("filter-input")) {
                return;
            }
            this.clearGrid();
        }
    }

    handleHoveredTileUpgradeKey(event) {
        if (
            event.ctrlKey ||
            event.altKey ||
            event.metaKey ||
            document.getElementById("upgradeMenu")?.style.display === "block"
        ) {
            return false;
        }

        const activeElement = document.activeElement;
        if (activeElement?.classList?.contains("letter-input")) {
            return false;
        }
        if (
            activeElement &&
            ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName)
        ) {
            return false;
        }

        const upgradeByKey = Object.fromEntries(
            Object.entries(this.tileUpgrades)
                .filter(([, upgrade]) => upgrade.key)
                .map(([id, upgrade]) => [upgrade.key, id])
        );
        const upgrade = upgradeByKey[event.key.toUpperCase()];
        const input = this.getHoveredUpgradeInput();
        if (!upgrade || !input?.value) {
            return false;
        }

        event.preventDefault();
        this.setTileUpgrade(input, upgrade);
        return true;
    }

    getHoveredUpgradeInput() {
        if (this.hoveredTileInput?.isConnected) {
            return this.hoveredTileInput;
        }

        const cssHoveredInput = document.querySelector(".letter-input:hover");
        if (cssHoveredInput) {
            return cssHoveredInput;
        }

        if (!this.pointerPosition) {
            return null;
        }

        return document
            .elementFromPoint(this.pointerPosition.x, this.pointerPosition.y)
            ?.closest?.(".letter-input");
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

        document.addEventListener("click", (e) => {
            if (!e.target.closest("#upgradeMenu")) {
                this.closeUpgradeMenu();
            }
        });

        document.addEventListener("mousemove", (e) => {
            this.pointerPosition = {
                x: e.clientX,
                y: e.clientY,
            };
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
            .getElementById("showCombinedScore")
            .addEventListener("change", (e) => {
                this.settings.showCombinedScore = e.target.checked;
                this.saveSettings();
            });

        document
            .getElementById("showScoreBreakdown")
            .addEventListener("change", (e) => {
                this.settings.showScoreBreakdown = e.target.checked;
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

        document
            .getElementById("resultViewToggle")
            .addEventListener("click", (e) => {
                const button = e.target.closest("[data-view-mode]");
                if (!button) return;

                this.setResultViewMode(button.dataset.viewMode);
            });

        document
            .getElementById("gameModifierSlots")
            .addEventListener("change", (e) => {
                if (!e.target.classList.contains("game-modifier-select")) {
                    return;
                }

                this.updateGameModifiers();
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
        const upgrade = this.getTileUpgrade(input);

        input.classList.toggle(
            "multi-letter-input",
            isMultiLetterTile
        );
        input.classList.toggle("suffix-input", isSuffixTile);
        Object.values(this.tileUpgrades).forEach((tileUpgrade) => {
            if (tileUpgrade.className) {
                input.classList.toggle(
                    tileUpgrade.className,
                    tileUpgrade.className === this.tileUpgrades[upgrade].className
                );
            }
        });
        const marker = document.querySelector(
            `.tile-upgrade-marker[data-index="${input.dataset.index}"]`
        );
        if (marker) {
            marker.classList.toggle("visible", upgrade === "dot");
        }

        this.updateTileScoreMarker(input);

        const tileTitle = isSuffixTile
            ? "! tile appends to every word and scores unsubmitted tiles"
            : isMultiLetterTile
            ? `${tileInput || value} tile counts as ${value}`
            : "";
        const upgradeTitle = this.tileUpgrades[upgrade].title();
        input.title = [tileTitle, upgradeTitle].filter(Boolean).join(" | ");
    }

    getTileScore(baseScore, upgrade) {
        return calculateTileScore(baseScore, upgrade, this.tileUpgrades);
    }

    updateTileScoreMarker(input) {
        const marker = document.querySelector(
            `.tile-score-marker[data-index="${input.dataset.index}"]`
        );
        if (!marker) return;

        const tile = this.createTile(input, Number(input.dataset.index));
        marker.textContent = tile
            ? tile.isSuffix
                ? "?"
                : tile.score
            : "";
        marker.title = tile?.isSuffix
            ? "! scores based on unsubmitted tiles for each result"
            : "Tile score";
        marker.classList.toggle("visible", Boolean(tile));
    }

    createTile(input, index) {
        const value = input.value.toUpperCase();
        if (!value) return null;
        const upgrade = this.getTileUpgrade(input);

        if (value === "!") {
            return {
                input: value,
                text: value,
                letters: [],
                score: this.getTileScore(0, upgrade),
                index,
                upgrade,
                isWildcard: false,
                isMultiLetter: false,
                isSuffix: true,
            };
        }

        if (value === "+") {
            return {
                input: value,
                text: value,
                letters: [],
                score: this.getTileScore(0, upgrade),
                index,
                upgrade,
                isWildcard: false,
                isMultiLetter: false,
                isSuffix: false,
                isPlus: true,
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
                score: this.getTileScore(
                    this.getMultiLetterTileBaseScore(
                        specialTileInput,
                        tileText
                    ),
                    upgrade
                ),
                index,
                upgrade,
                isWildcard: false,
                isMultiLetter: true,
                isSuffix: false,
                isPlus: false,
            };
        }

        if (value === "*") {
            return {
                input: value,
                text: value,
                letters: [],
                score: this.getTileScore(0, upgrade),
                index,
                upgrade,
                isWildcard: true,
                isMultiLetter: false,
                isSuffix: false,
                isPlus: false,
            };
        }

        return {
            input: value,
            text: value,
            letters: [value],
            score: this.getTileScore(this.letterScores[value] || 0, upgrade),
            index,
            upgrade,
            isWildcard: false,
            isMultiLetter: false,
            isSuffix: false,
            isPlus: false,
        };
    }

    getMultiLetterTileBaseScore(tileInput, tileText) {
        if (this.multiLetterTileScores[tileInput] !== undefined) {
            return this.multiLetterTileScores[tileInput];
        }

        return [...tileText].reduce(
            (score, letter) => score + (this.letterScores[letter] || 0),
            0
        );
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
            delete input.dataset.upgrade;
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
        const resultViewToggle = document.getElementById("resultViewToggle");
        const achievementResultsNote = document.getElementById(
            "achievementResultsNote"
        );

        wordList.innerHTML =
            '<p class="placeholder">Enter letters and click "Find Words" to see results</p>';
        filtersSection.style.display = "none";
        resultViewToggle.style.display = "none";
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
        this.updateLoadingProgress({
            phase: "Starting search",
            current: 0,
            total: this.wordList.length,
            found: 0,
        });
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

    updateLoadingProgress({ phase, current, total, found }) {
        const progress = document.getElementById("loadingProgress");
        if (!progress) return;

        if (current === undefined || total === undefined) {
            progress.textContent = phase;
            return;
        }

        const totalText = total ? total.toLocaleString() : "0";
        const currentText = Math.min(current ?? 0, total ?? 0).toLocaleString();
        const foundText =
            found !== undefined ? ` • ${found.toLocaleString()} found` : "";
        progress.textContent = `${phase}: ${currentText}/${totalText}${foundText}`;
    }

    showError(message) {
        const wordList = document.getElementById("wordList");
        wordList.innerHTML = `<p class="placeholder" style="color: var(--error);">${message}</p>`;
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

    initializeGameModifierSlots() {
        const slots = document.getElementById("gameModifierSlots");
        const optionsHtml = Object.entries(this.gameModifiers)
            .map(
                ([id, modifier]) =>
                    `<option value="${id}">${modifier.label}</option>`
            )
            .join("");

        slots.innerHTML = Array.from({ length: 6 }, (_, index) => {
            return `
                <select class="game-modifier-select" data-modifier-slot="${index}">
                    ${optionsHtml}
                </select>
            `;
        }).join("");
    }

    updateGameModifiers() {
        const selects = document.querySelectorAll(".game-modifier-select");
        this.activeGameModifiers = Array.from(selects).map((select) => {
            const value = this.gameModifiers[select.value]
                ? select.value
                : "none";
            select.value = value;
            select.dataset.modifierColor = this.gameModifiers[value].color;
            return value;
        });

        if (this.getGridTiles().length > 0 && this.currentResults.length > 0) {
            this.findWords();
        }
    }

    getActiveGameModifiers() {
        return this.activeGameModifiers.filter(
            (modifier) => modifier !== "none"
        );
    }

    setResultViewMode(viewMode) {
        if (!["length", "score"].includes(viewMode)) return;

        this.resultViewMode = viewMode;
        document
            .querySelectorAll("[data-view-mode]")
            .forEach((button) => {
                const isActive = button.dataset.viewMode === viewMode;
                button.classList.toggle("active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
            });

        this.applyFilters();
    }

    displayFilteredResults(words) {
        const wordList = document.getElementById("wordList");

        if (words.length === 0) {
            wordList.innerHTML =
                '<p class="placeholder">No words match the current filters.</p>';
            return;
        }

        if (this.resultViewMode === "score") {
            wordList.innerHTML = renderScoreSortedResults(words);
            return;
        }

        wordList.innerHTML = renderLengthGroupedResults(words);
        this.attachCollapseHandlers();
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

        setTimeout(async () => {
            try {
                const foundWords = await findWordResults({
                    achievementWords: this.achievementWords,
                    activeGameModifiers: this.activeGameModifiers,
                    gameModifiers: this.gameModifiers,
                    onProgress: (progress) =>
                        this.updateLoadingProgress(progress),
                    tiles,
                    tileUpgrades: this.tileUpgrades,
                    wordList: this.wordList,
                });
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
        const resultViewToggle = document.getElementById("resultViewToggle");
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
            resultViewToggle.style.display = "none";
            foundWordsHeader.innerHTML = "Found Words";
            achievementResultsNote.innerHTML = "";
            achievementResultsNote.style.display = "none";
            achievementResultsNote.classList.remove("has-achievement");
            return;
        }

        // Show filters section when there are results
        filtersSection.style.display = "block";
        resultViewToggle.style.display = "inline-flex";

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
