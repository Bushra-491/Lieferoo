// Korean phrase mapping for rider preview chip
const ENTRY_PHRASES_KO = {
  door_code: "공동현관 비밀번호",
  call: "세대 호출",
  security_desk: "경비실 호출/방문",
  free: "자유 출입 가능"
};

const ENTRY_LABELS_EN = {
  door_code: "Door code",
  call: "Intercom",
  security_desk: "Security desk",
  free: "No code needed"
};

// DOM Elements
const addressPicker = document.getElementById("addressPicker");
const cardTitle = document.getElementById("cardTitle");
const cardSub = document.getElementById("cardSub");

const buildingUnit = document.getElementById("buildingUnit");
const buildingError = document.getElementById("buildingError");

const radioCards = document.querySelectorAll(".radio-card");
const radioInputs = document.querySelectorAll('input[name="entryMethod"]');
const entryError = document.getElementById("entryError");

const doorCodeBox = document.getElementById("doorCodeBox");
const doorCodeInput = document.getElementById("doorCodeInput");
const doorCodeError = document.getElementById("doorCodeError");

const useNextTime = document.getElementById("useNextTime");

const riderNote = document.getElementById("riderNote");
const charCounter = document.getElementById("charCounter");

const previewContainer = document.getElementById("previewContainer");
const saveBtn = document.getElementById("saveBtn");
const serverBanner = document.getElementById("serverBanner");
const successBox = document.getElementById("successBox");

// State
let addressesList = [];
let selectedAddress = null;
let hasSubmittedOnce = false;

// Regex Rules (Mirroring server validation)
const BUILDING_REGEX = /^[a-zA-Z0-9\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s]+$/;
const DOOR_CODE_REGEX = /^[0-9#*]+$/;

// 1. Load real addresses from GET /addresses
async function loadAddresses() {
  addressPicker.innerHTML = '<option value="">Loading addresses...</option>';
  try {
    const res = await fetch("/addresses");
    const data = await res.json();

    if (data.addresses && data.addresses.length > 0) {
      addressesList = data.addresses;
      addressPicker.innerHTML = "";

      addressesList.forEach((addr, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = addr.building_name_en || addr.road_address_en || addr.road_address_ko;
        addressPicker.appendChild(option);
      });

      selectedAddress = addressesList[0];
      renderAddressCard();
      renderPreview();
    } else {
      addressPicker.innerHTML = '<option value="">No addresses available</option>';
      cardTitle.textContent = "No address selected";
      cardSub.textContent = "";
    }
  } catch (err) {
    addressPicker.innerHTML = '<option value="">Couldn’t load addresses.</option>';
    serverBanner.textContent = "Couldn’t load addresses.";
    serverBanner.classList.add("visible");
  }
}

function renderAddressCard() {
  if (!selectedAddress) return;
  const title = selectedAddress.building_name_en || selectedAddress.road_address_en;
  cardTitle.textContent = title;
  cardSub.textContent = `${selectedAddress.road_address_en} · Road name address (도로명)`;
}

function getSelectedEntryMethod() {
  const checked = document.querySelector('input[name="entryMethod"]:checked');
  return checked ? checked.value : "";
}

function updateButtonState() {
  const hasAnyInput =
    buildingUnit.value.trim().length > 0 ||
    getSelectedEntryMethod() !== "" ||
    doorCodeInput.value.trim().length > 0 ||
    riderNote.value.trim().length > 0 ||
    (useNextTime && useNextTime.checked);

  saveBtn.disabled = !hasAnyInput;
}

function validateForm() {
  const errors = {
    building: "",
    entry: "",
    doorCode: ""
  };

  const bVal = buildingUnit.value.trim();
  if (!bVal) {
    errors.building = "Enter your building and unit.";
  } else if (!BUILDING_REGEX.test(bVal)) {
    errors.building = "Use English letters, Korean, numbers or spaces only.";
  }

  const entryVal = getSelectedEntryMethod();
  if (!entryVal) {
    errors.entry = "Choose how the rider gets in.";
  }

  if (entryVal === "door_code") {
    const dVal = doorCodeInput.value.trim();
    if (!dVal) {
      errors.doorCode = "Enter the door code.";
    } else if (!DOOR_CODE_REGEX.test(dVal)) {
      errors.doorCode = "Use numbers, # or * only.";
    }
  }

  return errors;
}

function renderErrors(errors) {
  buildingError.textContent = errors.building || "";
  buildingError.classList.toggle("visible", Boolean(errors.building));
  buildingUnit.classList.toggle("has-error", Boolean(errors.building));

  entryError.textContent = errors.entry;
  entryError.classList.toggle("visible", Boolean(errors.entry));
  radioCards.forEach((card) => {
    card.classList.toggle("has-error", Boolean(errors.entry));
  });

  doorCodeError.textContent = errors.doorCode;
  doorCodeError.classList.toggle("visible", Boolean(errors.doorCode));
  doorCodeInput.classList.toggle("has-error", Boolean(errors.doorCode));
}

function renderPreview() {
  const bVal = buildingUnit.value.trim();
  const entryVal = getSelectedEntryMethod();
  const dVal = doorCodeInput.value.trim();
  const nVal = riderNote.value.trim();

  const isEmpty = !bVal && !entryVal && !dVal && !nVal;

  if (isEmpty) {
    previewContainer.innerHTML = `
      <div class="preview-empty-or-error">
        Fill in the details to see what your rider will read.
      </div>
    `;
    return;
  }

  const errors = validateForm();
  const hasFormatError =
    (bVal && !BUILDING_REGEX.test(bVal)) ||
    (entryVal === "door_code" && dVal && !DOOR_CODE_REGEX.test(dVal));

  const hasAnyError = hasSubmittedOnce
    ? Boolean(errors.building || errors.entry || errors.doorCode)
    : hasFormatError;

  if (hasAnyError) {
    previewContainer.innerHTML = `
      <div class="preview-empty-or-error is-error">
        Fix the fields above to see the preview.
      </div>
    `;
    return;
  }

  const detailText = bVal || "101동 1203호";
  let chipText = "";
  let captionMethodText = "";

  if (entryVal) {
    chipText = ENTRY_PHRASES_KO[entryVal];
    captionMethodText = ENTRY_LABELS_EN[entryVal];
    if (entryVal === "door_code" && dVal) {
      chipText += ` ${dVal}`;
      captionMethodText += ` ${dVal}`;
    }
  }

  const koParts = selectedAddress
    ? [selectedAddress.building_name_ko, selectedAddress.road_address_ko].filter(Boolean)
    : [];
  const koAddressLine = koParts.join(" · ");

  const captionSummary = [detailText, captionMethodText].filter((x) => x && x !== "—").join(" · ");

  previewContainer.innerHTML = `
    <div class="rider-dark-card">
      <div class="rider-tag-small">도착지</div>
      <div class="rider-detail-big">${escapeHtml(detailText)}</div>
      ${chipText ? `<div class="rider-orange-chip">${escapeHtml(chipText)}</div>` : ""}
      <div class="rider-ko-address">${escapeHtml(koAddressLine)}</div>
    </div>
    <p class="preview-caption" style="margin-top: 8px;">
      ${escapeHtml(captionSummary)} — shown in Korean at the top of the rider’s screen.
    </p>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Event Listeners
addressPicker.addEventListener("change", (e) => {
  const idx = Number(e.target.value);
  selectedAddress = addressesList[idx] || null;
  renderAddressCard();
  renderPreview();
});

buildingUnit.addEventListener("input", () => {
  updateButtonState();
  if (hasSubmittedOnce) {
    renderErrors(validateForm());
  }
  renderPreview();
});

radioInputs.forEach((input) => {
  input.addEventListener("change", () => {
    const val = getSelectedEntryMethod();
    radioCards.forEach((card) => {
      card.classList.toggle("selected", card.dataset.value === val);
    });
    doorCodeBox.classList.toggle("visible", val === "door_code");
    if (val !== "door_code") {
      doorCodeInput.value = "";
    }
    updateButtonState();
    if (hasSubmittedOnce) {
      renderErrors(validateForm());
    }
    renderPreview();
  });
});

doorCodeInput.addEventListener("input", () => {
  updateButtonState();
  if (hasSubmittedOnce) {
    renderErrors(validateForm());
  }
  renderPreview();
});

riderNote.addEventListener("input", () => {
  const len = riderNote.value.length;
  charCounter.textContent = `${len}/200`;
  updateButtonState();
  renderPreview();
});

saveBtn.addEventListener("click", async () => {
  hasSubmittedOnce = true;
  const errors = validateForm();
  renderErrors(errors);

  if (errors.building || errors.entry || errors.doorCode) {
    renderPreview();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const payload = {
    address_id: selectedAddress ? selectedAddress.address_id : "ADR-001",
    detail: buildingUnit.value.trim(),
    entry_method: getSelectedEntryMethod(),
    entry_code: doorCodeInput.value.trim(),
    rider_note: riderNote.value.trim()
  };

  try {
    const res = await fetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save address.");
    }

    successBox.innerHTML = `
      <div><strong>Success!</strong> Order created.</div>
      <a href="./rider.html?id=${encodeURIComponent(data.order_id)}" class="success-link">Open Rider Screen (${data.order_id})</a>
    `;
    successBox.classList.add("visible");
    saveBtn.textContent = "Saved";
  } catch (err) {
    serverBanner.textContent = err.message;
    serverBanner.classList.add("visible");
    saveBtn.disabled = false;
    saveBtn.textContent = "Save address";
  }
});

// Initialize
loadAddresses();
updateButtonState();
renderPreview();
