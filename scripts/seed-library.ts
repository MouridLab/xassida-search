import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Configuration Supabase manquante");
const db = createClient(url, key, { auth: { persistSession: false } });

const items = [
  {
    slug: "origines-sens-grand-magal-touba",
    title: "Origines et sens du Grand Magal de Touba",
    description:
      "Présentation institutionnelle de l’exil de Cheikh Ahmadou Bamba et des dimensions spirituelle, sociale, économique et culturelle du Grand Magal.",
    item_type: "article",
    author: "Comité d’organisation du Grand Magal de Touba",
    language: "fr",
    themes: ["Grand Magal", "exil", "histoire", "spiritualité"],
    resource_url: "https://magal-touba.org/2026/01/02/origines-et-sens-dun-pelerinage/",
    source_name: "Site officiel du Grand Magal de Touba",
    is_featured: true,
    is_verified: true,
  },
  {
    slug: "mouridiyya-en-marche-introduction",
    title: "La Mouridiyya en marche — Introduction",
    description:
      "Introduction académique consacrée à l’histoire, aux espaces et à l’expansion internationale de la Mouridiyya.",
    item_type: "book",
    author: "Éditions de la Maison des sciences de l’homme",
    publisher: "OpenEdition Books",
    language: "fr",
    themes: ["histoire", "diaspora", "Mouridiyya"],
    resource_url: "https://books.openedition.org/editionsmsh/79014",
    source_name: "OpenEdition Books",
    is_featured: true,
    is_verified: true,
  },
  {
    slug: "muslim-politics-development-senegal",
    title: "Muslim Politics and Development in Senegal",
    description:
      "Article universitaire en anglais sur les relations entre organisations musulmanes, politique et développement au Sénégal, notamment la Mouridiyya.",
    item_type: "article",
    publisher: "Cambridge University Press",
    language: "en",
    themes: ["politique", "développement", "Sénégal", "Mouridiyya"],
    resource_url:
      "https://www.cambridge.org/core/journals/journal-of-modern-african-studies/article/abs/muslim-politics-and-development-in-senegal/5725BD907CBBB3A8F0270BC008632EB5",
    source_name: "The Journal of Modern African Studies",
    is_featured: false,
    is_verified: true,
  },
  {
    slug: "turuq-sufiyya-senegal-ar",
    title: "الطرق الصوفية في السنغال: بنياتها الاجتماعية وأدوارها السياسية",
    description:
      "دراسة عربية حول الطرق الصوفية في السنغال وبنياتها الاجتماعية وأدوارها السياسية، وتتضمن قسمًا عن الشيخ أحمد بمبا والطريقة المريدية.",
    item_type: "article",
    author: "مركز الجزيرة للدراسات",
    language: "ar",
    themes: ["التصوف", "السنغال", "المريدية", "السياسة"],
    resource_url: "https://studies.aljazeera.net/ar/reports/2018/08/180805121751184.html",
    source_name: "مركز الجزيرة للدراسات",
    is_featured: true,
    is_verified: true,
  },
  {
    slug: "bassirou-khelcom-vie-oeuvre-serigne-saliou",
    title: "Vie et œuvre de Serigne Saliou Mbacké",
    subtitle: "Conférence de Serigne Bassirou Mbacké Khélcom — Marseille 2017",
    description:
      "Conférence en wolof consacrée à la vie, à l’enseignement et à l’œuvre de Serigne Saliou Mbacké.",
    item_type: "conference",
    author: "Serigne Bassirou Mbacké Khélcom",
    publication_year: 2017,
    language: "wo",
    themes: ["Serigne Saliou Mbacké", "éducation", "histoire"],
    resource_url: "https://www.youtube.com/watch?v=gi50IC2xIGE",
    source_name: "Mourides de France",
    is_featured: true,
    is_verified: true,
  },
  {
    slug: "conferences-serigne-sam-mbaye",
    title: "Conférences de Serigne Sam Mbaye",
    description:
      "Collection de conférences en wolof consacrées notamment au Coran, au temps, au Mujaddid et au Mouride Sadikh.",
    item_type: "audio",
    author: "Serigne Sam Mbaye",
    language: "wo",
    themes: ["Coran", "éducation", "Mouride Sadikh", "spiritualité"],
    resource_url: "https://www.mourides.com/ecouter-et-telecharger-les-conferences-de-serigne",
    source_name: "Mourides.com",
    is_featured: true,
    is_verified: true,
  },
] as const;

const { data, error } = await db
  .from("library_items")
  .upsert(items, { onConflict: "slug" })
  .select("slug,title,language,item_type");
if (error) throw error;
console.log(`${data.length} ressources validées enregistrées`);
for (const item of data) console.log(`- [${item.language}] ${item.title}`);
