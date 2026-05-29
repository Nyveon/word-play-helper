const SCORE_VIEW_LIMIT = 1000;
const LENGTH_GROUP_LIMIT = 200;

export function renderScoreSortedResults(words) {
    const sortedWords = [...words].sort((a, b) => {
        const scoreDiff = b.combinedScore - a.combinedScore;
        if (scoreDiff !== 0) return scoreDiff;
        const lengthDiff = b.tileLength - a.tileLength;
        if (lengthDiff !== 0) return lengthDiff;
        return a.word.localeCompare(b.word);
    });
    const visibleWords = sortedWords.slice(0, SCORE_VIEW_LIMIT);
    const hiddenCount = sortedWords.length - visibleWords.length;

    return `
        ${createRenderLimitNotice(hiddenCount)}
        <div class="words words-by-score">
            ${visibleWords
                .map((wordObj) =>
                    createWordHtml(wordObj, { showHighScore: false })
                )
                .join("")}
        </div>
    `;
}

export function renderLengthGroupedResults(words) {
    const wordsByLength = words.reduce((acc, wordObj) => {
        const length = wordObj.tileLength;
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
            const visibleWords = wordsForLength.slice(0, LENGTH_GROUP_LIMIT);
            const hiddenCount = wordsForLength.length - visibleWords.length;
            return `
                <div class="word-group">
                    <h3 class="word-group-header" data-length="${length}" role="button" tabindex="0" aria-expanded="true" aria-controls="words-${length}">
                        <span class="collapse-icon">▼</span>
                        ${length} letters
                        <span class="word-count">${wordsForLength.length}</span>
                    </h3>
                    <div class="words" data-words-for="${length}" id="words-${length}">
                        ${visibleWords
                            .map((wordObj) =>
                                createWordHtml(wordObj, {
                                    showHighScore: true,
                                })
                            )
                            .join("")}
                    </div>
                    ${createRenderLimitNotice(hiddenCount)}
                </div>`;
        })
        .join("");
}

function createRenderLimitNotice(hiddenCount) {
    if (hiddenCount <= 0) {
        return "";
    }

    return `<p class="render-limit-note">${hiddenCount.toLocaleString()} more results hidden to keep the page responsive.</p>`;
}

export function createWordHtml(wordObj, { showHighScore } = {}) {
    const {
        word,
        tileScore,
        bonusScore,
        combinedScore,
        goldMultiplier,
        generalMultiplier,
        segments,
        isHighScore,
        isAchievementWord,
        interestModifiers,
    } = wordObj;
    const wordDisplay = createWordDisplay(word, segments);

    const classList = ["word"];
    if (showHighScore && isHighScore) {
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
            <span class="word-text">${wordDisplay}</span>
            ${
                isAchievementWord
                    ? '<span class="achievement-badge">Achievement</span>'
                    : ""
            }
            ${createModifierBadges(interestModifiers)}
            <span class="word-score-combined">${combinedScore}</span>
            ${createScoreBreakdown({
                bonusScore,
                goldMultiplier,
                generalMultiplier,
                tileScore,
            })}
        </div>
    `;
}

function createScoreBreakdown({
    bonusScore,
    goldMultiplier,
    generalMultiplier,
    tileScore,
}) {
    return `
        <span class="score-breakdown" aria-label="Score breakdown">
            <span class="score-breakdown-item score-breakdown-tile" title="Tile points">${formatScorePart(tileScore)}</span>
            <span class="score-breakdown-item score-breakdown-bonus" title="Bonus points">+${formatScorePart(bonusScore)}</span>
            <span class="score-breakdown-item score-breakdown-gold" title="Gold multiplier">x${formatScorePart(goldMultiplier)}</span>
            <span class="score-breakdown-item score-breakdown-final" title="Final multiplier">x${formatScorePart(generalMultiplier)}</span>
        </span>
    `;
}

function formatScorePart(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
            if (segment.type === "plus") {
                return `<span class="plus-tile">${segment.text}</span>`;
            }
            return segment.text;
        })
        .join("");
}
