export function renderScoreSortedResults(words) {
    const sortedWords = [...words].sort((a, b) => {
        const scoreDiff = b.combinedScore - a.combinedScore;
        if (scoreDiff !== 0) return scoreDiff;
        const lengthDiff = b.word.length - a.word.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.word.localeCompare(b.word);
    });

    return `
        <div class="words words-by-score">
            ${sortedWords.map((wordObj) => createWordHtml(wordObj)).join("")}
        </div>
    `;
}

export function renderLengthGroupedResults(words) {
    const wordsByLength = words.reduce((acc, wordObj) => {
        const length = wordObj.word.length;
        if (!acc[length]) acc[length] = [];
        acc[length].push(wordObj);
        return acc;
    }, {});

    const lengths = Object.keys(wordsByLength)
        .map(Number)
        .sort((a, b) => b - a);

    return lengths
        .map((length) => {
            const wordsForLength = wordsByLength[length];
            return `
                <div class="word-group">
                    <h3 class="word-group-header" data-length="${length}" role="button" tabindex="0" aria-expanded="true" aria-controls="words-${length}">
                        <span class="collapse-icon">▼</span>
                        ${length} letters
                        <span class="word-count">${wordsForLength.length}</span>
                    </h3>
                    <div class="words" data-words-for="${length}" id="words-${length}">
                        ${wordsForLength.map((wordObj) => createWordHtml(wordObj)).join("")}
                    </div>
                </div>`;
        })
        .join("");
}

export function createWordHtml(wordObj) {
    const {
        word,
        tileScore,
        positionScore,
        combinedScore,
        segments,
        isHighScore,
        isAchievementWord,
        interestModifiers,
    } = wordObj;
    const wordDisplay = createWordDisplay(word, segments);

    const classList = ["word"];
    if (isHighScore) {
        classList.push("highlight-score");
    }
    if (isAchievementWord) {
        classList.push("achievement-word");
    }
    if (interestModifiers && interestModifiers.length > 0) {
        classList.push("modifier-interest-word");
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
            ${createModifierBadges(interestModifiers)}
            <span class="word-score-position">${positionScore}</span>
            <span class="word-score-combined">${combinedScore}</span>
        </div>
    `;
}

function createModifierBadges(interestModifiers) {
    if (!interestModifiers || interestModifiers.length === 0) {
        return "";
    }

    return interestModifiers
        .map(
            (modifier) =>
                `<span class="modifier-badge modifier-badge-${modifier.color}">${modifier.label}</span>`
        )
        .join("");
}

function createWordDisplay(word, segments) {
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
