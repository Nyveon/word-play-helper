class WordPlayHelper {
    constructor() {
        this.wordList = [];
        this.letterGrid = [];
        this.isLoading = false;
        this.currentResults = []; // Store current unfiltered results
        this.currentLetters = []; // Store current letters used
        this.extraSlots = 0; // Track number of extra slots
        this.letterScores = {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10
        };

        this.initializeGrid();
        this.attachEventListeners();
        this.loadWordList();
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
        input.maxLength = 1;
        input.dataset.index = index;

        // Add input event listener for auto-advance
        input.addEventListener("input", (e) => {
            // Filter to only allow A-Z letters and asterisks (wildcards)
            e.target.value = e.target.value
                .replace(/[^A-Za-z*]/g, "")
                .toUpperCase();
            this.handleLetterInput(e);
        });

        // Add keyboard navigation
        input.addEventListener("keydown", (e) => {
            this.handleKeyNavigation(e);
        });

        return input;
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

    handleKeyNavigation(e) {
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
            case "Backspace":
                if (!e.target.value && index > 0) {
                    // Find the previous visible input
                    let prevIndex = index - 1;
                    while (prevIndex >= 0) {
                        const prevInput = document.querySelector(
                            `[data-index="${prevIndex}"]`
                        );
                        if (prevInput && prevInput.style.display !== "none") {
                            newIndex = prevIndex;
                            break;
                        }
                        prevIndex--;
                    }
                }
                break;
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

    attachEventListeners() {
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

    getGridLetters() {
        const inputs = document.querySelectorAll(".letter-input");
        return Array.from(inputs)
            .map((input) => input.value.toUpperCase())
            .filter((letter) => letter);
    }

    clearGrid() {
        const inputs = document.querySelectorAll(".letter-input");
        inputs.forEach((input) => (input.value = ""));

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

        wordList.innerHTML =
            '<p class="placeholder">Enter letters and click "Find Words" to see results</p>';
        filtersSection.style.display = "none";
        foundWordsHeader.innerHTML = "Found Words";

        // Clear stored results
        this.currentResults = [];
        this.currentLetters = [];

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

    canFormWord(word, availableLetters) {
        const letterCount = {};
        let wildcardCount = 0;

        // Count available letters and wildcards separately
        for (const letter of availableLetters) {
            if (letter === '*') {
                wildcardCount++;
            } else {
                letterCount[letter] = (letterCount[letter] || 0) + 1;
            }
        }

        let score = 0;
        const usedWildcardIndices = [];

        for (let i = 0; i < word.length; i++) {
            const letter = word[i];
            if (letterCount[letter] > 0) {
                letterCount[letter]--;
                score += this.letterScores[letter] || 0;
            } else if (wildcardCount > 0) {
                wildcardCount--;
                usedWildcardIndices.push(i);
                // Wildcards have a score of 0
            } else {
                return false;
            }
        }
        return { score, usedWildcardIndices };
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

        const lengths = Object.keys(wordsByLength).map(Number).sort((a, b) => b - a);
        let html = "";

        lengths.forEach(length => {
            const wordsForLength = wordsByLength[length];
            html += `
                <div class="word-group">
                    <h3 class="word-group-header" data-length="${length}" role="button" tabindex="0" aria-expanded="true" aria-controls="words-${length}">
                        <span class="collapse-icon">▼</span>
                        ${length} letters
                        <span class="word-count">${wordsForLength.length}</span>
                    </h3>
                    <div class="words" data-words-for="${length}" id="words-${length}">
                        ${wordsForLength.map(wordObj => this.createWordHtml(wordObj)).join("")}
                    </div>
                </div>`;
        });

        wordList.innerHTML = html;
        this.attachCollapseHandlers();
    }


    createWordHtml(wordObj) {
        const { word, tileScore, positionScore, combinedScore, usedWildcardIndices, isHighScore } = wordObj;
        let wordDisplay = '';

        if (usedWildcardIndices && usedWildcardIndices.length > 0) {
            wordDisplay += `<span class="wildcard-indicator">*</span>`;
            wordDisplay += [...word].map((char, index) =>
                usedWildcardIndices.includes(index) ? `<span class="wildcard-letter">${char}</span>` : char
            ).join('');
        } else {
            wordDisplay = word;
        }

        const classList = ['word'];
        if (isHighScore) {
            classList.push('highlight-score');
        }

        return `
            <div class="${classList.join(' ')}" alt="${combinedScore}">
                <span class="word-score-tile">${tileScore}</span>
                <span class="word-text">${wordDisplay}</span>
                <span class="word-score-position">${positionScore}</span>
                <span class="word-score-combined">${combinedScore}</span>
            </div>
        `;
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

        const letters = this.getGridLetters();
        if (letters.length === 0) {
            this.showError("Please enter some letters first.");
            return;
        }
        if (this.wordList.length === 0) {
            this.showError("Word list is still loading. Please wait and try again.");
            return;
        }

        this.showLoading();

        setTimeout(() => {
            try {
                const foundWords = [];
                this.wordList.forEach(word => {
                    if (word.length >= 4) {
                        const result = this.canFormWord(word, letters);
                        if (result) {
                            const tileScore = result.score;
                            const positionScore = this.getPositionScore(word.length);
                            const combinedScore = tileScore + positionScore;
                            foundWords.push({
                                word,
                                tileScore,
                                positionScore,
                                combinedScore,
                                usedWildcardIndices: result.usedWildcardIndices
                            });
                        }
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
                    const maxScoreAtMaxLength = Math.max(...foundWords.filter(w => w.word.length === maxLength).map(w => w.combinedScore));
                    foundWords.forEach(w => {
                        if (w.word.length < maxLength && w.combinedScore > maxScoreAtMaxLength) {
                            w.isHighScore = true;
                        }
                    });
                }

                this.displayResults(foundWords, letters);
                this.hideLoading();
            } catch (error) {
                console.error("Error finding words:", error);
                this.showError("An error occurred while finding words.");
                this.hideLoading();
            }
        }, 100);
    }

    displayResults(words, letters) {
        const wordList = document.getElementById("wordList");
        const filtersSection = document.getElementById("filtersSection");
        const foundWordsHeader = document.getElementById("foundWordsHeader");

        // Store current results for filtering
        this.currentResults = words;
        this.currentLetters = letters;

        if (words.length === 0) {
            wordList.innerHTML =
                '<p class="placeholder">No words found with these letters.</p>';
            filtersSection.style.display = "none";
            foundWordsHeader.innerHTML = "Found Words";
            return;
        }

        // Show filters section when there are results
        filtersSection.style.display = "block";

        // Update header with word count chip
        const totalWords = words.length;
        foundWordsHeader.innerHTML = `Found Words <span class="word-count">${totalWords}</span>`;

        // Apply existing filters if any, otherwise display all results
        this.applyFilters();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new WordPlayHelper();
});
