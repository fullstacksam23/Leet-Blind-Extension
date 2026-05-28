const sliders = [
    document.getElementById("easySlider"),
    document.getElementById("mediumSlider"),
    document.getElementById("hardSlider"),
];

const values = [
    document.getElementById("easyValue"),
    document.getElementById("mediumValue"),
    document.getElementById("hardValue"),
];

const extensionToggle = document.getElementById("extensionToggle");
const hideBtn         = document.getElementById("btn-hide");
const randomizeBtn    = document.getElementById("btn-randomize");
const saveBtn         = document.getElementById("saveBtn");

let currentMode = "hide";

// ── Enabled/disabled UI state ────────────────────────────────────────────────
function updateUI(enabled) {
    const isEnabled = enabled ?? extensionToggle.checked;

    // Mode buttons and save — fully disabled when extension is off
    [hideBtn, randomizeBtn, saveBtn].forEach(el => {
        el.style.opacity       = isEnabled ? "" : "0.4";
        el.style.pointerEvents = isEnabled ? "" : "none";
    });

    // Weight sliders — disabled when extension is off OR mode is hide
    const weightsDisabled = !isEnabled || currentMode === "hide";
    sliders.forEach(s => { s.disabled = weightsDisabled; });
    document.querySelectorAll(".slider-row").forEach(row => {
        row.style.opacity = weightsDisabled ? "0.45" : "1";
    });
}

// ── Mode ─────────────────────────────────────────────────────────────────────
function setMode(mode) {
    currentMode = mode;
    hideBtn.classList.toggle("active", mode === "hide");
    randomizeBtn.classList.toggle("active", mode === "randomize");
    updateUI();
}

// ── Slider totals ────────────────────────────────────────────────────────────
function updateValues() {
    const total = sliders.reduce((sum, s) => sum + Number(s.value), 0);
    values.forEach((v, i) => { v.textContent = `${sliders[i].value}%`; });
    document.getElementById("totalText").textContent = `${total}%`;
    document.getElementById("totalLine").classList.toggle("over", total !== 100);
}

// ── Slider clamping ──────────────────────────────────────────────────────────
sliders.forEach((slider, index) => {
    slider.addEventListener("input", () => {
        let total = sliders.reduce((sum, s) => sum + Number(s.value), 0);
        if (total > 100) {
            let excess = total - 100;
            sliders.forEach((s, i) => {
                if (i !== index && excess > 0) {
                    const reduction = Math.min(Number(s.value), excess);
                    s.value = Number(s.value) - reduction;
                    excess -= reduction;
                }
            });
        }
        updateValues();
    });
});

// ── Load saved settings ──────────────────────────────────────────────────────
chrome.storage.local.get(["mode", "weights", "enabled"], (data) => {
    const enabled = data.enabled ?? true;
    extensionToggle.checked = enabled;

    setMode(data.mode || "hide"); // sets currentMode before updateUI

    const weights = data.weights || [40, 40, 20];
    sliders.forEach((s, i) => { s.value = weights[i]; });
    updateValues();
    updateUI(enabled);
});

// ── Toggle ───────────────────────────────────────────────────────────────────
extensionToggle.addEventListener("change", () => {
    const enabled = extensionToggle.checked;
    updateUI(enabled);
    chrome.storage.local.set({ enabled });
});

// ── Mode buttons ─────────────────────────────────────────────────────────────
hideBtn.addEventListener("click",       () => setMode("hide"));
randomizeBtn.addEventListener("click",  () => setMode("randomize"));

// ── Save ─────────────────────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
    chrome.storage.local.set({
        mode:    currentMode,
        weights: sliders.map(s => Number(s.value)),
    });

    saveBtn.textContent = "Saved!";
    saveBtn.classList.add("saved");
    setTimeout(() => {
        saveBtn.textContent = "Save settings";
        saveBtn.classList.remove("saved");
    }, 1200);
});