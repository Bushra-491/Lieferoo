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
// English letters, Korean (Hangul syllables/Jamo), numbers, or spaces only
const BUILDING_REGEX = /^[a-zA-Z0-9\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s]+$/;
// Numbers, # or * only
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

// Button: gray and disabled until the form has ANY input or selection, then active
function updateButtonState() {
  const hasAnyInput =
    buildingUnit.value.trim().length > 0 ||
    getSelectedEntryMethod() !== "" ||
    doorCodeInput.value.trim().length > 0 ||
    riderNote.value.trim().length > 0 ||
    (useNextTime && useNextTime.checked);

  saveBtn.disabled = !hasAnyInput;
}

// Client Validation Rules (mirrors server rules)
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
  // Building and unit error
  buildingError.textContent = errors.building;
  buildingError.classList.toggle("visible", Boolean(errors.building));
  buildingUnit.classList.toggle("has-error", Boolean(errors.building));

  // Entry method error (all 4 cards get red border)
  entryError.textContent = errors.entry;
  entryError.classList.toggle("visible", Boolean(errors.entry));
  radioCards.forEach((card) => {
    card.classList.toggle("has-error", Boolean(errors.entry));
  });

  // Door code error
  doorCodeError.textContent = errors.doorCode;
  doorCodeError.classList.toggle("visible", Boolean(errors.doorCode));
  doorCodeInput.classList.toggle("has-error", Boolean(errors.doorCode));
}

// Render Rider Preview (Empty, Error, or Dark Block)
function renderPreview() {
  const bVal = buildingUnit.value.trim();
  const entryVal = getSelectedEntryMethod();
  const dVal = doorCodeInput.value.trim();
  const nVal = riderNote.value.trim();

  const isEmpty = !bVal && !entryVal && !dVal && !nVal;

  // 1. Empty state
  if (isEmpty) {
    previewContainer.innerHTML = `
      <div class="preview-empty-or-error">
        Fill in the details to see what your rider will read.
      </div>
    `;
    return;
  }

  // Check format errors immediately, or missing required fields once submitted
  const errors = validateForm();
  const hasFormatError =
    (bVal && !BUILDING_REGEX.test(bVal)) ||
    (entryVal === "door_code" && dVal && !DOOR_CODE_REGEX.test(dVal));

  const hasAnyError = hasSubmittedOnce
    ? Boolean(errors.building || errors.entry || errors.doorCode)
    : hasFormatError;

  // 2. Error state
  if (hasAnyError) {
    previewContainer.innerHTML = `
      <div class="preview-empty-or-error is-error">
        Fix the fields above to see the preview.
      </div>
    `;
    return;
  }

  // 3. Dark preview block
  const detailText = bVal || "—";
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
  if (hasSubmittedOnce) renderErrors(validateForm());
  renderPreview();
});

radioInputs.forEach((radio) => {
  radio.addEventListener("change", () => {
    const val = radio.value;

    radioCards.forEach((card) => {
      card.classList.toggle("selected", card.dataset.value === val);
    });

    if (val === "door_code") {
      doorCodeBox.classList.add("visible");
    } else {
      doorCodeBox.classList.remove("visible");
      doorCodeInput.value = "";
      doorCodeError.classList.remove("visible");
      doorCodeInput.classList.remove("has-error");
    }

    updateButtonState();
    if (hasSubmittedOnce) renderErrors(validateForm());
    renderPreview();
  });
});

doorCodeInput.addEventListener("input", () => {
  updateButtonState();
  if (hasSubmittedOnce) renderErrors(validateForm());
  renderPreview();
});

if (useNextTime) {
  useNextTime.addEventListener("change", () => {
    updateButtonState();
  });
}

riderNote.addEventListener("input", () => {
  charCounter.textContent = `${riderNote.value.length}/200`;
  updateButtonState();
  renderPreview();
});

// Save & POST to /orders (Matches your backend's exact payload keys)
saveBtn.addEventListener("click", async () => {
  hasSubmittedOnce = true;
  serverBanner.classList.remove("visible");
  successBox.classList.remove("visible");

  const errors = validateForm();
  renderErrors(errors);
  renderPreview();

  if (errors.building || errors.entry || errors.doorCode) {
    return;
  }

  if (!selectedAddress) {
    serverBanner.textContent = "Please select a valid address.";
    serverBanner.classList.add("visible");
    return;
  }

  // Exact keys from your existing user.html backend contract
  const payload = {
    address_id: selectedAddress.address_id,
    detail: buildingUnit.value.trim(),
    entry_method: getSelectedEntryMethod(),
    entry_code: getSelectedEntryMethod() === "door_code" ? doorCodeInput.value.trim() : "",
    rider_note: riderNote.value.trim()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const response = await fetch("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const serverMsg = data.error || data.message || "Failed to place order.";

      // Map server error to matching field if server specifies field or message matches
      if (data.field === "detail" || serverMsg.includes("building and unit") || serverMsg.includes("English letters, Korean")) {
        renderErrors({ building: serverMsg, entry: "", doorCode: "" });
      } else if (data.field === "entry_method" || serverMsg.includes("how the rider gets in")) {
        renderErrors({ building: "", entry: serverMsg, doorCode: "" });
      } else if (data.field === "entry_code" || serverMsg.includes("door code") || serverMsg.includes("numbers, # or *")) {
        renderErrors({ building: "", entry: "", doorCode: serverMsg });
      } else {
        serverBanner.textContent = serverMsg;
        serverBanner.classList.add("visible");
      }
      renderPreview();
      return;
    }

    // Success: green confirmation with order ID and link to rider.html?id=...
    const orderId = data.order_id || data.id;
    successBox.innerHTML = `
      <div><strong>Address saved!</strong> Order ID: <code>${escapeHtml(String(orderId))}</code></div>
      <a class="success-link" href="rider.html?id=${encodeURIComponent(orderId)}">
        Open Rider Screen (rider.html?id=${escapeHtml(String(orderId))})
      </a>
    `;
    successBox.classList.add("visible");
    successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    serverBanner.textContent = "Network error. Please try again.";
    serverBanner.classList.add("visible");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save address";
  }
});

// Initialize on page load
loadAddresses();
renderPreview();
