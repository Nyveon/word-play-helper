import {
    calculateScoreBreakdown,
    getPositionScore,
    getTileScore,
} from "./scoring.js";

export function findWordResults({
    achievementWords,
    activeGameModifiers,
    gameModifiers,
    tiles,
    tileUpgrades,
    wordList,
}) {
    const foundWords = [];
    const suffixTiles = getSuffixTiles(tiles);

    wordList.forEach((word) => {
        if (word.length < 4) return;

        const result = canFormWord(word, tiles);
        if (result) {
            foundWords.push(
                createWordResult({
                    activeGameModifiers,
                    allTiles: tiles,
                    baseWord: word,
                    gameModifiers,
                    isAchievementWord: achievementWords.has(word),
                    result,
                    suffixTiles,
                    tileUpgrades,
                })
            );
        }
    });

    achievementWords.forEach((word) => {
        if (foundWords.some((wordObj) => wordObj.baseWord === word)) {
            return;
        }

        const result = canFormWord(word, tiles);
        if (result) {
            foundWords.push(
                createWordResult({
                    activeGameModifiers,
                    allTiles: tiles,
                    baseWord: word,
                    gameModifiers,
                    isAchievementWord: true,
                    result,
                    suffixTiles,
                    tileUpgrades,
                })
            );
        }
    });

    return markHighScores(sortWordResults(foundWords));
}

export function passesLetterCountFilter(word, availableTiles) {
    const letterCount = {};
    let wildcardCount = 0;

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

export function canTileMatchAt(word, startIndex, tile) {
    if (tile.isWildcard) {
        return startIndex < word.length
            ? {
                  endIndex: startIndex + 1,
                  segment: {
                      text: word[startIndex],
                      type: "wildcard",
                      upgrade: tile.upgrade,
                      tileIndex: tile.index,
                      score: tile.score,
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
                upgrade: tile.upgrade,
                tileIndex: tile.index,
                score: tile.score,
            },
        };
    }

    return null;
}

export function canFormWord(word, availableTiles) {
    if (!passesLetterCountFilter(word, availableTiles)) {
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

            const match = canTileMatchAt(word, wordIndex, tiles[i]);
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

export function getSuffixTiles(tiles) {
    return tiles.filter((tile) => tile.isSuffix);
}

export function createWordResult({
    activeGameModifiers,
    allTiles,
    baseWord,
    gameModifiers,
    isAchievementWord,
    result,
    suffixTiles,
    tileUpgrades,
}) {
    const suffixText = suffixTiles.map((tile) => tile.text).join("");
    const word = `${baseWord}${suffixText}`;
    const segments = [...result.segments];
    const submittedTileIndexes = new Set(
        [...result.segments, ...suffixTiles]
            .map((tileOrSegment) => tileOrSegment.tileIndex ?? tileOrSegment.index)
            .filter((tileIndex) => tileIndex !== undefined)
    );
    const unsubmittedTileCount = allTiles.length - submittedTileIndexes.size;
    suffixTiles.forEach((tile) => {
        segments.push({
            text: tile.text,
            type: "suffix",
            upgrade: tile.upgrade,
            tileIndex: tile.index,
            score: getTileScore(unsubmittedTileCount, tile.upgrade, tileUpgrades),
        });
    });

    const suffixScore = suffixTiles.reduce(
        (total, tile) =>
            total + getTileScore(unsubmittedTileCount, tile.upgrade, tileUpgrades),
        0
    );
    const wordScore = result.score + suffixScore;
    const positionScore = getPositionScore(word.length);
    const scoreBreakdown = calculateScoreBreakdown({
        activeGameModifiers,
        baseWord,
        gameModifiers,
        segments,
        tileUpgrades,
        wordScore,
        positionScore,
    });

    return {
        word,
        baseWord,
        tileScore: scoreBreakdown.wordScore,
        wordScore: scoreBreakdown.wordScore,
        positionScore,
        bonusScore: scoreBreakdown.bonusScore,
        combinedScore: scoreBreakdown.finalScore,
        goldMultiplier: scoreBreakdown.goldMultiplier,
        generalMultiplier: scoreBreakdown.generalMultiplier,
        scoringModifiers: scoreBreakdown.scoringModifiers,
        interestModifiers: scoreBreakdown.interestModifiers,
        segments,
        isAchievementWord,
    };
}

function sortWordResults(words) {
    return words.sort((a, b) => {
        const lengthDiff = b.word.length - a.word.length;
        if (lengthDiff !== 0) return lengthDiff;
        const scoreDiff = b.combinedScore - a.combinedScore;
        if (scoreDiff !== 0) return scoreDiff;
        return a.word.localeCompare(b.word);
    });
}

function markHighScores(words) {
    if (words.length === 0) {
        return words;
    }

    const maxLength = words[0].word.length;
    const maxScoreAtMaxLength = Math.max(
        ...words
            .filter((word) => word.word.length === maxLength)
            .map((word) => word.combinedScore)
    );
    words.forEach((word) => {
        if (
            word.word.length < maxLength &&
            word.combinedScore > maxScoreAtMaxLength
        ) {
            word.isHighScore = true;
        }
    });

    return words;
}
