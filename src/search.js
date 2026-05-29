import {
    calculateScoreBreakdown,
    getPositionScore,
    getTileScore,
} from "./scoring.js";

const PLUS_PAIR_CHUNK_SIZE = 5000;
const PLUS_LENGTH_KEEP_LIMIT = 200;
const PLUS_SCORE_KEEP_LIMIT = 1000;

export async function findWordResults({
    achievementWords,
    activeGameModifiers,
    gameModifiers,
    onProgress = () => {},
    tiles,
    tileUpgrades,
    wordList,
}) {
    const baseCandidates = [];
    const foundWords = [];
    const suffixTiles = getSuffixTiles(tiles);
    const plusTile = tiles.find((tile) => tile.isPlus);
    const spellingOptions = getSpellingOptions(activeGameModifiers);

    onProgress({ phase: "Scanning words" });

    for (let index = 0; index < wordList.length; index++) {
        const word = wordList[index];
        if (word.length < 4) continue;

        const result = canFormWord(word, tiles, spellingOptions);
        if (result) {
            baseCandidates.push({
                baseWord: word,
                result,
                isAchievementWord: achievementWords.has(word),
            });
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

    }
    onProgress({
        phase: "Scanning words",
    });

    achievementWords.forEach((word) => {
        if (foundWords.some((wordObj) => wordObj.baseWord === word)) {
            return;
        }

        const result = canFormWord(word, tiles, spellingOptions);
        if (result) {
            baseCandidates.push({
                baseWord: word,
                result,
                isAchievementWord: true,
            });
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

    if (plusTile) {
        const plusResults = await createPlusWordResults({
            activeGameModifiers,
            allTiles: tiles,
            baseCandidates,
            gameModifiers,
            onProgress,
            plusTile,
            suffixTiles,
            tileUpgrades,
        });
        for (const result of plusResults) {
            foundWords.push(result);
        }
    }

    onProgress({
        phase: "Sorting results",
        current: foundWords.length,
        total: foundWords.length,
        found: foundWords.length,
    });
    await yieldToBrowser();

    return markHighScores(sortWordResults(foundWords));
}

export function passesLetterCountFilter(word, availableTiles, spellingOptions = {}) {
    const letterCount = {};
    let wildcardCount = 0;

    for (const tile of availableTiles) {
        if (tile.isSuffix || tile.isPlus) {
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
        } else if (
            spellingOptions.interchangeSAndZ &&
            isSOrZ(letter) &&
            letterCount[getAlternateSOrZ(letter)] > 0
        ) {
            letterCount[getAlternateSOrZ(letter)]--;
        } else if (wildcardCount > 0) {
            wildcardCount--;
        } else {
            return false;
        }
    }

    return true;
}

export function canTileMatchAt(word, startIndex, tile, spellingOptions = {}) {
    if (tile.isPlus) {
        return null;
    }

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

    const matchedText = getTileTextMatch(word, startIndex, tile.text, spellingOptions);
    if (matchedText) {
        const endIndex = startIndex + tile.text.length;
        return {
            endIndex,
            segment: {
                text: matchedText.text,
                spellingSubstitutions: matchedText.spellingSubstitutions,
                type: tile.isMultiLetter ? "multi" : "normal",
                upgrade: tile.upgrade,
                tileIndex: tile.index,
                score: tile.score,
            },
        };
    }

    return null;
}

export function canFormWord(word, availableTiles, spellingOptions = {}) {
    if (!passesLetterCountFilter(word, availableTiles, spellingOptions)) {
        return false;
    }

    const tiles = availableTiles
        .filter((tile) => !tile.isSuffix && !tile.isPlus)
        .sort((a, b) => {
            if (a.isWildcard !== b.isWildcard) {
                return a.isWildcard ? 1 : -1;
            }
            return b.text.length - a.text.length;
        });
    const usedTiles = new Array(tiles.length).fill(false);

    const search = (wordIndex, score, segments) => {
        if (wordIndex === word.length) {
            return {
                score,
                segments,
                usedMask: getUsedMask(segments),
            };
        }

        for (let i = 0; i < tiles.length; i++) {
            if (usedTiles[i]) continue;

            const match = canTileMatchAt(
                word,
                wordIndex,
                tiles[i],
                spellingOptions
            );
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
    return createResultFromSegments({
        activeGameModifiers,
        allTiles,
        baseWord,
        displayWord: `${baseWord}${suffixText}`,
        gameModifiers,
        isAchievementWord,
        segments: [...result.segments],
        suffixTiles,
        tileUpgrades,
    });
}

async function createPlusWordResults({
    activeGameModifiers,
    allTiles,
    baseCandidates,
    gameModifiers,
    onProgress,
    plusTile,
    suffixTiles,
    tileUpgrades,
}) {
    const topByLength = new Map();
    const topByScore = [];
    const seenDisplays = new Set();
    const totalPairs = (baseCandidates.length * (baseCandidates.length - 1)) / 2;
    let checkedPairs = 0;
    let generatedResults = 0;

    onProgress({
        phase: "Combining plus words",
        current: 0,
        total: totalPairs,
        found: generatedResults,
    });

    for (let i = 0; i < baseCandidates.length; i++) {
        for (let j = i + 1; j < baseCandidates.length; j++) {
            checkedPairs++;
            const orderedCandidates = orderPlusCandidates(
                baseCandidates[i],
                baseCandidates[j]
            );
            const [first, second] = orderedCandidates;
            if (!areTileSetsCompatible(first.result, second.result)) {
                continue;
            }

            const suffixText = suffixTiles.map((tile) => tile.text).join("");
            const displayWord = `${first.baseWord}+${second.baseWord}${suffixText}`;
            if (seenDisplays.has(displayWord)) {
                continue;
            }
            seenDisplays.add(displayWord);

            generatedResults++;
            const plusResult = createResultFromSegments({
                activeGameModifiers,
                allTiles,
                baseWord: `${first.baseWord}${second.baseWord}`,
                displayWord,
                gameModifiers,
                isAchievementWord: false,
                segments: [
                    ...first.result.segments,
                    createPlusSegment(plusTile),
                    ...second.result.segments,
                ],
                suffixTiles,
                tileUpgrades,
            });
            keepTopPlusResult({
                result: plusResult,
                topByLength,
                topByScore,
            });

            if (checkedPairs % PLUS_PAIR_CHUNK_SIZE === 0) {
                onProgress({
                    phase: "Combining plus words",
                    current: checkedPairs,
                    total: totalPairs,
                    found: generatedResults,
                });
                await yieldToBrowser();
            }
        }
    }

    const plusResults = mergeKeptPlusResults(topByLength, topByScore);
    onProgress({
        phase: "Combining plus words",
        current: totalPairs,
        total: totalPairs,
        found: plusResults.length,
    });

    return plusResults;
}

function keepTopPlusResult({ result, topByLength, topByScore }) {
    const lengthBucket = topByLength.get(result.tileLength) || [];
    addBoundedResult(lengthBucket, result, PLUS_LENGTH_KEEP_LIMIT);
    topByLength.set(result.tileLength, lengthBucket);

    addBoundedResult(topByScore, result, PLUS_SCORE_KEEP_LIMIT);
}

function addBoundedResult(bucket, result, limit) {
    if (bucket.length < limit) {
        bucket.push(result);
        bucket.sort(sortBestPlusResults);
        return;
    }

    const worstKeptResult = bucket[bucket.length - 1];
    if (sortBestPlusResults(result, worstKeptResult) < 0) {
        bucket[bucket.length - 1] = result;
        bucket.sort(sortBestPlusResults);
    }
}

function mergeKeptPlusResults(topByLength, topByScore) {
    const merged = new Map();
    topByScore.forEach((result) => {
        merged.set(result.word, result);
    });
    topByLength.forEach((bucket) => {
        bucket.forEach((result) => {
            merged.set(result.word, result);
        });
    });
    return [...merged.values()];
}

function sortBestPlusResults(a, b) {
    const scoreDiff = b.combinedScore - a.combinedScore;
    if (scoreDiff !== 0) return scoreDiff;
    const lengthDiff = b.tileLength - a.tileLength;
    if (lengthDiff !== 0) return lengthDiff;
    return a.word.localeCompare(b.word);
}

function getSpellingOptions(activeGameModifiers) {
    return {
        interchangeSAndZ: activeGameModifiers.includes("eyez"),
    };
}

function getTileTextMatch(word, startIndex, tileText, spellingOptions) {
    if (startIndex + tileText.length > word.length) {
        return null;
    }

    const spellingSubstitutions = [];
    for (let i = 0; i < tileText.length; i++) {
        const wordLetter = word[startIndex + i];
        const tileLetter = tileText[i];
        if (wordLetter === tileLetter) {
            continue;
        }
        if (
            spellingOptions.interchangeSAndZ &&
            isSOrZ(wordLetter) &&
            getAlternateSOrZ(wordLetter) === tileLetter
        ) {
            spellingSubstitutions.push(i);
            continue;
        }
        return null;
    }

    return {
        text: word.slice(startIndex, startIndex + tileText.length),
        spellingSubstitutions,
    };
}

function isSOrZ(letter) {
    return letter === "S" || letter === "Z";
}

function getAlternateSOrZ(letter) {
    return letter === "S" ? "Z" : "S";
}

function orderPlusCandidates(first, second) {
    const firstMinIndex = getMinimumTileIndex(first.result);
    const secondMinIndex = getMinimumTileIndex(second.result);
    if (firstMinIndex !== secondMinIndex) {
        return firstMinIndex < secondMinIndex ? [first, second] : [second, first];
    }

    return first.baseWord.localeCompare(second.baseWord) <= 0
        ? [first, second]
        : [second, first];
}

function getMinimumTileIndex(result) {
    return Math.min(...result.segments.map((segment) => segment.tileIndex));
}

function createResultFromSegments({
    activeGameModifiers,
    allTiles,
    baseWord,
    displayWord,
    gameModifiers,
    isAchievementWord,
    segments,
    suffixTiles,
    tileUpgrades,
}) {
    const submittedTileIndexes = new Set(
        [...segments, ...suffixTiles]
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

    const wordScore = segments.reduce(
        (total, segment) => total + (segment.score || 0),
        0
    );
    const positionScore = getPositionScore(segments.length);
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
        word: displayWord,
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
        tileLength: segments.length,
        usedMask: getUsedMask(segments),
    };
}

function createPlusSegment(tile) {
    return {
        text: tile.text,
        type: "plus",
        upgrade: tile.upgrade,
        tileIndex: tile.index,
        score: tile.score,
    };
}

function areTileSetsCompatible(firstResult, secondResult) {
    return (firstResult.usedMask & secondResult.usedMask) === 0;
}

function getUsedMask(segments) {
    return segments.reduce(
        (mask, segment) => mask | (1 << segment.tileIndex),
        0
    );
}

function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function sortWordResults(words) {
    return words.sort((a, b) => {
        const lengthDiff = b.tileLength - a.tileLength;
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

    const maxLength = words[0].tileLength;
    const maxScoreAtMaxLength = Math.max(
        ...words
            .filter((word) => word.tileLength === maxLength)
            .map((word) => word.combinedScore)
    );
    words.forEach((word) => {
        if (
            word.tileLength < maxLength &&
            word.combinedScore > maxScoreAtMaxLength
        ) {
            word.isHighScore = true;
        }
    });

    return words;
}
