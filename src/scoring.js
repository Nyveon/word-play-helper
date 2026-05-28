const NUMBER_WORDS = [
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
    "TWENTY",
];

export function getTileScore(baseScore, upgrade, tileUpgrades) {
    return baseScore * tileUpgrades[upgrade].tileScoreMultiplier();
}

export function getPositionScore(length) {
    let totalPositionScore = 0;
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

export function calculateScoreBreakdown({
    activeGameModifiers,
    baseWord,
    gameModifiers,
    positionScore,
    segments,
    tileUpgrades,
    wordScore,
}) {
    const modifierResult = evaluateGameModifiers({
        activeGameModifiers,
        baseWord,
        gameModifiers,
    });
    const bonusScore = positionScore + modifierResult.bonusScore;
    const goldMultiplier = getGoldMultiplier(segments, tileUpgrades);
    const upgradeGeneralMultiplier = getUpgradeGeneralMultiplier(
        segments,
        tileUpgrades
    );
    const generalMultiplier =
        upgradeGeneralMultiplier * modifierResult.generalMultiplier;
    const finalScore =
        (goldMultiplier * wordScore + bonusScore) * generalMultiplier;

    return {
        wordScore,
        bonusScore,
        goldMultiplier,
        generalMultiplier,
        finalScore,
        scoringModifiers: modifierResult.scoringModifiers,
        interestModifiers: modifierResult.interestModifiers,
    };
}

export function getGoldMultiplier(segments, tileUpgrades) {
    return tileUpgrades.gold.wordScoreMultiplier({ segments });
}

export function getUpgradeGeneralMultiplier(segments, tileUpgrades) {
    return Object.values(tileUpgrades).reduce(
        (multiplier, upgrade) =>
            multiplier * upgrade.generalMultiplier({ segments }),
        1
    );
}

export function evaluateGameModifiers({
    activeGameModifiers,
    baseWord,
    gameModifiers,
}) {
    let bonusScore = 0;
    let generalMultiplier = 1;
    const scoringModifiers = [];
    const interestModifiers = [];
    const helpers = getModifierHelpers();

    activeGameModifiers
        .filter((modifier) => modifier !== "none")
        .forEach((modifierId) => {
            const modifier = gameModifiers[modifierId];
            if (!modifier?.apply) return;

            const result = modifier.apply({
                baseWord,
                helpers,
            });

            if (result.bonusScore) {
                bonusScore += result.bonusScore;
            }
            if (result.generalMultiplier !== undefined) {
                generalMultiplier *= result.generalMultiplier;
            }
            if (result.scoringLabel) {
                scoringModifiers.push(result.scoringLabel);
            }
            if (result.interest) {
                interestModifiers.push(result.interest);
            }
        });

    return {
        bonusScore,
        generalMultiplier,
        scoringModifiers,
        interestModifiers,
    };
}

function getModifierHelpers() {
    return {
        countDistinctVowels,
        countLetters,
        hasLetterPair,
        getContainedNumberWord,
    };
}

function countDistinctVowels(word) {
    const vowels = new Set();
    for (const letter of word) {
        if ("AEIOU".includes(letter)) {
            vowels.add(letter);
        }
    }
    return vowels.size;
}

function countLetters(word, letter) {
    return [...word].filter((char) => char === letter).length;
}

function hasLetterPair(word) {
    for (let i = 1; i < word.length; i++) {
        if (word[i] === word[i - 1]) {
            return true;
        }
    }
    return false;
}

function getContainedNumberWord(word) {
    return NUMBER_WORDS.find((numberWord) => word.includes(numberWord));
}
