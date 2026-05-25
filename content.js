const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const SIDEBAR_DIFFICULTIES = ["Easy", "Med.", "Hard"];

let currentMode = "hide";
let currentWeights = [40, 40, 20];
let lastSeenURL = location.href;

// ── Hide difficulty immediately before paint ────────────────────────────────
const style = document.createElement("style");
style.id = "leet-blind-style";
style.textContent = `[class*="text-difficulty-"], .leet-blind-target { display: none !important; }`;
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
chrome.storage.local.get(["mode", "weights"], (data) => {
    if (data.mode)    currentMode    = data.mode;
    if (data.weights) currentWeights = data.weights;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.mode)    currentMode    = changes.mode.newValue;
    if (changes.weights) currentWeights = changes.weights.newValue;

    const diffElem = getDifficultyElement();
    if (diffElem) delete diffElem.dataset.leetBlindMode;

    tryApply();
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function getDifficultyElement() {
    // First try the already-tagged element (survives clearDifficultyClasses)
    return (
        document.querySelector('.leet-blind-target') ||
        document.querySelector('div[class*="text-difficulty-"]')
    );
}

function clearDifficultyClasses(diffElem) {
    diffElem.classList.remove(
        "text-difficulty-easy",   "dark:text-difficulty-easy",
        "text-difficulty-medium", "dark:text-difficulty-medium",
        "text-difficulty-hard",   "dark:text-difficulty-hard",
        "text-sd-easy", "text-sd-medium", "text-sd-hard" //for the sidebar elems
    );
}

function hideDifficulty(diffElem) {
    clearDifficultyClasses(diffElem);
    diffElem.textContent = "🙈";
}

function randomizeDifficulty(diffElem) {
    clearDifficultyClasses(diffElem);

    const randDiff  = weightedRandom(currentWeights);
    const diffClass = randDiff.toLowerCase();

    diffElem.textContent = randDiff;
    diffElem.classList.add(
        `text-difficulty-${diffClass}`,
        `dark:text-difficulty-${diffClass}`
    );
}
function applyToSidebarElements(){
    const elems = document.querySelectorAll('p.text-sd-medium, p.text-sd-easy, p.text-sd-hard, p.leet-blind-sidebar-target');
    elems.forEach(el => {
        // Skip if already applied for current mode
        if (el.dataset.leetBlindMode === currentMode) return;
 
        // Save original text before overwriting
        const rawText = el.textContent.trim();
        if (SIDEBAR_DIFFICULTIES.includes(rawText)) {
            el.dataset.leetBlindOriginal = rawText;
        }
        if (!el.dataset.leetBlindOriginal) return;
 
        el.classList.add("leet-blind-sidebar-target");
 
        if (currentMode === "hide") {
            hideDifficulty(el);
        } else {
            randomizeDifficulty(el);
        }
 
        el.dataset.leetBlindMode = currentMode;
    });
}
function applyToElement(diffElem) {
    // Stamp a stable marker so we can always find this element
    diffElem.classList.add("leet-blind-target");

    if (currentMode === "hide") {
        hideDifficulty(diffElem);
    } else {
        randomizeDifficulty(diffElem);
    }

    diffElem.dataset.leetBlindMode = currentMode;
}

// Source - https://stackoverflow.com/a/55671924
// Posted by rydwolf, modified by community.
// Retrieved 2026-05-24, License - CC BY-SA 4.0
function weightedRandom(weights) {
    const cumulative = [...weights];
    for (let i = 1; i < cumulative.length; i++) {
        cumulative[i] += cumulative[i - 1];
    }
    const rand = Math.random() * cumulative[cumulative.length - 1];
    return DIFFICULTIES[cumulative.findIndex(w => w > rand)];
}

// ── Main logic ──────────────────────────────────────────────────────────────
function tryApply() {
    applyToSidebarElements();

    const diffElem = getDifficultyElement();
    if (!diffElem) return;

    const rawText = diffElem.textContent.trim();

    if (DIFFICULTIES.includes(rawText)) {
        diffElem.dataset.leetBlindOriginal = rawText;
    }

    if (!diffElem.dataset.leetBlindOriginal) return;

    if (diffElem.dataset.leetBlindMode === currentMode) return;

    observer.disconnect();
    applyToElement(diffElem);
    revealDifficulty();
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ── SPA navigation detection ────────────────────────────────────────────────
function handleURLChange() {
    const url = location.href;
    if (url === lastSeenURL) return;
    lastSeenURL = url;

    // Clean up marker from old problem's element before React replaces it
    const old = document.querySelector('.leet-blind-target');
    if (old) old.classList.remove('leet-blind-target');

    hideRealDifficulty();
    tryApply();
}

function patchHistory(method) {
    const original = history[method];
    history[method] = function (...args) {
        original.apply(this, args);
        handleURLChange();
    };
}

patchHistory("pushState");
patchHistory("replaceState");
window.addEventListener("popstate", handleURLChange);

// ── Observe React DOM updates ───────────────────────────────────────────────
const observer = new MutationObserver(tryApply);

observer.observe(document.documentElement, {
    childList: true,
    subtree:   true,
});

// ── Initial run ─────────────────────────────────────────────────────────────
tryApply();
