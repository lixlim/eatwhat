(() => {
  const ANALYZE_ENDPOINT = "/api/food/analyze";
  const recordComponentsEndpoint = (id) => `/api/food/records/${encodeURIComponent(id)}/components`;

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

  function parseGrams(value) {
    if (value === "" || value == null) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
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

      const portionGroup = document.createElement("div");
      portionGroup.className = "component-portion-group";

      const lowInput = document.createElement("input");
      lowInput.type = "number";
      lowInput.min = "0";
      lowInput.className = "component-portion-input";
      lowInput.setAttribute("aria-label", "Estimated grams, low end");
      lowInput.value = component.estimated_grams_low ?? "";
      lowInput.addEventListener("change", (e) => {
        currentComponents[index].estimated_grams_low = parseGrams(e.target.value);
        saveComponents();
      });

      const highInput = document.createElement("input");
      highInput.type = "number";
      highInput.min = "0";
      highInput.className = "component-portion-input";
      highInput.setAttribute("aria-label", "Estimated grams, high end");
      highInput.value = component.estimated_grams_high ?? "";
      highInput.addEventListener("change", (e) => {
        currentComponents[index].estimated_grams_high = parseGrams(e.target.value);
        saveComponents();
      });

      portionGroup.appendChild(lowInput);
      portionGroup.appendChild(document.createTextNode("–"));
      portionGroup.appendChild(highInput);
      portionGroup.appendChild(document.createTextNode("g"));

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "component-remove-btn";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", `Remove ${component.name}`);
      removeBtn.addEventListener("click", () => {
        currentComponents.splice(index, 1);
        renderComponents();
        saveComponents();
      });

      row.appendChild(nameInput);
      row.appendChild(portionGroup);
      row.appendChild(removeBtn);
      componentsEl.appendChild(row);
    });

    const addRow = document.createElement("div");
    addRow.className = "component-add-row";

    const addNameInput = document.createElement("input");
    addNameInput.type = "text";
    addNameInput.className = "component-name-input";
    addNameInput.placeholder = "Add a component…";
    addNameInput.setAttribute("aria-label", "New component name");

    const addLowInput = document.createElement("input");
    addLowInput.type = "number";
    addLowInput.min = "0";
    addLowInput.className = "component-portion-input";
    addLowInput.placeholder = "g";
    addLowInput.setAttribute("aria-label", "New component estimated grams, low end");

    const addHighInput = document.createElement("input");
    addHighInput.type = "number";
    addHighInput.min = "0";
    addHighInput.className = "component-portion-input";
    addHighInput.placeholder = "g";
    addHighInput.setAttribute("aria-label", "New component estimated grams, high end");

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "component-add-btn";
    addBtn.textContent = "+";
    addBtn.setAttribute("aria-label", "Add component");
    addBtn.addEventListener("click", () => {
      const name = addNameInput.value.trim();
      if (!name) return;
      currentComponents.push({
        name,
        estimated_grams_low: parseGrams(addLowInput.value),
        estimated_grams_high: parseGrams(addHighInput.value),
        confidence: "high",
      });
      renderComponents();
      saveComponents();
    });

    addRow.appendChild(addNameInput);
    addRow.appendChild(addLowInput);
    addRow.appendChild(addHighInput);
    addRow.appendChild(addBtn);
    componentsEl.appendChild(addRow);
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
    renderComponents();

    const nutrition = data.nutrition || {};
    const nutritionItems = [
      ["Calories", formatRange(nutrition.calories_kcal, "kcal")],
      ["Protein", formatRange(nutrition.protein_g, "g")],
      ["Carbs", formatRange(nutrition.carbs_g, "g")],
      ["Fat", formatRange(nutrition.fat_g, "g")],
      ["Fibre", formatRange(nutrition.fibre_g, "g")],
      ["Sodium", formatRange(nutrition.sodium_mg, "mg")],
    ];
    const nutritionEl = document.getElementById("result-nutrition");
    nutritionEl.innerHTML = "";
    nutritionItems.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "nutrition-item";
      const labelEl = document.createElement("span");
      labelEl.className = "nutrition-label";
      labelEl.textContent = label;
      const valueEl = document.createElement("span");
      valueEl.className = "nutrition-value";
      valueEl.textContent = value;
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
