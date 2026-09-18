(() => {
  const ANALYZE_ENDPOINT = "/api/food/analyze";
  const recordComponentsEndpoint = (id) => `/api/food/records/${encodeURIComponent(id)}/components`;

  // Same six nutrients, same order, used for both the dish-level totals and
  // each component's own breakdown.
  const NUTRIENT_FIELDS = [
    { key: "calories_kcal", label: "Calories", shortLabel: "Cal", unit: "kcal" },
    { key: "protein_g", label: "Protein", shortLabel: "Protein", unit: "g" },
    { key: "carbs_g", label: "Carbs", shortLabel: "Carbs", unit: "g" },
    { key: "fat_g", label: "Fat", shortLabel: "Fat", unit: "g" },
    { key: "fibre_g", label: "Fibre", shortLabel: "Fibre", unit: "g" },
    { key: "sodium_mg", label: "Sodium", shortLabel: "Sodium", unit: "mg" },
  ];

  const views = {
    landing: document.getElementById("view-landing"),
    preview: document.getElementById("view-preview"),
    loading: document.getElementById("view-loading"),
    result: document.getElementById("view-result"),
    error: document.getElementById("view-error"),
  };

  const btnTakePhoto = document.getElementById("btn-take-photo");
  const btnUploadPhoto = document.getElementById("btn-upload-photo");
  const btnAnalyse = document.getElementById("btn-analyse");
  const btnPickDifferent = document.getElementById("btn-pick-different");
  const btnScanAnother = document.getElementById("btn-scan-another");
  const btnRetry = document.getElementById("btn-retry");
  const btnErrorReset = document.getElementById("btn-error-reset");

  const fileInputCamera = document.getElementById("file-input-camera");
  const fileInputUpload = document.getElementById("file-input-upload");

  const previewImage = document.getElementById("preview-image");
  const loadingImage = document.getElementById("loading-image");
  const resultImage = document.getElementById("result-image");
  const errorImage = document.getElementById("error-image");
  const errorMessage = document.getElementById("error-message");

  let selectedFile = null;
  let previewObjectUrl = null;
  let currentRecordId = null;
  let currentComponents = [];
  let currentComponentModes = [];
  let newComponentMode = "unit";
  let isAddFormOpen = false;
  let addSectionEl = null;
  let saveStatusTimeout = null;

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
  }

  function setPreviewImages(url) {
    previewImage.src = url;
    loadingImage.src = url;
    resultImage.src = url;
    errorImage.src = url;
  }

  function handleFileSelected(file) {
    if (!file) return;

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
    }

    selectedFile = file;
    previewObjectUrl = URL.createObjectURL(file);
    setPreviewImages(previewObjectUrl);
    showView("preview");
  }

  function resetFlow() {
    selectedFile = null;
    currentRecordId = null;
    currentComponents = [];
    currentComponentModes = [];
    newComponentMode = "unit";
    isAddFormOpen = false;
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    fileInputCamera.value = "";
    fileInputUpload.value = "";
    showView("landing");
  }

  function formatRange(range, unit) {
    if (!range) return `– ${unit}`;
    return `${range.low}–${range.high} ${unit}`;
  }

  function parseNumber(value) {
    if (value === "" || value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function defaultModeFor(component) {
    return component.quantity != null && component.unit ? "unit" : "grams";
  }

  function buildModeSelect(mode, label, onChange) {
    const select = document.createElement("select");
    select.className = "component-mode-select";
    select.setAttribute("aria-label", label);
    ["unit", "grams"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value === "unit" ? "Unit" : "Grams";
      select.appendChild(option);
    });
    select.value = mode;
    select.addEventListener("change", (e) => onChange(e.target.value));
    return select;
  }

  // A single bordered control that groups two related inputs (quantity+unit,
  // or a low–high range) instead of each having its own border — fewer
  // separate boxes on screen at once. `onCommit` receives the patch to merge
  // into the underlying object whenever a field is edited.
  function buildGroupBox(inputs, suffixText) {
    const groupBox = document.createElement("div");
    groupBox.className = "component-group-box";
    inputs.forEach((input, i) => {
      if (i > 0) groupBox.appendChild(document.createTextNode("–"));
      groupBox.appendChild(input);
    });
    if (suffixText) {
      const suffix = document.createElement("span");
      suffix.className = "component-group-suffix";
      suffix.textContent = suffixText;
      groupBox.appendChild(suffix);
    }
    return groupBox;
  }

  // Builds either the quantity+unit inputs or the low–high gram inputs for one
  // component row, depending on that row's current mode, grouped into a
  // single bordered control.
  function buildPortionFields(component, mode, labelSuffix, onCommit) {
    if (mode === "unit") {
      const quantityInput = document.createElement("input");
      quantityInput.type = "number";
      quantityInput.min = "0";
      quantityInput.className = "component-group-input component-group-input--narrow";
      quantityInput.setAttribute("aria-label", `Quantity${labelSuffix}`);
      quantityInput.placeholder = "qty";
      quantityInput.value = component.quantity ?? "";
      quantityInput.addEventListener("change", (e) => {
        onCommit({ quantity: parseNumber(e.target.value) });
      });

      const unitInput = document.createElement("input");
      unitInput.type = "text";
      unitInput.className = "component-group-input component-group-input--wide";
      unitInput.placeholder = "unit (e.g. piece, bowl)";
      unitInput.setAttribute("aria-label", `Unit${labelSuffix}`);
      unitInput.value = component.unit ?? "";
      unitInput.addEventListener("change", (e) => {
        onCommit({ unit: e.target.value.trim() || null });
      });

      return buildGroupBox([quantityInput, unitInput]);
    }

    const lowInput = document.createElement("input");
    lowInput.type = "number";
    lowInput.min = "0";
    lowInput.className = "component-group-input component-group-input--narrow";
    lowInput.setAttribute("aria-label", `Estimated grams, low end${labelSuffix}`);
    lowInput.placeholder = "low";
    lowInput.value = component.estimated_grams_low ?? "";
    lowInput.addEventListener("change", (e) => {
      onCommit({ estimated_grams_low: parseNumber(e.target.value) });
    });

    const highInput = document.createElement("input");
    highInput.type = "number";
    highInput.min = "0";
    highInput.className = "component-group-input component-group-input--narrow";
    highInput.setAttribute("aria-label", `Estimated grams, high end${labelSuffix}`);
    highInput.placeholder = "high";
    highInput.value = component.estimated_grams_high ?? "";
    highInput.addEventListener("change", (e) => {
      onCommit({ estimated_grams_high: parseNumber(e.target.value) });
    });

    return buildGroupBox([lowInput, highInput], "g");
  }

  function buildNutrientGrid(component) {
    const grid = document.createElement("div");
    grid.className = "component-nutrient-grid";
    NUTRIENT_FIELDS.forEach((field) => {
      const chip = document.createElement("div");
      chip.className = "component-nutrient-chip";

      const labelEl = document.createElement("span");
      labelEl.className = "component-nutrient-chip-label";
      labelEl.textContent = field.shortLabel;

      const valueEl = document.createElement("span");
      valueEl.className = "component-nutrient-chip-value";
      valueEl.textContent = formatRange(component.nutrition[field.key], field.unit);

      chip.appendChild(labelEl);
      chip.appendChild(valueEl);
      grid.appendChild(chip);
    });
    return grid;
  }

  function renderComponents() {
    const componentsEl = document.getElementById("result-components");
    componentsEl.innerHTML = "";

    currentComponents.forEach((component, index) => {
      const row = document.createElement("div");
      row.className = "component-row";

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "component-name-input";
      nameInput.value = component.name;
      nameInput.setAttribute("aria-label", "Component name");
      nameInput.addEventListener("change", (e) => {
        const trimmed = e.target.value.trim();
        if (!trimmed) {
          e.target.value = currentComponents[index].name;
          return;
        }
        currentComponents[index].name = trimmed;
        saveComponents();
      });

      const portionRow = document.createElement("div");
      portionRow.className = "component-portion-row";

      const commitPatch = (patch) => {
        currentComponents[index] = { ...currentComponents[index], ...patch };
        saveComponents();
      };

      let portionFields = buildPortionFields(
        component,
        currentComponentModes[index],
        ` for ${component.name || "component"}`,
        commitPatch
      );
      portionRow.appendChild(portionFields);

      const modeSelect = buildModeSelect(
        currentComponentModes[index],
        `Quantity type for ${component.name || "component"}`,
        (mode) => {
          currentComponentModes[index] = mode;
          const nextFields = buildPortionFields(
            currentComponents[index],
            mode,
            ` for ${currentComponents[index].name || "component"}`,
            commitPatch
          );
          portionRow.replaceChild(nextFields, portionFields);
          portionFields = nextFields;
        }
      );
      portionRow.appendChild(modeSelect);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "component-remove-btn";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", `Remove ${component.name}`);
      removeBtn.addEventListener("click", () => {
        currentComponents.splice(index, 1);
        currentComponentModes.splice(index, 1);
        renderComponents();
        saveComponents();
      });
      portionRow.appendChild(removeBtn);

      row.appendChild(nameInput);
      row.appendChild(portionRow);
      row.appendChild(buildNutrientGrid(component));
      componentsEl.appendChild(row);
    });

    addSectionEl = document.createElement("div");
    componentsEl.appendChild(addSectionEl);
    renderAddSection();
  }

  function renderAddSection() {
    addSectionEl.innerHTML = "";

    if (!isAddFormOpen) {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "component-add-trigger";
      trigger.textContent = "+ Add a component";
      trigger.addEventListener("click", () => {
        isAddFormOpen = true;
        renderAddSection();
      });
      addSectionEl.appendChild(trigger);
      return;
    }

    addSectionEl.appendChild(buildAddForm());
  }

  function buildAddForm() {
    const form = document.createElement("div");
    form.className = "component-add-form";

    const title = document.createElement("div");
    title.className = "component-add-form-title";
    title.textContent = "New component";
    form.appendChild(title);

    const addNameInput = document.createElement("input");
    addNameInput.type = "text";
    addNameInput.className = "component-name-input";
    addNameInput.placeholder = "Component name";
    addNameInput.setAttribute("aria-label", "New component name");
    form.appendChild(addNameInput);

    const portionLabel = document.createElement("div");
    portionLabel.className = "component-field-label";
    portionLabel.textContent = "Portion";
    form.appendChild(portionLabel);

    const portionRow = document.createElement("div");
    portionRow.className = "component-portion-row";

    const draftComponent = {
      quantity: null,
      unit: null,
      estimated_grams_low: null,
      estimated_grams_high: null,
    };
    const commitDraftPatch = (patch) => Object.assign(draftComponent, patch);

    let portionFields = buildPortionFields(draftComponent, newComponentMode, " for new component", commitDraftPatch);
    portionRow.appendChild(portionFields);

    const modeSelect = buildModeSelect(newComponentMode, "New component quantity type", (mode) => {
      newComponentMode = mode;
      const nextFields = buildPortionFields(draftComponent, mode, " for new component", commitDraftPatch);
      portionRow.replaceChild(nextFields, portionFields);
      portionFields = nextFields;
    });
    portionRow.appendChild(modeSelect);
    form.appendChild(portionRow);

    const nutrientLabel = document.createElement("div");
    nutrientLabel.className = "component-field-label";
    nutrientLabel.textContent = "Nutrition (per component)";
    form.appendChild(nutrientLabel);

    const draftNutrition = {};
    NUTRIENT_FIELDS.forEach((field) => {
      draftNutrition[field.key] = { low: null, high: null };

      const nutrientRow = document.createElement("div");
      nutrientRow.className = "component-nutrient-input-row";

      const label = document.createElement("span");
      label.className = "component-nutrient-input-label";
      label.textContent = field.label;
      nutrientRow.appendChild(label);

      const lowInput = document.createElement("input");
      lowInput.type = "number";
      lowInput.min = "0";
      lowInput.className = "component-group-input component-group-input--narrow";
      lowInput.placeholder = "low";
      lowInput.setAttribute("aria-label", `${field.label}, low end for new component`);
      lowInput.addEventListener("change", (e) => {
        draftNutrition[field.key].low = parseNumber(e.target.value);
      });

      const highInput = document.createElement("input");
      highInput.type = "number";
      highInput.min = "0";
      highInput.className = "component-group-input component-group-input--narrow";
      highInput.placeholder = "high";
      highInput.setAttribute("aria-label", `${field.label}, high end for new component`);
      highInput.addEventListener("change", (e) => {
        draftNutrition[field.key].high = parseNumber(e.target.value);
      });

      nutrientRow.appendChild(buildGroupBox([lowInput, highInput], field.unit));
      form.appendChild(nutrientRow);
    });

    const actions = document.createElement("div");
    actions.className = "component-add-form-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "component-add-cancel-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      isAddFormOpen = false;
      newComponentMode = "unit";
      renderAddSection();
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "component-add-confirm-btn";
    confirmBtn.textContent = "Add component";
    confirmBtn.addEventListener("click", () => {
      const name = addNameInput.value.trim();
      if (!name) return;

      const nutrition = {};
      NUTRIENT_FIELDS.forEach((field) => {
        nutrition[field.key] = {
          low: draftNutrition[field.key].low ?? 0,
          high: draftNutrition[field.key].high ?? 0,
        };
      });

      currentComponents.push({
        name,
        quantity: draftComponent.quantity,
        unit: draftComponent.unit,
        estimated_grams_low: draftComponent.estimated_grams_low,
        estimated_grams_high: draftComponent.estimated_grams_high,
        nutrition,
        confidence: "high",
      });
      currentComponentModes.push(newComponentMode);
      newComponentMode = "unit";
      isAddFormOpen = false;
      renderComponents();
      saveComponents();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    form.appendChild(actions);

    return form;
  }

  async function saveComponents() {
    const statusEl = document.getElementById("components-save-status");
    if (!currentRecordId) return;

    statusEl.textContent = "Saving…";
    try {
      const response = await fetch(recordComponentsEndpoint(currentRecordId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components: currentComponents }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body || body.success === false) {
        throw new Error((body && body.error) || "Couldn't save changes");
      }

      statusEl.textContent = "Saved";
    } catch (err) {
      statusEl.textContent = "Couldn't save — check your connection";
    } finally {
      clearTimeout(saveStatusTimeout);
      saveStatusTimeout = setTimeout(() => {
        statusEl.textContent = "";
      }, 2000);
    }
  }

  function renderResult(data) {
    document.getElementById("result-dish-name").textContent = data.dish_name;

    const localEl = document.getElementById("result-dish-local");
    if (data.dish_name_local) {
      localEl.textContent = data.dish_name_local;
      localEl.hidden = false;
    } else {
      localEl.textContent = "";
      localEl.hidden = true;
    }

    const confidenceEl = document.getElementById("result-confidence");
    confidenceEl.textContent = `${capitalize(data.overall_confidence)} confidence`;

    currentRecordId = data.id;
    currentComponents = (data.components || []).map((c) => ({ ...c }));
    currentComponentModes = currentComponents.map(defaultModeFor);
    isAddFormOpen = false;
    renderComponents();

    const nutrition = data.nutrition || {};
    const nutritionEl = document.getElementById("result-nutrition");
    nutritionEl.innerHTML = "";
    NUTRIENT_FIELDS.forEach((field) => {
      const item = document.createElement("div");
      item.className = "nutrition-item";
      const labelEl = document.createElement("span");
      labelEl.className = "nutrition-label";
      labelEl.textContent = field.label;
      const valueEl = document.createElement("span");
      valueEl.className = "nutrition-value";
      valueEl.textContent = formatRange(nutrition[field.key], field.unit);
      item.appendChild(labelEl);
      item.appendChild(valueEl);
      nutritionEl.appendChild(item);
    });

    document.getElementById("result-interpretation").textContent = data.interpretation || "";

    const uncertaintiesEl = document.getElementById("result-uncertainties");
    uncertaintiesEl.innerHTML = "";
    (data.uncertainties || []).forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      uncertaintiesEl.appendChild(li);
    });

    const disclaimerEl = document.getElementById("result-disclaimer");
    disclaimerEl.textContent = data.disclaimer || "";

    showView("result");
  }

  function capitalize(word) {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  async function analyseMeal() {
    if (!selectedFile) return;

    showView("loading");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(ANALYZE_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || !body || body.success === false) {
        const message = body && body.error ? body.error : "Something went wrong. Please try again.";
        throw new Error(message);
      }

      renderResult(body.data);
    } catch (err) {
      errorMessage.textContent =
        err && err.message
          ? err.message
          : "We couldn't reach the server. Please check your connection and try again.";
      showView("error");
    }
  }

  btnTakePhoto.addEventListener("click", () => fileInputCamera.click());
  btnUploadPhoto.addEventListener("click", () => fileInputUpload.click());

  fileInputCamera.addEventListener("change", (e) => {
    handleFileSelected(e.target.files && e.target.files[0]);
  });
  fileInputUpload.addEventListener("change", (e) => {
    handleFileSelected(e.target.files && e.target.files[0]);
  });

  btnPickDifferent.addEventListener("click", resetFlow);
  btnAnalyse.addEventListener("click", analyseMeal);
  btnScanAnother.addEventListener("click", resetFlow);
  btnErrorReset.addEventListener("click", resetFlow);
  btnRetry.addEventListener("click", analyseMeal);

  showView("landing");
})();
