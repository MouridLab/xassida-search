const dataScript = document.createElement("script");
dataScript.src = "data.js";
dataScript.addEventListener("load", initializeApp);
document.head.append(dataScript);

function initializeApp() {
  const works = window.XASSIDA_WORKS || [];
  const results = document.querySelector("#results");
  const template = document.querySelector("#cardTemplate");
  const input = document.querySelector("#searchInput");
  const count = document.querySelector("#resultCount");
  const empty = document.querySelector("#emptyState");
  const dialog = document.querySelector("#detailDialog");
  let activeFilter = "all";

  const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'ʿ]/g, "").trim();
  const formats = work => [work.files.pdf && "pdf", work.files.audio && "audio", work.content.arabic && "arabe"].filter(Boolean);

  function openDetails(work) {
    document.querySelector("#dialogTitle").textContent = work.title;
    document.querySelector("#dialogArabic").textContent = work.arabicTitle;
    document.querySelector("#dialogDescription").textContent = work.description;
    const meta = document.querySelector("#dialogMeta");
    meta.innerHTML = "";
    [work.author, work.theme, work.source || "Source à renseigner", work.validation === "validated" ? "Contenu validé" : "Validation en attente"].forEach(item => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = item;
      meta.append(span);
    });
    const notice = dialog.querySelector(".notice");
    notice.textContent = work.validation === "validated"
      ? `Validé par ${work.validatedBy}.`
      : "Aucun document n’est présenté comme validé sans source et responsable de validation identifiés.";
    dialog.showModal();
  }

  function render() {
    const query = normalize(input.value);
    const filtered = works.filter(work => {
      const text = normalize([work.title, work.arabicTitle, work.author, work.theme, work.description, work.tags.join(" "), work.aliases].join(" "));
      return (!query || query.split(/\s+/).every(word => text.includes(word))) && (activeFilter === "all" || formats(work).includes(activeFilter));
    });
    results.innerHTML = "";
    filtered.forEach(work => {
      const card = template.content.cloneNode(true);
      const available = formats(work);
      card.querySelector(".category").textContent = work.theme;
      card.querySelector(".formats").textContent = available.length ? available.map(value => value.toUpperCase()).join(" · ") : "À COMPLÉTER";
      card.querySelector(".title").textContent = work.title;
      card.querySelector(".arabic").textContent = work.arabicTitle;
      card.querySelector(".description").textContent = work.description;
      const tags = card.querySelector(".tags");
      work.tags.forEach(tag => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        tags.append(span);
      });
      const read = card.querySelector(".primary-action");
      read.textContent = "Lire";
      read.addEventListener("click", () => { window.location.href = `reader.html?id=${encodeURIComponent(work.id)}`; });
      card.querySelector(".secondary-action").addEventListener("click", () => openDetails(work));
      results.append(card);
    });
    count.textContent = `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`;
    empty.classList.toggle("hidden", filtered.length !== 0);
  }

  input.addEventListener("input", render);
  document.querySelector("#searchButton").addEventListener("click", render);
  document.querySelectorAll(".quick-links button").forEach(button => button.addEventListener("click", () => {
    input.value = button.dataset.query;
    render();
    document.querySelector("#bibliotheque").scrollIntoView();
  }));
  document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  }));
  document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  document.querySelector("#countWorks").textContent = works.length;
  render();
}
