"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  ImageIcon,
  LogOut,
  Plus,
  UploadCloud,
} from "lucide-react";
import { browserClient } from "@/lib/supabase";
import type { Khassida } from "@/types/database";

async function api(url: string, options: RequestInit = {}) {
  const { data, error } = await browserClient().auth.getSession();
  if (error || !data.session) throw new Error("SESSION_EXPIRED");
  const response = await fetch(url, {
    ...options,
    headers: { ...options.headers, authorization: `Bearer ${data.session.access_token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("SESSION_EXPIRED");
  if (!response.ok) throw new Error(body.error || "L’opération a échoué.");
  return body;
}

export function AdminDashboard() {
  const router = useRouter();
  const [works, setWorks] = useState<Khassida[]>([]);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [role, setRole] = useState("");
  const [editingId, setEditingId] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const handleError = useCallback(
    (reason: unknown) => {
      if (reason instanceof Error && reason.message === "SESSION_EXPIRED") {
        router.replace("/admin/login");
        return;
      }
      setError(reason instanceof Error ? reason.message : "Une erreur inattendue est survenue.");
    },
    [router],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = await api("/api/admin/khassidas");
      setWorks(body.items || []);
      setRole(body.role || "");
    } catch (reason) {
      handleError(reason);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(
    key: string,
    action: () => Promise<void>,
    success: string,
  ) {
    setPending(key);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (reason) {
      handleError(reason);
    } finally {
      setPending("");
    }
  }

  async function addWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "work",
      async () => {
        await api("/api/admin/khassidas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: values.get("title"),
            arabic_title: values.get("arabic_title") || null,
            aliases: splitList(values.get("aliases")),
            themes: splitList(values.get("themes")),
            description: values.get("description") || null,
            page_count: optionalNumber(values.get("page_count")),
            verse_count: optionalNumber(values.get("verse_count")),
          }),
        });
        form.reset();
        await load();
      },
      "Khassaïde ajouté en brouillon.",
    );
  }

  async function addChunk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "chunk",
      async () => {
        await api("/api/admin/chunks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(Object.fromEntries(values)),
        });
        form.reset();
        setSelected("");
      },
      "Passage ajouté. L’embedding a été calculé si OpenAI est configuré.",
    );
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "upload",
      async () => {
        await api("/api/admin/upload", { method: "POST", body: values });
        form.reset();
      },
      "Fichier stocké dans MinIO et défini comme média principal.",
    );
  }

  function previewCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : "");
  }

  async function uploadCover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    values.set("khassida_id", editingId);
    values.set("kind", "cover");
    await submit("cover", async () => {
      await api("/api/admin/upload", { method: "POST", body: values });
      form.reset();
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      setCoverPreview("");
      await load();
    }, "Couverture importée dans MinIO et affichée sur le site.");
  }

  async function updateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit("edit", async () => {
      await api("/api/admin/khassidas", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingId, title: values.get("title"), arabic_title: values.get("arabic_title") || null, aliases: splitList(values.get("aliases")), themes: splitList(values.get("themes")), description: values.get("description") || null, page_count: optionalNumber(values.get("page_count")), verse_count: optionalNumber(values.get("verse_count")) }) });
      await load();
    }, "Fiche et thèmes mis à jour.");
  }

  async function setPublished(work: Khassida, isVerified: boolean) {
    await submit(`publish-${work.id}`, async () => {
      await api("/api/admin/khassidas", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: work.id, is_verified: isVerified }) });
      await load();
    }, isVerified ? "Khassaïde publié." : "Khassaïde remis en brouillon.");
  }

  const editing = works.find((work) => work.id === editingId);

  async function signOut() {
    await browserClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-8 lg:px-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
              Gestion du corpus
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Administration</h1>
            <p className="mt-2 text-sm text-slate-500">Khassaïdes, passages et médias privés.</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-5 py-8 lg:px-8">
        {notice && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} /> {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-3">
          <AdminCard icon={Plus} title="Ajouter un khassaïde" description="Créer sa fiche bibliographique en brouillon.">
            <form onSubmit={addWork} className="space-y-4">
              <Field name="title" label="Titre officiel" required />
              <Field name="arabic_title" label="Titre arabe" dir="rtl" />
              <Field name="aliases" label="Variantes séparées par des virgules" />
              <Field name="themes" label="Thèmes séparés par des virgules" />
              <Field name="description" label="Description" area />
              <div className="grid grid-cols-2 gap-3"><Field name="page_count" label="Nombre de pages" type="number" /><Field name="verse_count" label="Nombre de vers" type="number" /></div>
              <SubmitButton busy={pending === "work"}>Enregistrer le brouillon</SubmitButton>
            </form>
          </AdminCard>

          <AdminCard icon={BookOpen} title="Ajouter un passage" description="Séparer original, transcription, traduction et commentaire.">
            <form onSubmit={addChunk} className="space-y-4">
              <SelectWork works={works} value={selected} onChange={setSelected} />
              <Field name="arabic_text" label="Texte arabe original" area dir="rtl" />
              <Field name="transcription" label="Transcription" area />
              <Field name="french_translation" label="Traduction validée" area />
              <Field name="commentary" label="Commentaire" area />
              <div className="grid grid-cols-2 gap-3">
                <Field name="chapter_number" label="Chapitre" type="number" />
                <Field name="page_number" label="Page" type="number" />
                <Field name="verse_start" label="Premier vers" type="number" />
                <Field name="verse_end" label="Dernier vers" type="number" />
              </div>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Statut
                <select name="validation_status" className={controlClass}>
                  <option value="draft">Brouillon</option>
                  <option value="review">À valider</option>
                  <option value="verified">Validé — validateur ou admin</option>
                </select>
              </label>
              <SubmitButton busy={pending === "chunk"}>Ajouter le passage</SubmitButton>
            </form>
          </AdminCard>

          <AdminCard icon={UploadCloud} title="Importer un média" description="Les PDF et audios sont stockés dans MinIO privé.">
            <form onSubmit={upload} className="space-y-4">
              <SelectWork works={works} />
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Type de média
                <select name="kind" className={controlClass}>
                  <option value="pdf">PDF — 60 Mo maximum</option>
                  <option value="audio">Audio — 150 Mo maximum</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
                Fichier
                <input name="file" type="file" accept="application/pdf,audio/*" required className={controlClass} />
              </label>
              <SubmitButton busy={pending === "upload"}>Stocker dans MinIO</SubmitButton>
            </form>
          </AdminCard>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Edit3 size={19} /></span><div><h2 className="font-bold">Modifier une fiche</h2><p className="mt-1 text-xs text-slate-500">Titres, description, thèmes, nombre de pages et nombre de vers.</p></div></div>
          <div className="mt-5"><SelectWork works={works} value={editingId} onChange={setEditingId} /></div>
          {editing && <><form key={editing.id} onSubmit={updateWork} className="mt-5 grid gap-4 lg:grid-cols-2"><Field name="title" label="Titre officiel" required defaultValue={editing.title} /><Field name="arabic_title" label="Titre arabe" dir="rtl" defaultValue={editing.arabic_title || ""} /><Field name="aliases" label="Variantes" defaultValue={editing.aliases.join(", ")} /><Field name="themes" label="Thèmes abordés" defaultValue={editing.themes.join(", ")} /><Field name="page_count" label="Nombre de pages" type="number" defaultValue={editing.page_count || ""} /><Field name="verse_count" label="Nombre de vers" type="number" defaultValue={editing.verse_count || ""} /><div className="lg:col-span-2"><Field name="description" label="Description" area defaultValue={editing.description || ""} /></div><div className="lg:col-span-2"><SubmitButton busy={pending === "edit"}>Enregistrer les modifications</SubmitButton></div></form><form onSubmit={uploadCover} className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-[150px_minmax(0,1fr)]"><div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">{coverPreview || editing.cover_url ? <img src={coverPreview || editing.cover_url || ""} alt={`Aperçu de la couverture de ${editing.title}`} className="size-full object-contain" /> : <div className="text-center"><ImageIcon className="mx-auto" size={28} /><span className="mt-2 block text-[10px]">Aucune couverture</span></div>}</div><div><h3 className="font-bold">Photo de couverture</h3><p className="mt-1 text-xs leading-5 text-slate-500">PNG, JPG ou WebP, 10 Mo maximum. Une nouvelle image remplace automatiquement la couverture principale.</p><input name="file" type="file" accept="image/png,image/jpeg,image/webp" required onChange={previewCover} className={`${controlClass} mt-4`} /><div className="mt-3"><SubmitButton busy={pending === "cover"}>{editing.cover_url ? "Remplacer la couverture" : "Importer la couverture"}</SubmitButton></div></div></form></>}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Corpus</span>
              <h2 className="mt-1 text-xl font-bold">{loading ? "Chargement…" : `${works.length} khassaïde${works.length !== 1 ? "s" : ""}`}</h2>
            </div>
          </div>
          {!loading && works.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Aucune fiche disponible pour ce compte.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {works.map((work) => (
                <article key={work.id} className="rounded-2xl border border-slate-200 p-4">
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${work.is_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {work.is_verified ? "Publié" : "Brouillon"}
                  </span>
                  <h3 className="mt-3 font-bold">{work.title}</h3>
                  {work.arabic_title && <p dir="rtl" className="mt-1 font-arabic text-xl">{work.arabic_title}</p>}
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">{work.aliases.join(" · ") || "Aucune variante"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-600">{work.page_count && <span className="rounded-full bg-slate-100 px-2 py-1">{work.page_count} pages</span>}{work.verse_count && <span className="rounded-full bg-slate-100 px-2 py-1">{work.verse_count} vers</span>}{work.cover_url && <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"><ImageIcon size={11} /> Couverture</span>}</div>
                  <button onClick={() => setEditingId(work.id)} className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold">Modifier</button>
                  {['validator','admin'].includes(role) && <button disabled={pending === `publish-${work.id}`} onClick={() => void setPublished(work,!work.is_verified)} className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold text-white ${work.is_verified ? "bg-amber-600" : "bg-emerald-800"}`}>{work.is_verified ? "Remettre en brouillon" : "Publier"}</button>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const controlClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function splitList(value: FormDataEntryValue | null) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}
function optionalNumber(value: FormDataEntryValue | null) { const parsed=Number(value); return value && Number.isInteger(parsed) && parsed>0 ? parsed : null; }
function AdminCard({ icon: Icon, title, description, children }: { icon: typeof BookOpen; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><header className="mb-6 flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon size={20} /></span><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></header>{children}</section>;
}
function Field({ name, label, area, type = "text", required, dir, defaultValue }: { name: string; label: string; area?: boolean; type?: string; required?: boolean; dir?: "rtl"; defaultValue?: string|number }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-slate-700">{label}{area ? <textarea name={name} required={required} dir={dir} defaultValue={defaultValue} className={`${controlClass} min-h-24 resize-y`} /> : <input name={name} type={type} required={required} dir={dir} defaultValue={defaultValue} min={type === "number" ? 1 : undefined} className={controlClass} />}</label>;
}
function SelectWork({ works, value, onChange }: { works: Khassida[]; value?: string; onChange?: (value: string) => void }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-slate-700">Khassaïde<select name="khassida_id" required value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className={controlClass}><option value="">Choisir…</option>{works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}</select></label>;
}
function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">{busy ? "Traitement…" : children}</button>;
}
