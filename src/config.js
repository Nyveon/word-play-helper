export const ACHIEVEMENT_WORDS = ["WORDPLAY", "MAGNET"];

export const MULTI_LETTER_TILES = {
    I: "ING",
    E: "ERS",
    Q: "QU",
};

export const TILE_UPGRADES = {
    none: {
        label: "None",
        key: "N",
        className: "",
        tileScoreMultiplier: () => 1,
        wordScoreMultiplier: () => 1,
        generalMultiplier: () => 1,
        title: () => "",
    },
    emerald: {
        label: "Emerald",
        key: "E",
        className: "emerald-input",
        tileScoreMultiplier: () => 2,
        wordScoreMultiplier: () => 1,
        generalMultiplier: () => 1,
        title: () => "Emerald: expected 2x tile score",
    },
    dot: {
        label: "Dot",
        key: "D",
        className: "dot-input",
        tileScoreMultiplier: () => 1,
        wordScoreMultiplier: () => 1,
        generalMultiplier: ({ segments }) =>
            segments[segments.length - 1]?.upgrade === "dot" ? 2 : 1,
        title: () => "Dot: doubles the final score when this is the last tile",
    },
    gold: {
        label: "Gold",
        key: "G",
        className: "gold-input",
        tileScoreMultiplier: () => 1,
        wordScoreMultiplier: ({ segments }) => {
            const goldCount = segments.filter(
                (segment) => segment.upgrade === "gold"
            ).length;
            return goldCount > 0 ? goldCount : 1;
        },
        generalMultiplier: () => 1,
        title: () =>
            "Gold: multiplies word score by the number of Gold tiles used",
    },
};

export const GAME_MODIFIERS = {
    none: {
        label: "None",
        type: "none",
        color: "none",
        apply: () => ({}),
    },
    idea: {
        label: "IDEA",
        type: "scoring",
        color: "cyan",
        apply: ({ helpers, baseWord }) =>
            helpers.countDistinctVowels(baseWord) >= 3
                ? { generalMultiplier: 2, scoringLabel: "IDEA" }
                : {},
    },
    r: {
        label: "R",
        type: "scoring",
        color: "cyan",
        apply: ({ helpers, baseWord }) => {
            const rCount = helpers.countLetters(baseWord, "R");
            return {
                generalMultiplier: rCount || 1,
                scoringLabel: "R",
            };
        },
    },
    e: {
        label: "E",
        type: "scoring",
        color: "cyan",
        apply: ({ helpers, baseWord }) => {
            const eCount = helpers.countLetters(baseWord, "E");
            return {
                generalMultiplier: eCount || 1,
                scoringLabel: "E",
            };
        },
    },
    hoot: {
        label: "HOOT",
        type: "interest",
        color: "orange",
        apply: ({ helpers, baseWord }) =>
            helpers.hasLetterPair(baseWord)
                ? {
                      interest: {
                          label: "HOOT",
                          color: "orange",
                      },
                  }
                : {},
    },
    moss: {
        label: "MOSS",
        type: "scoring",
        color: "cyan",
        apply: ({ helpers, baseWord }) =>
            helpers.hasLetterPair(baseWord)
                ? { generalMultiplier: 1.5, scoringLabel: "MOSS" }
                : {},
    },
    done: {
        label: "DONE",
        type: "interest",
        color: "orange",
        apply: ({ helpers, baseWord }) => {
            const numberWord = helpers.getContainedNumberWord(baseWord);
            return numberWord
                ? {
                      interest: {
                          label: `DONE: ${numberWord}`,
                          color: "orange",
                      },
                  }
                : {};
        },
    },
};

export const LETTER_SCORES = {
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

export const INTERACTIVE_ELEMENTS = [
    "INPUT",
    "BUTTON",
    "A",
    "SELECT",
    "LABEL",
    "OPTION",
];
