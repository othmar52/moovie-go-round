let gefundeneFilme = [];
let baseAuswahl = [];
let wheelItems = [];
let filmTabMap = {};

const wheelColors = [
  "#e03e36",
  "#2a82c4",
  "#45a045",
  "#f0c22d",
  "#6d3b9e",
  "#e57223",
  "#dddddd",
];
const wheelColorsLight = [
  "#ff7b75",
  "#63b8ff",
  "#78d678",
  "#ffe87a",
  "#a96edb",
  "#ffaa66",
  "#ffffff",
];

// --- AUDIO ---
const tickAudio = new Audio("tick.wav");
tickAudio.volume = 0.8;
let lastTickTime = 0;
let dynamicInterval = 80;

function playTick() {
  const now = performance.now();
  if (now - lastTickTime < dynamicInterval) return;
  lastTickTime = now;
  tickAudio.currentTime = 0;
  tickAudio.play().catch(() => {});
}

// --- TITLE HELPERS ---
function cleanMovieTitle(title) {
  const yearMatch = title.match(/\(\d{4}\)$/);
  const yearPart = yearMatch ? ` ${yearMatch[0]}` : "";
  let titlePart = title.replace(/\(\d{4}\)$/, "").trim();
  titlePart = titlePart
    .toLowerCase()
    .replace(/(^|\s|-)(\w)/g, (_, sep, ch) => sep + ch.toUpperCase());
  return `${titlePart}${yearPart}`.trim();
}

function stripYear(title) {
  return title.replace(/\s*\(\d{4}\)$/, "").trim();
}

// --- WHEEL DATA UPDATE ---
function updateWheelData() {
  const checkboxes = document.querySelectorAll("#movieList input:checked");
  baseAuswahl = Array.from(checkboxes).map((cb) => cb.value);
  const spinBtn = document.getElementById("spinBtn");
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");

  if (baseAuswahl.length < 2) {
    spinBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  spinBtn.disabled = false;

  const maxItemsSlider = document.getElementById("maxItemsSlider");
  const minRequired = baseAuswahl.length;

  maxItemsSlider.min = Math.max(2, minRequired);

  if (parseInt(maxItemsSlider.max, 10) < minRequired) {
    maxItemsSlider.max = minRequired + 50;
  }

  if (parseInt(maxItemsSlider.value, 10) < minRequired) {
    maxItemsSlider.value = minRequired;
    document.getElementById("maxItemsVal").innerText = minRequired;
  }

  const MAX_ITEMS = parseInt(maxItemsSlider.value, 10);

  wheelItems = [];
  const repeats = Math.floor(MAX_ITEMS / baseAuswahl.length);
  for (let i = 0; i < repeats; i++) {
    wheelItems.push(...baseAuswahl);
  }

  drawWheel();
}

// --- LIST MANAGEMENT ---
function addFilmsToList(filmeListe, tabIdMap = {}) {
  const listContainer = document.getElementById("movieList");
  if (
    listContainer.querySelector(".loading") ||
    listContainer.innerText.includes(t("noTabsFound")) ||
    listContainer.innerText.includes("Keine Filme") // Fallback
  ) {
    listContainer.innerHTML = "";
  }

  filmeListe.forEach((film) => {
    if (!gefundeneFilme.includes(film)) {
      gefundeneFilme.push(film);

      if (tabIdMap[film] !== undefined) {
        filmTabMap[film] = tabIdMap[film];
      }

      const i = gefundeneFilme.length - 1;
      const tabId = filmTabMap[film];

      // LOKALISIERT
      const watchBtn =
        tabId !== undefined
          ? `<button class="watch-btn" title="${t("openTab")}${film}" data-tabid="${tabId}">▶</button>`
          : `<button class="watch-btn watch-btn--hidden" disabled title="${t("noKnownTab")}">▶</button>`;

      const div = document.createElement("div");
      div.className = "movie-item";
      div.innerHTML = `
        <input type="checkbox" id="f-${i}" checked value="${film}">
        <label for="f-${i}">${film}</label>
        ${watchBtn}
      `;
      listContainer.appendChild(div);

      div.querySelector("input").addEventListener("change", updateWheelData);

      const btn = div.querySelector(".watch-btn:not(.watch-btn--hidden)");
      if (btn) {
        btn.addEventListener("click", () => {
          chrome.tabs.update(parseInt(btn.dataset.tabid, 10), { active: true });
        });
      }
    }
  });

  // LOKALISIERT
  document.getElementById("status").innerText =
    `${gefundeneFilme.length}${t("moviesInList")}`;
  updateWheelData();
}

// --- INITIAL TAB SCAN ---
document.addEventListener("DOMContentLoaded", async () => {
  const tabs = await chrome.tabs.query({});
  const initialFilms = [];
  const tabIdMap = {};

  for (const tab of tabs) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 1. Plex
          const plexTitleElement = document.querySelector(
            '[data-testid="metadata-title"]',
          );
          if (plexTitleElement) {
            let title = plexTitleElement.innerText.trim();
            const plexMetaLine = document.querySelector(
              '[data-testid="metadata-line1"]',
            );
            if (plexMetaLine) {
              const yearMatch = plexMetaLine.innerText.trim().match(/^(\d{4})/);
              if (yearMatch) title += ` (${yearMatch[1]})`;
            }
            return title;
          }
          // 2. Jellyfin / Emby
          const activePage = Array.from(
            document.querySelectorAll("#itemDetailPage"),
          ).find((p) => !p.classList.contains("hide"));
          if (activePage) {
            const jellyfinTitleElement = activePage.querySelector(
              ".nameContainer h1.itemName bdi",
            );
            const yearElement = activePage.querySelector(
              ".itemMiscInfo-primary .mediaInfoItem",
            );
            if (jellyfinTitleElement && yearElement) {
              const yearMatch = yearElement.innerText.trim().match(/^(\d{4})/);
              if (yearMatch) {
                return (
                  jellyfinTitleElement.innerText.trim() + ` (${yearMatch[1]})`
                );
              }
            }
          }
          // 3. Generic
          const h1 = document.querySelector("h1");
          if (h1 && h1.querySelector("span.year")) return h1.innerText.trim();
          return null;
        },
      });
      if (result.result) {
        const cleaned = cleanMovieTitle(result.result);
        initialFilms.push(cleaned);
        tabIdMap[cleaned] = tab.id;
      }
    } catch (e) {}
  }

  if (initialFilms.length > 0) {
    addFilmsToList(initialFilms, tabIdMap);
  } else {
    // LOKALISIERT
    document.getElementById("movieList").innerHTML =
      `<p style="padding: 15px;">${t("noTabsFound")}</p>`;
    document.getElementById("status").innerText = t("ready");
  }
});

// --- EVENT LISTENERS ---
document.getElementById("maxItemsSlider").addEventListener("input", (e) => {
  document.getElementById("maxItemsVal").innerText = e.target.value;
  updateWheelData();
});

document.getElementById("durationSlider").addEventListener("input", (e) => {
  document.getElementById("durationVal").innerText = e.target.value;
});

document.getElementById("addManualBtn").addEventListener("click", () => {
  const inputEl = document.getElementById("manualInput");
  const lines = inputEl.value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length > 0) {
    const cleanedLines = lines.map(cleanMovieTitle);
    addFilmsToList(cleanedLines);
    inputEl.value = "";
  }
});

// LOKALISIERT
document.getElementById("copyBtn").addEventListener("click", () => {
  const checkboxes = document.querySelectorAll("#movieList input:checked");
  const selectedFilms = Array.from(checkboxes).map((cb) => cb.value);
  navigator.clipboard.writeText(selectedFilms.join("\n"));
  const btn = document.getElementById("copyBtn");
  btn.innerText = t("copied");
  setTimeout(() => (btn.innerText = t("copyBtn")), 2000);
});

// --- DRAW WHEEL ---
function drawWheel() {
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = centerX - 5;
  const innerRadius = radius * 0.22;
  const sliceAngle = (2 * Math.PI) / wheelItems.length;
  const fontSize = Math.max(24, Math.min(26, 450 / wheelItems.length));

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
  ctx.fillStyle = "#888";
  ctx.fill();
  ctx.restore();

  wheelItems.forEach((film, i) => {
    const baseIndex = i % baseAuswahl.length;
    const colorDark = wheelColors[baseIndex % wheelColors.length];
    const colorLight = wheelColorsLight[baseIndex % wheelColorsLight.length];

    const startAngle = i * sliceAngle - sliceAngle / 2;
    const endAngle = (i + 1) * sliceAngle - sliceAngle / 2;

    const grad = ctx.createRadialGradient(
      centerX,
      centerY,
      innerRadius,
      centerX,
      centerY,
      radius,
    );
    grad.addColorStop(0, colorLight);
    grad.addColorStop(1, colorDark);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  const goldGrad = ctx.createLinearGradient(
    centerX - radius,
    centerY - radius,
    centerX + radius,
    centerY + radius,
  );
  goldGrad.addColorStop(0, "#ffe066");
  goldGrad.addColorStop(0.4, "#ffcf00");
  goldGrad.addColorStop(0.6, "#e6a800");
  goldGrad.addColorStop(1, "#ffe066");

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 10;
  ctx.stroke();

  const glossGrad = ctx.createRadialGradient(
    centerX - radius * 0.3,
    centerY - radius * 0.35,
    radius * 0.05,
    centerX,
    centerY,
    radius,
  );
  glossGrad.addColorStop(0, "rgba(255,255,255,0.22)");
  glossGrad.addColorStop(0.45, "rgba(255,255,255,0.06)");
  glossGrad.addColorStop(1, "rgba(255,255,255,0)");

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 5, 0, 2 * Math.PI);
  ctx.fillStyle = glossGrad;
  ctx.fill();

  const innerGoldGrad = ctx.createLinearGradient(
    centerX - innerRadius,
    centerY - innerRadius,
    centerX + innerRadius,
    centerY + innerRadius,
  );
  innerGoldGrad.addColorStop(0, "#ffe066");
  innerGoldGrad.addColorStop(0.5, "#e6a800");
  innerGoldGrad.addColorStop(1, "#ffe066");

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius + 4, 0, 2 * Math.PI);
  ctx.fillStyle = innerGoldGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
  const centerGrad = ctx.createRadialGradient(
    centerX - innerRadius * 0.3,
    centerY - innerRadius * 0.3,
    2,
    centerX,
    centerY,
    innerRadius,
  );
  centerGrad.addColorStop(0, "#ffffff");
  centerGrad.addColorStop(1, "#e8e8e8");
  ctx.fillStyle = centerGrad;
  ctx.fill();

  wheelItems.forEach((film, i) => {
    const baseIndex = i % baseAuswahl.length;
    const colorIndex = baseIndex % wheelColors.length;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(i * sliceAngle);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${fontSize}px sans-serif`;

    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle =
      colorIndex === 0 || colorIndex === 4 ? "#ffffff" : "#1a1a1a";

    let displayText = stripYear(film);
    const maxChars = Math.max(10, Math.floor(600 / wheelItems.length));
    if (displayText.length > maxChars)
      displayText = displayText.substring(0, maxChars - 1) + "…";

    ctx.fillText(displayText, radius - 20, 0);
    ctx.restore();
  });
}

// --- LOCK CONTROLS ---
function toggleControls(disable) {
  document
    .querySelectorAll("#movieList input")
    .forEach((cb) => (cb.disabled = disable));
  document.getElementById("maxItemsSlider").disabled = disable;
  document.getElementById("durationSlider").disabled = disable;
  document.getElementById("manualInput").disabled = disable;
  document.getElementById("addManualBtn").disabled = disable;
  document.getElementById("spinBtn").disabled = disable;
}

// --- CONFETTI ---
const CONFETTI_COLORS = [
  "#e03e36",
  "#2a82c4",
  "#45a045",
  "#f0c22d",
  "#6d3b9e",
  "#e57223",
  "#ffffff",
  "#ff69b4",
  "#00e5ff",
];

let confettiParticles = [];
let confettiAnimId = null;

function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  canvas.style.display = "block";

  confettiParticles = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    w: 8 + Math.random() * 10,
    h: 4 + Math.random() * 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    vx: (Math.random() - 0.5) * 4,
    vy: 3 + Math.random() * 5,
    opacity: 1,
  }));

  const ctx = canvas.getContext("2d");

  function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    confettiParticles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height * 0.7) p.opacity -= 0.018;

      if (p.opacity > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive) {
      confettiAnimId = requestAnimationFrame(drawConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
    }
  }

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  confettiAnimId = requestAnimationFrame(drawConfetti);
}

// --- SHOW WINNER MODAL ---
function showWinnerModal(winner) {
  document.getElementById("modalWinnerText").innerText = "🎉 " + winner + " 🎉";

  const focusBtn = document.getElementById("focusTabBtn");
  const tabId = filmTabMap[winner];
  if (tabId !== undefined) {
    focusBtn.style.display = "inline-block";
    focusBtn.onclick = () => {
      chrome.tabs.update(tabId, { active: true });
    };
  } else {
    focusBtn.style.display = "none";
  }

  // LOKALISIERT
  document.getElementById("copyListBtn").onclick = () => {
    const checkboxes = document.querySelectorAll("#movieList input:checked");
    const lines = Array.from(checkboxes).map((cb) => {
      const val = cb.value;
      return val === winner ? `${val} <-------` : val;
    });
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
    navigator.clipboard.writeText(`${date}\n${lines.join("\n")}`);
    const btn = document.getElementById("copyListBtn");
    btn.innerText = t("copied");
    setTimeout(() => (btn.innerText = t("copyListBtn")), 2000);
  };

  document.getElementById("winnerModal").style.display = "flex";
}

// --- SPIN LOGIC ---
let isSpinning = false;
let spinStart = null;
let accumulatedRotation = 0;
let animFrameId = null;

const spinBtn = document.getElementById("spinBtn");

spinBtn.addEventListener("mousedown", () => {
  if (isSpinning) return;
  isSpinning = true;
  toggleControls(true);
  spinBtn.disabled = false;
  spinStart = performance.now();
  accumulatedRotation = 0;

  const canvas = document.getElementById("wheel");
  const sliceAngle = (2 * Math.PI) / wheelItems.length;
  let lastTick = 0;

  function spinUp(now) {
    if (!isSpinning) return;
    const elapsed = now - spinStart;
    const rampUp = Math.min(elapsed / 2000, 1);
    const speed = rampUp * 0.05;
    accumulatedRotation += speed;

    canvas.style.transform = `rotate(${accumulatedRotation}rad)`;

    const currentTick = Math.floor(
      (accumulatedRotation + sliceAngle / 2) / sliceAngle,
    );
    if (currentTick > lastTick) {
      dynamicInterval = Math.max(30, 150 - rampUp * 120);
      playTick();
      lastTick = currentTick;
    }

    animFrameId = requestAnimationFrame(spinUp);
  }
  animFrameId = requestAnimationFrame(spinUp);
});

spinBtn.addEventListener("mouseup", () => {
  if (!isSpinning) return;
  spinBtn.disabled = true;
  isSpinning = false;
  cancelAnimationFrame(animFrameId);

  const canvas = document.getElementById("wheel");
  const sliceAngle = (2 * Math.PI) / wheelItems.length;
  const durationSecs = parseInt(
    document.getElementById("durationSlider").value,
    10,
  );
  const duration = durationSecs * 1000;

  const startRotation = accumulatedRotation;
  const start = performance.now();

  const extraSpins = Math.max(5, Math.floor(durationSecs * 0.8));
  const randomTargetAngle = Math.random() * 2 * Math.PI;
  const targetRotation =
    startRotation + extraSpins * 2 * Math.PI + randomTargetAngle;

  let lastTick = Math.floor((startRotation + sliceAngle / 2) / sliceAngle);

  function spinDown(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);

    const ease = 1 - Math.pow(1 - progress, 4);
    const currentRotation =
      startRotation + (targetRotation - startRotation) * ease;

    canvas.style.transform = `rotate(${currentRotation}rad)`;

    const currentTick = Math.floor(
      (currentRotation + sliceAngle / 2) / sliceAngle,
    );
    if (currentTick > lastTick) {
      dynamicInterval = 50 + progress * 200;
      playTick();
      lastTick = currentTick;
    }

    if (progress < 1) {
      animFrameId = requestAnimationFrame(spinDown);
    } else {
      setTimeout(() => {
        launchConfetti();

        setTimeout(() => {
          toggleControls(false);

          const normalizedRotation = currentRotation % (2 * Math.PI);
          const winningIndex =
            Math.floor(
              (2 * Math.PI - normalizedRotation + sliceAngle / 2) / sliceAngle,
            ) % wheelItems.length;

          const winner = wheelItems[winningIndex];

          const successAudio = new Audio("success.mp3");
          successAudio.volume = 0.8;
          successAudio.play().catch(() => {});

          showWinnerModal(winner);
        }, 600);
      }, 1500);
    }
  }
  animFrameId = requestAnimationFrame(spinDown);
});

document.addEventListener("mouseup", () => {
  if (isSpinning) spinBtn.dispatchEvent(new Event("mouseup"));
});

// --- MODAL CLOSE ---
function closeModal() {
  document.getElementById("winnerModal").style.display = "none";
}

document.getElementById("closeModalBtn").addEventListener("click", closeModal);

document.getElementById("winnerModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("winnerModal")) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
