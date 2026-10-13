// ==========================================================================
// TODO (Задачник, Фаза 1, п.6): вставить реальный вебхук Битрикс24 сюда
// ==========================================================================
const BITRIX_WEBHOOK_URL = ""; // например: "https://your-domain.bitrix24.ru/rest/1/xxxxxxxx/crm.lead.add.json"

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ
const ALLOWED_FILE_EXT = [".pdf", ".xlsx", ".docx"];

// ==========================================================================
// Мобильное меню — состояние только через CSS-класс, без инлайн-стилей
// (правит баг: инлайн display конфликтовал с медиазапросом и зависал при ресайзе)
// ==========================================================================
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");
if (navToggle && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
  mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  const desktopQuery = window.matchMedia("(min-width: 981px)");
  const handleBreakpointChange = (e) => { if (e.matches) closeMenu(); };
  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", handleBreakpointChange);
  } else if (desktopQuery.addListener) {
    desktopQuery.addListener(handleBreakpointChange); // старые Safari
  }
}

// ==========================================================================
// Счётчик цифр в hero
// ==========================================================================
function animateStats() {
  document.querySelectorAll(".stat .num").forEach((el) => {
    const target = Number(el.dataset.value || 0);
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(target * progress).toLocaleString("ru-RU");
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
const statRow = document.getElementById("statRow");
if (statRow && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { animateStats(); obs.disconnect(); }
    });
  }, { threshold: 0.4 });
  observer.observe(statRow);
} else {
  animateStats();
}

// ==========================================================================
// Блок «Кто вы?» — сегментация
// ==========================================================================
const segmentContent = {
  road: {
    pain: "Срыв графика поставки останавливает укладку — простаивает асфальтоукладчик и бригада.",
    offer: "Гарантию графика поставки договором и паспорт качества на каждую партию щебня."
  },
  developer: {
    pain: "Срыв поставок тормозит СМР, недовес искажает сметы, цена может вырасти в разгар сезона.",
    offer: "Фиксированную цену на объект/сезон, отсрочку платежа и снабжение «под ключ»."
  },
  concrete: {
    pain: "Глинистые и пылеватые примеси в заполнителе снижают прочность бетона и срывают рецептуру.",
    offer: "Одинаковое качество от партии к партии и протоколы лаборатории на каждую поставку."
  },
  gov: {
    pain: "Формальные требования к документам и риск штрафов при срыве срока по госконтракту.",
    offer: "Полный пакет документов для тендера и работу по 44-ФЗ/223-ФЗ."
  }
};

const segmentTiles = document.querySelectorAll(".segment-tile");
const painText = document.getElementById("painText");
const offerText = document.getElementById("offerText");
const caseCards = document.querySelectorAll(".case-card");
const segmentCaseLink = document.getElementById("segmentCaseLink");

segmentTiles.forEach((btn) => {
  btn.addEventListener("click", () => {
    segmentTiles.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");

    const key = btn.dataset.segment;
    const content = segmentContent[key];
    if (content) {
      painText.textContent = content.pain;
      offerText.textContent = content.offer;
    }
    caseCards.forEach((card) => card.classList.toggle("is-highlighted", card.dataset.segment === key));
  });
});

// Один обработчик на весь срок жизни страницы — читает активный сегмент в момент клика
// (правит баг: раньше на каждый клик по тайлу навешивался новый once-листенер)
if (segmentCaseLink) {
  segmentCaseLink.addEventListener("click", (e) => {
    const activeTile = document.querySelector(".segment-tile.is-active");
    const key = activeTile ? activeTile.dataset.segment : null;
    const activeCase = key ? document.querySelector(`.case-card[data-segment="${key}"]`) : null;
    if (activeCase) {
      e.preventDefault();
      activeCase.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

// ==========================================================================
// Каталог → «В расчёт» подставляет материал в калькулятор
// ==========================================================================
const materialSelect = document.getElementById("materialSelect");
document.querySelectorAll(".cell-pick a[data-material]").forEach((link) => {
  link.addEventListener("click", () => {
    if (materialSelect) materialSelect.value = link.dataset.material;
    updateSummary();
  });
});

// ==========================================================================
// Способ доставки — предупреждение при выборе ж/д (услуга ещё не запущена)
// ==========================================================================
const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
const deliveryWarning = document.getElementById("deliveryWarning");
function updateDeliveryWarning() {
  const checked = document.querySelector('input[name="delivery"]:checked');
  if (deliveryWarning) deliveryWarning.hidden = !(checked && checked.value === "rail");
}
deliveryRadios.forEach((radio) => radio.addEventListener("change", updateDeliveryWarning));
updateDeliveryWarning();

// Дата поставки — не раньше сегодняшнего дня
const dateField = document.querySelector('input[name="date"]');
if (dateField) {
  dateField.min = new Date().toISOString().split("T")[0];
}

// ==========================================================================
// Многошаговая форма-калькулятор + живая сводка
// ==========================================================================
const calcForm = document.getElementById("calcForm");
let renderCalcStep = () => {};
if (calcForm) {
  const steps = Array.from(calcForm.querySelectorAll(".wizard-step"));
  const dots = Array.from(calcForm.querySelectorAll(".step-dot"));
  const stepCurrentEl = document.getElementById("stepCurrent");
  const backBtn = document.getElementById("wizardBack");
  const nextBtn = document.getElementById("wizardNext");
  const submitBtn = document.getElementById("wizardSubmit");
  let currentStep = 0;

  function renderStep() {
    steps.forEach((step, i) => step.classList.toggle("is-active", i === currentStep));
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === currentStep));
    stepCurrentEl.textContent = String(currentStep + 1);
    backBtn.hidden = currentStep === 0;
    nextBtn.hidden = currentStep === steps.length - 1;
    submitBtn.hidden = currentStep !== steps.length - 1;
  }
  renderCalcStep = () => { currentStep = 0; renderStep(); };

  function currentStepIsValid() {
    const fields = steps[currentStep].querySelectorAll("input[required], select[required]");
    for (const field of fields) {
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  }

  nextBtn.addEventListener("click", () => {
    if (!currentStepIsValid()) return;
    if (currentStep < steps.length - 1) { currentStep += 1; renderStep(); }
  });
  backBtn.addEventListener("click", () => {
    if (currentStep > 0) { currentStep -= 1; renderStep(); }
  });

  calcForm.addEventListener("input", updateSummary);
  renderStep();

  wireFormSubmission(calcForm, {
    source: "calculator",
    onValidate: currentStepIsValid,
    successEl: document.getElementById("calcSuccess"),
    errorEl: document.getElementById("calcError"),
    onSuccess: () => { calcForm.reset(); renderCalcStep(); updateSummary(); }
  });
}

function updateSummary() {
  const form = document.getElementById("calcForm");
  if (!form) return;
  const data = new FormData(form);
  const materialLabel = materialSelect ? materialSelect.options[materialSelect.selectedIndex]?.text : "";
  const volume = data.get("volume");
  const unit = data.get("unit") === "m3" ? "м³" : "т";
  const address = data.get("address");
  const delivery = data.get("delivery") === "rail" ? "Ж/д (в подготовке)" : "Авто";

  const sumMaterial = document.getElementById("sumMaterial");
  const sumVolume = document.getElementById("sumVolume");
  const sumAddress = document.getElementById("sumAddress");
  const sumDelivery = document.getElementById("sumDelivery");
  if (sumMaterial) sumMaterial.textContent = materialLabel && materialLabel !== "Выберите материал" ? materialLabel : "—";
  if (sumVolume) sumVolume.textContent = volume ? `${volume} ${unit}` : "—";
  if (sumAddress) sumAddress.textContent = address || "—";
  if (sumDelivery) sumDelivery.textContent = delivery;
}
updateSummary();

// ==========================================================================
// Документы — переключение превью (раньше подсвечивалась только строка,
// содержимое справа оставалось от первого документа)
// ==========================================================================
const docContent = {
  0: {
    kind: "Образец · загрузить PDF",
    title: "Паспорт качества № [____] от [__.__.____]",
    org: "[Название организации] · ИНН [__________]",
    values: [["Марка прочности", "М1400"], ["Лещадность", "I группа"], ["Морозостойкость", "F300"]]
  },
  1: {
    kind: "Образец · загрузить PDF",
    title: "Протокол лаборатории № [____] от [__.__.____]",
    org: "[Название организации] · ИНН [__________]",
    values: [["Модуль крупности", "2,3"], ["Пылевидные частицы", "1,8%"], ["Глина в комках", "0%"]]
  }
};

const docRows = document.querySelectorAll(".doc-row");
const dpKind = document.getElementById("dpKind");
const dpTitle = document.getElementById("dpTitle");
const dpOrg = document.getElementById("dpOrg");
const dpValues = document.getElementById("dpValues");

function renderDocPreview(docIndex) {
  const content = docContent[docIndex];
  if (!content) return;
  if (dpKind) dpKind.textContent = content.kind;
  if (dpTitle) dpTitle.textContent = content.title;
  if (dpOrg) dpOrg.textContent = content.org;
  if (dpValues) {
    dpValues.innerHTML = "";
    content.values.forEach(([k, v]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      row.append(dt, dd);
      dpValues.appendChild(row);
    });
  }
}

docRows.forEach((row) => {
  row.addEventListener("click", () => {
    docRows.forEach((r) => r.classList.remove("is-active"));
    row.classList.add("is-active");
    renderDocPreview(row.dataset.doc);
    trackGoal("doc_view_" + row.dataset.doc);
  });
});

// ==========================================================================
// Финальная форма запроса КП — проверка вложенного файла
// ==========================================================================
const leadForm = document.getElementById("leadForm");
const fileErrorEl = document.getElementById("fileError");

function validateLeadFile() {
  if (!leadForm) return true;
  const fileInput = leadForm.querySelector('input[name="attachment"]');
  if (!fileInput || !fileInput.files.length) {
    if (fileErrorEl) fileErrorEl.textContent = "";
    return true;
  }
  const file = fileInput.files[0];
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_FILE_EXT.includes(ext)) {
    if (fileErrorEl) fileErrorEl.textContent = `Допустимые форматы: ${ALLOWED_FILE_EXT.join(", ")}.`;
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    if (fileErrorEl) fileErrorEl.textContent = "Файл больше 20 МБ — прикрепите файл меньшего размера.";
    return false;
  }
  if (fileErrorEl) fileErrorEl.textContent = "";
  return true;
}
if (leadForm) {
  leadForm.querySelector('input[name="attachment"]')?.addEventListener("change", validateLeadFile);
}

// ==========================================================================
// Единая обвязка отправки форм: валидация → submitLead → успех/ошибка
// ==========================================================================
function wireFormSubmission(form, { source, onValidate, successEl, errorEl, onSuccess }) {
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (onValidate && !onValidate()) return;
    if (errorEl) errorEl.hidden = true;

    try {
      await submitLead(form, source);
      form.hidden = true;
      if (successEl) successEl.hidden = false;
      if (onSuccess) onSuccess();
      trackGoal(source + "_submit");
    } catch (err) {
      console.error(`[${source}] Не удалось отправить форму`, err);
      if (errorEl) errorEl.hidden = false;
    }
  });

  if (errorEl) {
    const retryBtn = errorEl.querySelector("[data-retry]");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        errorEl.hidden = true;
        form.hidden = false;
      });
    }
  }
}

wireFormSubmission(leadForm, {
  source: "final-cta",
  onValidate: () => leadForm.reportValidity() && validateLeadFile(),
  successEl: document.getElementById("leadSuccess"),
  errorEl: document.getElementById("leadError"),
  onSuccess: () => leadForm.reset()
});

const railForm = document.getElementById("railForm");
wireFormSubmission(railForm, {
  source: "rail-interest",
  onValidate: () => railForm.reportValidity(),
  successEl: document.getElementById("railSuccess"),
  errorEl: document.getElementById("railError"),
  onSuccess: () => railForm.reset()
});

// ==========================================================================
// Чтение файла в base64 — чтобы вложение реально попадало в заявку,
// а не терялось молча при JSON.stringify(File)
// ==========================================================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ==========================================================================
// Общая отправка заявки в Битрикс24.
// Если вебхук не настроен ИЛИ запрос завершился ошибкой — промис реджектится,
// чтобы вызывающий код показал пользователю реальную ошибку, а не "успех".
// ==========================================================================
async function submitLead(form, source) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.source = source;
  data.page = "landing-mvp";
  data.timestamp = new Date().toISOString();

  const fileField = formData.get("attachment");
  if (fileField instanceof File && fileField.size > 0) {
    data.attachment_name = fileField.name;
    data.attachment_type = fileField.type;
    data.attachment_size = fileField.size;
    try {
      data.attachment_base64 = await fileToBase64(fileField);
    } catch (err) {
      console.error("[submitLead] Не удалось прочитать вложенный файл", err);
    }
  }
  delete data.attachment; // сырой File не сериализуется в JSON — заменён полями выше

  if (!BITRIX_WEBHOOK_URL) {
    console.warn("[Bitrix24] Вебхук не настроен — заявка НЕ отправлена. Данные заявки для отладки:", data);
    throw new Error("CRM_NOT_CONFIGURED");
  }

  const response = await fetch(BITRIX_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        TITLE: `Заявка с лендинга (${source})`,
        NAME: data.name || "",
        COMMENTS: JSON.stringify(data),
        PHONE: data.phone ? [{ VALUE: data.phone, VALUE_TYPE: "WORK" }] : []
      }
    })
  });

  if (!response.ok) {
    throw new Error(`CRM_HTTP_${response.status}`);
  }
  return response;
}

// ==========================================================================
// Аналитика — TODO: подключить счётчик Яндекс.Метрики (Задачник, Фаза 4, п.5)
// ==========================================================================
function trackGoal(goalName) {
  if (window.ym) {
    // window.ym(COUNTER_ID, "reachGoal", goalName);
  }
  console.info("[Analytics] goal:", goalName);
}
document.querySelectorAll("[data-analytics]").forEach((el) => {
  el.addEventListener("click", () => trackGoal(el.dataset.analytics));
});
