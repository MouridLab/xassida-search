const params = new URLSearchParams(window.location.search);
const work = (window.XASSIDA_WORKS || []).find(item => item.id === params.get("id"));

if (!work) {
  document.querySelector("#reader").classList.add("hidden");
  document.querySelector("#notFound").classList.remove("hidden");
} else {
  const validated = work.validation === "validated";
  document.title = `${work.title} — Xassida Search`;
  document.querySelector("#readerTitle").textContent = work.title;
  document.querySelector("#readerArabicTitle").textContent = work.arabicTitle;
  document.querySelector("#readerTheme").textContent = work.theme;
  document.querySelector("#readerDescription").textContent = work.description;
  const badge = document.querySelector("#validationBadge");
  badge.textContent = validated ? "✓ Contenu validé" : "◷ Validation en attente";
  badge.classList.toggle("validated", validated);
  document.querySelector("#readerSource").textContent = work.source || "Source à renseigner";
  document.querySelector("#readerValidation").textContent = validated
    ? `Validé par ${work.validatedBy}${work.validatedAt ? ` le ${work.validatedAt}` : ""}`
    : "Ce contenu ne doit pas être considéré comme validé";

  const metadata = [
    ["Auteur", work.author], ["Date", work.date || "À renseigner"],
    ["Thème", work.theme], ["Pages", work.pageCount || "À renseigner"]
  ];
  const meta = document.querySelector("#readerMeta");
  metadata.forEach(([label, value]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    row.append(dt, dd);
    meta.append(row);
  });

  const audio = document.querySelector("#audioPlayer");
  const audioEmpty = document.querySelector("#audioEmpty");
  document.querySelector("#audioDuration").textContent = work.audioDuration || "Durée à renseigner";
  if (work.files.audio) {
    audio.src = work.files.audio;
    audioEmpty.classList.add("hidden");
  } else {
    audio.classList.add("hidden");
    audioEmpty.textContent = "Aucun enregistrement audio validé n’est encore disponible.";
  }

  const pdf = document.querySelector("#pdfLink");
  if (work.files.pdf) pdf.href = work.files.pdf;
  else {
    pdf.removeAttribute("href");
    pdf.classList.add("disabled");
    pdf.textContent = "PDF non disponible";
    pdf.setAttribute("aria-disabled", "true");
  }

  function showContent(type) {
    const content = work.content[type];
    const container = document.querySelector("#readingContent");
    container.textContent = content || ({
      arabic: "Le texte arabe validé n’a pas encore été ajouté.",
      transcription: "La transcription validée n’a pas encore été ajoutée.",
      translation: "La traduction validée n’a pas encore été ajoutée."
    })[type];
    container.classList.toggle("arabic-text", type === "arabic" && Boolean(content));
    container.dir = type === "arabic" ? "rtl" : "ltr";
  }

  document.querySelectorAll(".reading-tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelector(".reading-tab.active").classList.remove("active");
    tab.classList.add("active");
    showContent(tab.dataset.content);
  }));
  showContent("arabic");
}
