// Fixed Korean phrases for entry methods
const ENTRY_PHRASES_KO = {
  door_code: "공동현관 비밀번호",
  call: "공동현관 호출",
  security_desk: "경비실 호출/방문",
  free: "자유 출입"
};

// Key SVG icon for peach entry block
const KEY_ICON_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
  </svg>
`;

// DOM Elements
const statusPill = document.getElementById("statusPill");
const mainContent = document.getElementById("mainContent");
const metaLine = document.getElementById("metaLine");
const errorAlertBox = document.getElementById("errorAlertBox");
const destinationBlock = document.getElementById("destinationBlock");
const dropoffKoInstruction = document.getElementById("dropoffKoInstruction");
const requestsBox = document.getElementById("requestsBox");
const bottomBar = document.getElementById("bottomBar");
const actionBtn = document.getElementById("actionBtn");
const navBtn = document.getElementById("navBtn");

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

// 1. Fetch Order on Load
async function loadOrder() {
  orderId = getOrderIdFromUrl().trim();

  if (!orderId || orderId === "undefined" || orderId === "null") {
    renderNotFound();
    return;
  }

  try {
    const res = await fetch(`/order?id=${encodeURIComponent(orderId)}`);

    if (!res.ok) {
      renderNotFound();
      return;
    }

    const data = await res.json();
    currentOrder = data.order || data;

    if (!currentOrder || !currentOrder.order_id) {
      renderNotFound();
      return;
    }

    renderOrderScreen();
  } catch (err) {
    renderNotFound();
  }
}

// 2. Render In-Progress Screen
function renderOrderScreen() {
  const resolvedId = currentOrder.order_id || orderId;
  const detailText = currentOrder.detail || "101동 1203호";

  if (currentOrder.status === "delivered") {
    renderDoneView(resolvedId, detailText);
    return;
  }

  statusPill.textContent = "배달 중";
  statusPill.className = "status-pill in-progress";
  metaLine.textContent = `주문번호 ${resolvedId}`;

  const entryMethod = currentOrder.entry_method;
  const entryCode = currentOrder.entry_code || "";
  const koPhrase = ENTRY_PHRASES_KO[entryMethod] || "";

  // Render single peach #FFA97F block (56px height) with key icon
  let entryHtml = "";
  if (koPhrase) {
    if (entryMethod === "door_code" && entryCode) {
      entryHtml = `
        <div class="rider-peach-block">
          ${KEY_ICON_SVG}
          <span class="rider-peach-label">${escapeHtml(koPhrase)}</span>
          <span class="rider-peach-code">${escapeHtml(entryCode)}</span>
        </div>
      `;
    } else {
      entryHtml = `
        <div class="rider-peach-pill">
          ${KEY_ICON_SVG}
          <span>${escapeHtml(koPhrase)}</span>
        </div>
      `;
    }
  }

  const koBuilding = currentOrder.building_name_ko;
  const koRoad = currentOrder.road_address_ko || "";
  const koAddressLine = koBuilding ? `${koBuilding} · ${koRoad}` : koRoad;

  destinationBlock.innerHTML = `
    <div class="rider-tag-small">도착지</div>
    <div class="rider-detail-big">${escapeHtml(detailText)}</div>
    ${entryHtml}
    ${koAddressLine ? `<div class="rider-ko-address">${escapeHtml(koAddressLine)}</div>` : ""}
  `;

  // Load accurate Korean drop-off phrase selected on Checkout screen
  const savedDropoffKo = localStorage.getItem("lieferoo_dropoff_ko") || "문 앞에 두고 벨은 누르지 말아주세요";
  dropoffKoInstruction.textContent = savedDropoffKo;

  // Customer memo box (#F3F3F3, radius 12)
  requestsBox.innerHTML = "";
  const rawNote = currentOrder.rider_note ?? "";

  if (!rawNote || rawNote.trim() === "") {
    dropoffKoInstruction.textContent = "요청사항 없음";
    requestsBox.innerHTML = `
      <div class="requests-sublabel">고객 메모 · 원문(영어)</div>
      <div class="requests-body empty">메모 없음</div>
    `;
  } else {
    requestsBox.innerHTML = `
      <div class="requests-sublabel">고객 메모 · 원문(영어)</div>
      <div class="requests-body">${escapeHtml(rawNote)}</div>
    `;
  }

  actionBtn.textContent = "배달 완료";
  actionBtn.disabled = false;
}

// 3. Done View State
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

// Navigation button click
if (navBtn) {
  navBtn.addEventListener("click", () => {
    alert("길 안내 기능을 시작합니다.");
  });
}

// Mark Order Delivered on Button Click
actionBtn.addEventListener("click", async () => {
  errorAlertBox.classList.remove("visible");
  actionBtn.disabled = true;

  try {
    const res = await fetch("/deliver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId })
    });

    if (!res.ok) {
      throw new Error("Server failed to mark order as delivered");
    }

    currentOrder.status = "delivered";
    renderOrderScreen();
  } catch (err) {
    errorAlertBox.textContent = "배달 완료 처리에 실패했어요. 네트워크를 확인하고 다시 시도해 주세요.";
    errorAlertBox.classList.add("visible");
    actionBtn.textContent = "다시 시도";
    actionBtn.disabled = false;
  }
});

// Initialize
loadOrder();
