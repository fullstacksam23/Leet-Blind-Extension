const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const SIDEBAR_DIFFICULTIES = ["Easy", "Med.", "Hard"];

// Pages where difficulty elements can appear
const RELEVANT_PATHS = ["/problems/", "/problemset/"];

function isRelevantPage() {
    return RELEVANT_PATHS.some(p => location.pathname.startsWith(p));
}

let extensionEnabled = true;
let currentMode = "hide";
let currentWeights = [40, 40, 20];
let lastSeenURL = location.href;

// ── Hide difficulty immediately before paint ────────────────────────────────
const style = document.createElement("style");
style.id = "leet-blind-style";
style.textContent = `[class*="text-difficulty-"], .leet-blind-target { display: none !important; }`;
if (isRelevantPage()) document.documentElement.appendChild(style);

function hideRealDifficulty() {
    if (isRelevantPage() && !document.getElementById("leet-blind-style")) {
        document.documentElement.appendChild(style);
    }
}

function revealDifficulty() {
    if (style.parentNode) {
        style.remove();
    }
}

// ── Load settings ───────────────────────────────────────────────────────────
chrome.storage.local.get(["mode", "weights", "enabled"], (data) => {
    if (data.mode)    currentMode    = data.mode;
    if (data.weights) currentWeights = data.weights;
    extensionEnabled = data.enabled ?? true;

    if (extensionEnabled) {
        tryApply();
    } else {
        revealDifficulty(); // don't hide anything if disabled
    }
});

// ── Restore helpers ──────────────────────────────────────────────────────────
function restoreElement(el) {
    const original = el.dataset.leetBlindOriginal;
    if (!original) return;

    clearDifficultyClasses(el);
    el.textContent = original;

    const diffClass = original.toLowerCase();

    if (el.classList.contains("leet-blind-sidebar-target")) {
        el.classList.add(`text-sd-${diffClass}`);
    } else {
        el.classList.add(
            `text-difficulty-${diffClass}`,
            `dark:text-difficulty-${diffClass}`
        );
    }

    delete el.dataset.leetBlindMode;
}

function restoreAll() {
    revealDifficulty();
    document.querySelectorAll(".leet-blind-target, .leet-blind-sidebar-target")
        .forEach(restoreElement);
}

// ── Storage changes ──────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
        extensionEnabled = changes.enabled.newValue;
        if (!extensionEnabled) {
            restoreAll();
        } else {
            hideRealDifficulty();
            // Reset everything so tryApply re-applies fresh
            const diffElem = getDifficultyElement();
            if (diffElem) delete diffElem.dataset.leetBlindMode;
            document.querySelectorAll(".leet-blind-sidebar-target").forEach(el => {
                delete el.dataset.leetBlindMode;
            });
            tryApply();
        }
        return; // don't fall through
    }

    if (!extensionEnabled) return;

    if (changes.mode)    currentMode    = changes.mode.newValue;
    if (changes.weights) currentWeights = changes.weights.newValue;

    const diffElem = getDifficultyElement();
    if (diffElem) delete diffElem.dataset.leetBlindMode;

    document.querySelectorAll(".leet-blind-sidebar-target").forEach(el => {
        delete el.dataset.leetBlindMode;
    });

    tryApply();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDifficultyElement() {
    return (
        document.querySelector(".leet-blind-target") ||
        document.querySelector('div[class*="text-difficulty-"]')
    );
}

function clearDifficultyClasses(el) {
    el.classList.remove(
        "text-difficulty-easy",   "dark:text-difficulty-easy",
        "text-difficulty-medium", "dark:text-difficulty-medium",
        "text-difficulty-hard",   "dark:text-difficulty-hard",
        "text-sd-easy", "text-sd-medium", "text-sd-hard"
    );
}

function hideDifficulty(el) {
    clearDifficultyClasses(el);
    el.textContent = "🙈";
}

function randomizeDifficulty(el) {
    clearDifficultyClasses(el);
    const randDiff  = weightedRandom(currentWeights);
    const diffClass = randDiff.toLowerCase();
    el.textContent  = randDiff;
    el.classList.add(`text-difficulty-${diffClass}`, `dark:text-difficulty-${diffClass}`);
}

function randomizeDifficultySidebar(el) {
    clearDifficultyClasses(el);
    const randDiff  = weightedRandom(currentWeights);
    const diffClass = randDiff.toLowerCase();
    el.textContent  = randDiff;
    el.classList.add(`text-sd-${diffClass}`);
}

function applyToSidebarElements() {
    const elems = document.querySelectorAll(
        "p.text-sd-medium, p.text-sd-easy, p.text-sd-hard, p.leet-blind-sidebar-target"
    );
    elems.forEach(el => {
        if (el.dataset.leetBlindMode === currentMode) return;

        const rawText = el.textContent.trim();
        if (SIDEBAR_DIFFICULTIES.includes(rawText)) {
            el.dataset.leetBlindOriginal = rawText;
        }
        if (!el.dataset.leetBlindOriginal) return;

        el.classList.add("leet-blind-sidebar-target");

        if (currentMode === "hide") {
            hideDifficulty(el);
        } else {
            randomizeDifficultySidebar(el);
        }

        el.dataset.leetBlindMode = currentMode;
    });
}

function applyToElement(diffElem) {
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

// ── Main logic ───────────────────────────────────────────────────────────────
function tryApply() {
    if (!extensionEnabled || !isRelevantPage()) return;

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

// ── SPA navigation ───────────────────────────────────────────────────────────
function handleURLChange() {
    const url = location.href;
    if (url === lastSeenURL) return;
    lastSeenURL = url;

    const old = document.querySelector(".leet-blind-target");
    if (old) old.classList.remove(".leet-blind-target");

    if (!isRelevantPage()) {
        revealDifficulty(); // clean up if navigating away
        return;
    }

    if (extensionEnabled) hideRealDifficulty();
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

// ── Observer ─────────────────────────────────────────────────────────────────
const observer = new MutationObserver(tryApply);
observer.observe(document.documentElement, { childList: true, subtree: true });

// ── Boot ─────────────────────────────────────────────────────────────────────
tryApply();