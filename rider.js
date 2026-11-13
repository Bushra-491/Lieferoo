// Fixed Korean phrases for entry methods
const ENTRY_PHRASES_KO = {
  door_code: "공동현관 비밀번호",
  call: "세대 호출",
  security_desk: "경비실 호출/방문",
  free: "자유 출입 가능"
};

// DOM Elements
const statusPill = document.getElementById("statusPill");
const mainContent = document.getElementById("mainContent");
const metaLine = document.getElementById("metaLine");
const errorAlertBox = document.getElementById("errorAlertBox");
const destinationBlock = document.getElementById("destinationBlock");
const requestsBox = document.getElementById("requestsBox");
const bottomBar = document.getElementById("bottomBar");
const actionBtn = document.getElementById("actionBtn");

// State
let currentOrder = null;
let orderId = "";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

// 1. Fetch Order on Load using encodeURIComponent
async function loadOrder() {
  orderId = getOrderIdFromUrl().trim();

  if (!orderId || orderId === "undefined" || orderId === "null") {
    renderNotFound();
    return;
  }

  try {
    const res = await fetch(`/orders/${encodeURIComponent(orderId)}`);

    if (!res.ok) {
      renderNotFound();
      return;
    }

    const data = await res.json();
    currentOrder = data.order || data;

    if (!currentOrder || typeof currentOrder !== "object") {
      renderNotFound();
      return;
    }

    renderOrderScreen();
  } catch (err) {
    console.error("Failed to load order:", err);
    renderNotFound();
  }
}

// 2. Render In-Progress or Delivered Screen
function renderOrderScreen() {
  const resolvedId = currentOrder.order_id || currentOrder.id || orderId;
  const detailText = currentOrder.detail || currentOrder.building_unit || "101동 1203호";

  if (currentOrder.status === "delivered") {
    renderDoneView(resolvedId, detailText);
    return;
  }

  // Top bar pill: "배달 중" (dark)
  statusPill.textContent = "배달 중";
  statusPill.className = "status-pill in-progress";

  // Meta line: "주문번호 {order_id}." (skip created_at time)
  metaLine.textContent = `주문번호 ${resolvedId}.`;

  // Dark block "도착지" (at most 2 info lines + chip, Korean fixed phrases only)
  const entryMethod = currentOrder.entry_method;
  const entryCode = currentOrder.entry_code || currentOrder.door_code || "";
  const koPhrase = ENTRY_PHRASES_KO[entryMethod] || "";

  let entryHtml = "";
  if (koPhrase) {
    if (entryMethod === "door_code" && entryCode) {
      entryHtml = `
        <div class="rider-orange-chip">${escapeHtml(koPhrase)}</div>
        <div class="rider-code-huge">${escapeHtml(entryCode)}</div>
      `;
    } else {
      entryHtml = `<div class="rider-orange-chip">${escapeHtml(koPhrase)}</div>`;
    }
  }

  // Below small: building_name_ko · road_address_ko (just road address when building name is null)
  const koBuilding = currentOrder.building_name_ko;
  const koRoad = currentOrder.road_address_ko || "";
  const koAddressLine = koBuilding ? `${koBuilding} · ${koRoad}` : koRoad;

  destinationBlock.innerHTML = `
    <div class="rider-tag-small">도착지</div>
    <div class="rider-detail-big">${escapeHtml(detailText)}</div>
    ${entryHtml}
    ${koAddressLine ? `<div class="rider-ko-address">${escapeHtml(koAddressLine)}</div>` : ""}
  `;

  // "요청사항" section — strictly using textContent, not innerHTML, for user note
  requestsBox.innerHTML = "";
  const rawNote = currentOrder.rider_note ?? currentOrder.note ?? "";

  const subLabel = document.createElement("div");
  subLabel.className = "requests-sublabel";

  const bodyDiv = document.createElement("div");
  bodyDiv.className = "requests-body";

  if (!rawNote || rawNote.trim() === "") {
    subLabel.textContent = "요청사항 없음";
    bodyDiv.textContent = "메모 없음";
    bodyDiv.classList.add("empty");
  } else {
    subLabel.textContent = "고객 메모 · 원문";
    bodyDiv.textContent = rawNote;
  }

  requestsBox.appendChild(subLabel);
  requestsBox.appendChild(bodyDiv);

  actionBtn.textContent = "배달 완료";
  actionBtn.disabled = false;
}

// 3. Done View: green check, "배달 완료", the detail, "주문번호 {id} · 상태: delivered"
function renderDoneView(resolvedId, detailText) {
  statusPill.textContent = "배달 완료";
  statusPill.className = "status-pill completed";
  bottomBar.style.display = "none";

  mainContent.innerHTML = "";

  const container = document.createElement("div");
  container.className = "done-container";

  const checkCircle = document.createElement("div");
  checkCircle.className = "success-icon-circle";
  checkCircle.textContent = "✓";

  const titleEl = document.createElement("div");
  titleEl.className = "done-title";
  titleEl.textContent = "배달 완료";

  const detailEl = document.createElement("div");
  detailEl.className = "done-detail";
  detailEl.textContent = detailText;

  const metaEl = document.createElement("div");
  metaEl.className = "done-meta";
  metaEl.textContent = `주문번호 ${resolvedId} · 상태: delivered`;

  container.appendChild(checkCircle);
  container.appendChild(titleEl);
  container.appendChild(detailEl);
  container.appendChild(metaEl);

  mainContent.appendChild(container);
}

// 4. Missing or unknown order state
function renderNotFound() {
  statusPill.style.display = "none";
  bottomBar.style.display = "none";
  mainContent.innerHTML = "";

  const container = document.createElement("div");
  container.className = "not-found-container";

  const msg = document.createElement("div");
  msg.className = "not-found-title";
  msg.textContent = "주문을 찾을 수 없어요.";

  container.appendChild(msg);
  mainContent.appendChild(container);
}

// 5. Mark Order Delivered on Button Click
actionBtn.addEventListener("click", async () => {
  errorAlertBox.classList.remove("visible");
  actionBtn.disabled = true;

  const encodedId = encodeURIComponent(orderId);

  try {
    let res = await fetch(`/orders/${encodedId}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (res.status === 404 || res.status === 405) {
      res = await fetch(`/orders/${encodedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" })
      });
    }

    if (!res.ok) {
      throw new Error("Server failed to mark order as delivered");
    }

    currentOrder.status = "delivered";
    renderOrderScreen();
  } catch (err) {
    errorAlertBox.textContent = "배달 완료 처리에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.";
    errorAlertBox.classList.add("visible");
    actionBtn.textContent = "다시 시도.";
    actionBtn.disabled = false;
  }
});

// Initialize
loadOrder();
