const works = [
  {
    title: "Masaalikul Jinaan",
    arabic: "مَسَالِكُ الْجِنَان",
    category: "Éducation spirituelle",
    description: "Œuvre consacrée à l’élévation spirituelle, à la purification du cœur et aux bonnes œuvres.",
    tags: ["Spiritualité", "Éducation", "Vertus"],
    formats: ["pdf", "audio", "arabe"],
    aliases: "masalikoul jinaan masaalik masalik paradis"
  },
  {
    title: "Matlaboul Fawzayni",
    arabic: "مَطْلَبُ الْفَوْزَيْنِ",
    category: "Prière et bénédictions",
    description: "Texte de dévotion et de quête des deux bonheurs, associé à la ville sainte de Touba.",
    tags: ["Touba", "Prière", "Bénédictions"],
    formats: ["pdf", "audio", "arabe"],
    aliases: "matlabul fawzeyni matlaboul fawzaini"
  },
  {
    title: "Jazbul Qulub",
    arabic: "جَذْبُ الْقُلُوب",
    category: "Éloge prophétique",
    description: "Poème d’amour, de dévotion et d’éloge consacré au Prophète Mouhammed ﷺ.",
    tags: ["Prophète", "Éloge", "Amour"],
    formats: ["pdf", "audio", "arabe"],
    aliases: "jazbul khouloub jazboul kouloub prophete"
  },
  {
    title: "Mawāhibun Nāfiʿ",
    arabic: "مَوَاهِبُ النَّافِع",
    category: "Science et bienfaits",
    description: "Khassida évoquant les dons, les connaissances utiles et la proximité spirituelle.",
    tags: ["Savoir", "Bienfaits", "Foi"],
    formats: ["pdf", "arabe"],
    aliases: "mawahibun nafi mawahibu naafi"
  },
  {
    title: "Tazawwudush Shubbān",
    arabic: "تَزَوُّدُ الشُّبَّان",
    category: "Formation de la jeunesse",
    description: "Conseils spirituels, moraux et pratiques destinés notamment à la jeunesse.",
    tags: ["Jeunesse", "Conseils", "Comportement"],
    formats: ["pdf", "arabe"],
    aliases: "tazawwudush shubban jeunesse"
  },
  {
    title: "Munawwirus Sudūr",
    arabic: "مُنَوِّرُ الصُّدُور",
    category: "Purification du cœur",
    description: "Œuvre orientée vers l’illumination des cœurs, la foi et le perfectionnement intérieur.",
    tags: ["Cœur", "Lumière", "Foi"],
    formats: ["audio", "arabe"],
    aliases: "munawwiru sudur mounawirou soudour"
  }
];

const results = document.querySelector("#results");
const template = document.querySelector("#cardTemplate");
const input = document.querySelector("#searchInput");
const count = document.querySelector("#resultCount");
const empty = document.querySelector("#emptyState");
const dialog = document.querySelector("#detailDialog");
let activeFilter = "all";

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'ʿ]/g, "")
    .trim();
}

function openDetails(work) {
  document.querySelector("#dialogTitle").textContent = work.title;
  document.querySelector("#dialogArabic").textContent = work.arabic;
  document.querySelector("#dialogDescription").textContent = work.description;
  const meta = document.querySelector("#dialogMeta");
  meta.innerHTML = "";
  [work.category, ...work.tags, ...work.formats.map(f => f.toUpperCase())].forEach(item => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = item;
    meta.append(span);
  });
  dialog.showModal();
}

function render() {
  const query = normalize(input.value);
  const filtered = works.filter(work => {
    const haystack = normalize([
      work.title,
      work.arabic,
      work.category,
      work.description,
      work.tags.join(" "),
      work.aliases
    ].join(" "));
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = activeFilter === "all" || work.formats.includes(activeFilter);
    return matchesQuery && matchesFilter;
  });

  results.innerHTML = "";
  filtered.forEach(work => {
    const card = template.content.cloneNode(true);
    card.querySelector(".category").textContent = work.category;
    card.querySelector(".formats").textContent = work.formats.map(f => f.toUpperCase()).join(" · ");
    card.querySelector(".title").textContent = work.title;
    card.querySelector(".arabic").textContent = work.arabic;
    card.querySelector(".description").textContent = work.description;

    const tags = card.querySelector(".tags");
    work.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      tags.append(span);
    });

    card.querySelector(".primary-action").addEventListener("click", () => openDetails(work));
    card.querySelector(".secondary-action").addEventListener("click", () => openDetails(work));
    results.append(card);
  });

  count.textContent = `${filtered.length} résultat${filtered.length > 1 ? "s" : ""}`;
  empty.classList.toggle("hidden", filtered.length !== 0);
}

input.addEventListener("input", render);
document.querySelector("#searchButton").addEventListener("click", render);

document.querySelectorAll(".quick-links button").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.query;
    render();
    document.querySelector("#bibliotheque").scrollIntoView();
  });
});

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active").classList.remove("active");
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  });
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  const box = dialog.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  if (outside) dialog.close();
});

render();
