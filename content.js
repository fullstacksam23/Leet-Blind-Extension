const DIFFICULTIES = ["Easy", "Medium", "Hard"];

let currentMode = "hide";
let currentWeights = [40, 40, 20];
let lastSeenURL = location.href;
let currentProcessedElement = null;

// ── Hide difficulty immediately before paint ────────────────────────────────
const style = document.createElement("style");

style.id = "leet-blind-style";

style.textContent = `
  [class*="text-difficulty-"] {
    display: none !important;
  }
`;

document.documentElement.appendChild(style);

function hideRealDifficulty() {

    if (!document.getElementById("leet-blind-style")) {
        document.documentElement.appendChild(style);
    }
}

function revealDifficulty() {

    if (style.parentNode) {
        style.remove();
    }
}

// ── Load settings ───────────────────────────────────────────────────────────
chrome.storage.local.get(
    ["mode", "weights"],
    (data) => {

        if (data.mode) {
            currentMode = data.mode;
        }

        if (data.weights) {
            currentWeights = data.weights;
        }
    }
);

// Keep settings synced live
chrome.storage.onChanged.addListener(
    (changes) => {

        if (changes.mode) {
            currentMode =
                changes.mode.newValue;
        }

        if (changes.weights) {
            currentWeights =
                changes.weights.newValue;
        }

        // Reapply instantly if already on page
        currentProcessedElement = null;

        tryApply();
    }
);

// ── Helpers ─────────────────────────────────────────────────────────────────
function getDifficultyElement() {

    return document.querySelector(
        'div[class*="text-difficulty-"]'
    );
}

function clearDifficultyClasses(diffElem) {

    diffElem.classList.remove(
        "text-difficulty-easy",
        "dark:text-difficulty-easy",

        "text-difficulty-medium",
        "dark:text-difficulty-medium",

        "text-difficulty-hard",
        "dark:text-difficulty-hard"
    );
}

function hideDifficulty(diffElem) {

    clearDifficultyClasses(diffElem);

    diffElem.textContent = "🙈";
}

function randomizeDifficulty(diffElem) {

    clearDifficultyClasses(diffElem);

    const randDiff =
        weightedRandom(currentWeights);

    const diffClass =
        randDiff.toLowerCase();

    diffElem.textContent =
        randDiff;

    diffElem.classList.add(
        `text-difficulty-${diffClass}`,
        `dark:text-difficulty-${diffClass}`
    );
}

function applyToElement(diffElem) {

    if (currentMode === "hide") {

        hideDifficulty(diffElem);

    } else {

        randomizeDifficulty(diffElem);
    }

    diffElem.dataset.leetBlind =
        "true";
}

// Source - https://stackoverflow.com/a/55671924
// Posted by rydwolf, modified by community.
// Retrieved 2026-05-24, License - CC BY-SA 4.0

function weightedRandom(weights) {

    const cumulative = [...weights];

    for (
        let i = 1;
        i < cumulative.length;
        i++
    ) {
        cumulative[i] +=
            cumulative[i - 1];
    }

    const rand =
        Math.random() *
        cumulative[cumulative.length - 1];

    return DIFFICULTIES[
        cumulative.findIndex(
            w => w > rand
        )
    ];
}

// ── Main logic ──────────────────────────────────────────────────────────────
function tryApply() {

    const diffElem =
        getDifficultyElement();

    if (!diffElem) return;

    // Already handled
    if (
        diffElem ===
        currentProcessedElement
    ) {
        return;
    }

    const rawText =
        diffElem.textContent.trim();

    // Wait until React renders
    // actual difficulty text
    if (
        !DIFFICULTIES.includes(rawText)
    ) {
        return;
    }

    currentProcessedElement =
        diffElem;

    applyToElement(diffElem);

    revealDifficulty();
}

// ── SPA navigation detection ────────────────────────────────────────────────
function handleURLChange() {

    const url = location.href;

    if (url === lastSeenURL) {
        return;
    }

    lastSeenURL = url;

    currentProcessedElement = null;

    hideRealDifficulty();

    tryApply();
}

function patchHistory(method) {

    const original =
        history[method];

    history[method] =
        function (...args) {

            original.apply(this, args);

            handleURLChange();
        };
}

patchHistory("pushState");
patchHistory("replaceState");

window.addEventListener(
    "popstate",
    handleURLChange
);

// ── Observe React DOM updates ───────────────────────────────────────────────
const observer =
    new MutationObserver(() => {

        tryApply();
    });

observer.observe(
    document.documentElement,
    {
        childList: true,
        subtree: true
    }
);

// ── Initial run ─────────────────────────────────────────────────────────────
tryApply();