(() => {
  const ANALYZE_ENDPOINT = "/api/food/analyze";

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

  function formatPortion(component) {
    const low = component.estimated_grams_low;
    const high = component.estimated_grams_high;
    if (low == null && high == null) return "Amount unclear";
    if (low != null && high != null) return `${low}–${high}g`;
    const only = low != null ? low : high;
    return `~${only}g`;
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

    const componentsEl = document.getElementById("result-components");
    componentsEl.innerHTML = "";
    (data.components || []).forEach((component) => {
      const li = document.createElement("li");
      const nameSpan = document.createElement("span");
      nameSpan.className = "component-name";
      nameSpan.textContent = component.name;
      const portionSpan = document.createElement("span");
      portionSpan.className = "component-portion";
      portionSpan.textContent = formatPortion(component);
      li.appendChild(nameSpan);
      li.appendChild(portionSpan);
      componentsEl.appendChild(li);
    });

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
