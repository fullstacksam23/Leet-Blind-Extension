const sliders = [
  document.getElementById("easySlider"),
  document.getElementById("mediumSlider"),
  document.getElementById("hardSlider")
];

const values = [
  document.getElementById("easyValue"),
  document.getElementById("mediumValue"),
  document.getElementById("hardValue")
];

const hideBtn =
  document.getElementById("btn-hide");

const randomizeBtn =
  document.getElementById("btn-randomize");

let currentMode = "hide";

function setMode(mode) {

    currentMode = mode;

    hideBtn.classList.toggle(
        "active",
        mode === "hide"
    );

    randomizeBtn.classList.toggle(
        "active",
        mode === "randomize"
    );

    updateWeightSection();
}

hideBtn.addEventListener("click", () => {
    setMode("hide");
});

randomizeBtn.addEventListener("click", () => {
    setMode("randomize");
});

function updateValues() {

    const total =
        sliders.reduce(
            (sum, slider) =>
                sum + Number(slider.value),
            0
        );

    values[0].textContent =
        `${sliders[0].value}%`;

    values[1].textContent =
        `${sliders[1].value}%`;

    values[2].textContent =
        `${sliders[2].value}%`;

    const totalText =
        document.getElementById("totalText");

    totalText.textContent =
        `${total}%`;

    const totalLine =
        document.getElementById("totalLine");

    totalLine.classList.toggle(
        "over",
        total !== 100
    );
}

function updateWeightSection() {

    const disabled =
        currentMode === "hide";

    sliders.forEach(slider => {
        slider.disabled = disabled;
    });

    document
        .querySelectorAll(".slider-row")
        .forEach(container => {

            container.style.opacity =
                disabled ? "0.45" : "1";
        });
}

sliders.forEach((slider, index) => {

    slider.addEventListener(
        "input",
        () => {

            let total =
                sliders.reduce(
                    (sum, s) =>
                        sum + Number(s.value),
                    0
                );

            if (total > 100) {

                let excess =
                    total - 100;

                sliders.forEach(
                    (s, i) => {

                        if (
                            i !== index &&
                            excess > 0
                        ) {

                            let current =
                                Number(s.value);

                            let reduction =
                                Math.min(
                                    current,
                                    excess
                                );

                            s.value =
                                current - reduction;

                            excess -= reduction;
                        }
                    }
                );
            }

            updateValues();
        }
    );
});

chrome.storage.local.get(
    ["mode", "weights"],
    (data) => {

        const mode =
            data.mode || "hide";

        const weights =
            data.weights ||
            [40, 40, 20];

        setMode(mode);

        sliders[0].value =
            weights[0];

        sliders[1].value =
            weights[1];

        sliders[2].value =
            weights[2];

        updateValues();
    }
);

document
    .getElementById("saveBtn")
    .addEventListener(
        "click",
        () => {

            const weights =
                sliders.map(
                    s => Number(s.value)
                );

            chrome.storage.local.set({
                mode: currentMode,
                weights
            });

            const saveBtn =
                document.getElementById(
                    "saveBtn"
                );

            saveBtn.textContent =
                "Saved!";

            saveBtn.classList.add(
                "saved"
            );

            setTimeout(() => {

                saveBtn.textContent =
                    "Save settings";

                saveBtn.classList.remove(
                    "saved"
                );

            }, 1200);
        }
    );