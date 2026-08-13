"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Edit3,
  ImageIcon,
  Languages,
  LogOut,
  Eye,
  XCircle,
  Plus,
  UploadCloud,
} from "lucide-react";
import { browserClient } from "@/lib/supabase";
import type { Khassida } from "@/types/database";

type AdminEdition = {
  id: string;
  language: string;
  edition_kind: "original" | "translation" | "transcription";
  title: string | null;
  translator: string | null;
  publisher: string | null;
  publication_year: number | null;
  page_count: number | null;
  source_name: string | null;
  file_name: string;
  file_size: number | null;
  validation_status: "review" | "verified" | "disabled";
  khassidas: { title: string; slug: string };
};

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

async function directUpload(values: FormData, kind: "pdf" | "audio" | "cover" | "edition") {
  const file = values.get("file");
  if (!(file instanceof File)) throw new Error("Fichier manquant.");
  const edition =
    kind === "edition"
      ? {
          language: String(values.get("language")),
          edition_kind: String(values.get("edition_kind")),
          title: stringOrUndefined(values.get("title")),
          translator: stringOrUndefined(values.get("translator")),
          publisher: stringOrUndefined(values.get("publisher")),
          source_name: stringOrUndefined(values.get("source_name")),
          publication_year: numberOrUndefined(values.get("publication_year")),
          page_count: numberOrUndefined(values.get("page_count")),
          validation_status: String(values.get("validation_status") || "review"),
        }
      : undefined;
  const authorization = await api("/api/admin/uploads/authorize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      khassida_id: values.get("khassida_id"),
      kind,
      filename: file.name,
      content_type: file.type,
      size: file.size,
      edition,
    }),
  });
  const uploaded = await fetch(authorization.upload_url, {
    method: "PUT",
    headers: authorization.required_headers,
    body: file,
  });
  if (!uploaded.ok) throw new Error("L’envoi direct vers MinIO a échoué.");
  await api("/api/admin/uploads/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ upload_id: authorization.upload_id }),
  });
}

export function AdminDashboard() {
  const router = useRouter();
  const [works, setWorks] = useState<Khassida[]>([]);
  const [editions, setEditions] = useState<AdminEdition[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [role, setRole] = useState("");
  const [editingId, setEditingId] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [previewEdition, setPreviewEdition] = useState<AdminEdition | null>(null);
  const [editionPreviewUrl, setEditionPreviewUrl] = useState("");

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
      const [worksBody, editionsBody] = await Promise.all([
        api("/api/admin/khassidas"),
        api("/api/admin/editions"),
      ]);
      setWorks(worksBody.items || []);
      setRole(worksBody.role || "");
      setEditions(editionsBody.items || []);
    } catch (reason) {
      handleError(reason);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      if (editionPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(editionPreviewUrl);
    },
    [editionPreviewUrl],
  );

  async function submit(key: string, action: () => Promise<void>, success: string) {
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

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "upload",
      async () => {
        await directUpload(values, String(values.get("kind")) as "pdf" | "audio");
        form.reset();
      },
      "Fichier stocké dans MinIO et défini comme média principal.",
    );
  }

  async function uploadEdition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "edition",
      async () => {
        await directUpload(values, "edition");
        form.reset();
        await load();
      },
      "Édition PDF enregistrée dans MinIO.",
    );
  }

  async function reviewEdition(edition: AdminEdition, status: "verified" | "disabled") {
    await submit(
      `review-${edition.id}`,
      async () => {
        await api("/api/admin/editions", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: edition.id, validation_status: status }),
        });
        if (previewEdition?.id === edition.id) setPreviewEdition(null);
        await load();
      },
      status === "verified" ? "Édition validée et publiée." : "Édition rejetée.",
    );
  }

  async function openEditionPreview(edition: AdminEdition) {
    await submit(
      `preview-${edition.id}`,
      async () => {
        const { data, error: sessionError } = await browserClient().auth.getSession();
        if (sessionError || !data.session) throw new Error("SESSION_EXPIRED");
        const response = await fetch(`/api/admin/editions?id=${encodeURIComponent(edition.id)}`, {
          headers: { authorization: `Bearer ${data.session.access_token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Impossible de charger l’aperçu PDF.");
        }
        const blob = await response.blob();
        if (blob.type !== "application/pdf")
          throw new Error("Le fichier reçu n’est pas un PDF valide.");
        setEditionPreviewUrl(URL.createObjectURL(blob));
        setPreviewEdition(edition);
      },
      "",
    );
  }

  function closeEditionPreview() {
    setPreviewEdition(null);
    setEditionPreviewUrl("");
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
    await submit(
      "cover",
      async () => {
        await directUpload(values, "cover");
        form.reset();
        if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
        setCoverPreview("");
        await load();
      },
      "Couverture importée dans MinIO et affichée sur le site.",
    );
  }

  async function updateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await submit(
      "edit",
      async () => {
        await api("/api/admin/khassidas", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            title: values.get("title"),
            arabic_title: values.get("arabic_title") || null,
            aliases: splitList(values.get("aliases")),
            themes: splitList(values.get("themes")),
            description: values.get("description") || null,
            page_count: optionalNumber(values.get("page_count")),
            verse_count: optionalNumber(values.get("verse_count")),
          }),
        });
        await load();
      },
      "Fiche et thèmes mis à jour.",
    );
  }

  async function setPublished(work: Khassida, isVerified: boolean) {
    await submit(
      `publish-${work.id}`,
      async () => {
        await api("/api/admin/khassidas", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: work.id, is_verified: isVerified }),
        });
        await load();
      },
      isVerified ? "Khassaïde publié." : "Khassaïde remis en brouillon.",
    );
  }

  const editing = works.find((work) => work.id === editingId);

  async function signOut() {
    await browserClient().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="admin-manuscript min-h-screen bg-canvas pb-20 text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1320px] items-end justify-between gap-6 px-5 py-10 lg:px-8 lg:py-14">
          <div className="border-l border-gold pl-5">
            <span className="folio-label">Atelier éditorial · accès réservé</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
              Administration
            </h1>
            <p className="mt-3 text-sm text-muted">Khassaïdes, éditions et médias privés.</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 border-b border-brand px-1 py-2.5 text-xs font-semibold uppercase tracking-[.1em] text-brand"
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
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <AdminCard
            icon={Plus}
            title="Ajouter un khassaïde"
            description="Créer sa fiche bibliographique en brouillon."
          >
            <form onSubmit={addWork} className="space-y-4">
              <Field name="title" label="Titre officiel" required />
              <Field name="arabic_title" label="Titre arabe" dir="rtl" />
              <Field name="aliases" label="Variantes séparées par des virgules" />
              <Field name="themes" label="Thèmes séparés par des virgules" />
              <Field name="description" label="Description" area />
              <div className="grid grid-cols-2 gap-3">
                <Field name="page_count" label="Nombre de pages" type="number" />
                <Field name="verse_count" label="Nombre de vers" type="number" />
              </div>
              <SubmitButton busy={pending === "work"}>Enregistrer le brouillon</SubmitButton>
            </form>
          </AdminCard>

          <AdminCard
            icon={UploadCloud}
            title="Importer un média"
            description="Les PDF et audios sont stockés dans MinIO privé."
          >
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
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,audio/*"
                  required
                  className={controlClass}
                />
              </label>
              <SubmitButton busy={pending === "upload"}>Stocker dans MinIO</SubmitButton>
            </form>
          </AdminCard>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <Languages size={20} />
            </span>
            <div>
              <h2 className="font-bold">Ajouter une édition ou une traduction</h2>
              <p className="mt-1 text-xs text-slate-500">
                Plusieurs PDF peuvent appartenir au même khassaïde sans remplacer l’original.
              </p>
            </div>
          </div>
          <form onSubmit={uploadEdition} className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SelectWork works={works} />
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Type d’édition
              <select name="edition_kind" className={controlClass}>
                <option value="translation">Traduction</option>
                <option value="original">Original</option>
                <option value="transcription">Transcription</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Langue
              <select name="language" className={controlClass}>
                <option value="fr">Français</option>
                <option value="ar">Arabe</option>
                <option value="wo">Wolof</option>
                <option value="en">Anglais</option>
              </select>
            </label>
            <Field name="title" label="Titre de cette édition" />
            <Field name="translator" label="Traducteur" />
            <Field name="publisher" label="Éditeur" />
            <Field name="publication_year" label="Année" type="number" />
            <Field name="page_count" label="Nombre de pages" type="number" />
            <Field name="source_name" label="Source" />
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
              Statut
              <select name="validation_status" className={controlClass}>
                <option value="review">À valider</option>
                {["validator", "admin"].includes(role) && (
                  <option value="verified">Validée et publiée</option>
                )}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-700 md:col-span-2">
              PDF traduit
              <input
                name="file"
                type="file"
                accept="application/pdf"
                required
                className={controlClass}
              />
            </label>
            <div className="md:col-span-2 lg:col-span-3">
              <SubmitButton busy={pending === "edition"}>Ajouter cette édition</SubmitButton>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-700">
                Validation éditoriale
              </span>
              <h2 className="mt-1 text-xl font-bold">Éditions à valider</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
              {editions.filter((item) => item.validation_status === "review").length} en attente
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {editions
              .filter((item) => item.validation_status === "review")
              .map((edition) => (
                <article
                  key={edition.id}
                  className="grid gap-4 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                        À valider
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600">
                        {edition.language}
                      </span>
                      <span className="text-[10px] text-slate-400">{edition.edition_kind}</span>
                    </div>
                    <h3 className="mt-2 font-bold">{edition.title || edition.khassidas.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {edition.khassidas.title}
                      {edition.translator ? ` · Traducteur : ${edition.translator}` : ""}
                      {edition.page_count ? ` · ${edition.page_count} pages` : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {edition.source_name || edition.publisher || edition.file_name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={pending === `preview-${edition.id}`}
                      onClick={() => void openEditionPreview(edition)}
                      className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold disabled:opacity-50"
                    >
                      <Eye size={14} />{" "}
                      {pending === `preview-${edition.id}` ? "Chargement…" : "Prévisualiser"}
                    </button>
                    {["validator", "admin"].includes(role) && (
                      <>
                        <button
                          disabled={pending === `review-${edition.id}`}
                          onClick={() => void reviewEdition(edition, "verified")}
                          className="flex h-10 items-center gap-2 rounded-xl bg-emerald-800 px-3 text-xs font-bold text-white"
                        >
                          <CheckCircle2 size={14} /> Valider
                        </button>
                        <button
                          disabled={pending === `review-${edition.id}`}
                          onClick={() => void reviewEdition(edition, "disabled")}
                          className="flex h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-bold text-red-700"
                        >
                          <XCircle size={14} /> Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            {!editions.some((item) => item.validation_status === "review") && (
              <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                Aucune édition en attente.
              </p>
            )}
          </div>
        </section>

        {previewEdition && editionPreviewUrl && (
          <div
            className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 p-4"
            onClick={closeEditionPreview}
          >
            <section
              className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <strong>{previewEdition.title || previewEdition.khassidas.title}</strong>
                  <p className="mt-1 text-xs text-slate-500">{previewEdition.file_name}</p>
                </div>
                <button
                  onClick={closeEditionPreview}
                  className="grid size-10 place-items-center rounded-full bg-slate-100"
                >
                  <XCircle size={20} />
                </button>
              </header>
              <iframe
                src={`${editionPreviewUrl}#view=FitH`}
                title={`Prévisualiser ${previewEdition.title || previewEdition.khassidas.title}`}
                className="min-h-0 flex-1 bg-slate-100"
              />
            </section>
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Edit3 size={19} />
            </span>
            <div>
              <h2 className="font-bold">Modifier une fiche</h2>
              <p className="mt-1 text-xs text-slate-500">
                Titres, description, thèmes, nombre de pages et nombre de vers.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <SelectWork works={works} value={editingId} onChange={setEditingId} />
          </div>
          {editing && (
            <>
              <form
                key={editing.id}
                onSubmit={updateWork}
                className="mt-5 grid gap-4 lg:grid-cols-2"
              >
                <Field name="title" label="Titre officiel" required defaultValue={editing.title} />
                <Field
                  name="arabic_title"
                  label="Titre arabe"
                  dir="rtl"
                  defaultValue={editing.arabic_title || ""}
                />
                <Field name="aliases" label="Variantes" defaultValue={editing.aliases.join(", ")} />
                <Field
                  name="themes"
                  label="Thèmes abordés"
                  defaultValue={editing.themes.join(", ")}
                />
                <Field
                  name="page_count"
                  label="Nombre de pages"
                  type="number"
                  defaultValue={editing.page_count || ""}
                />
                <Field
                  name="verse_count"
                  label="Nombre de vers"
                  type="number"
                  defaultValue={editing.verse_count || ""}
                />
                <div className="lg:col-span-2">
                  <Field
                    name="description"
                    label="Description"
                    area
                    defaultValue={editing.description || ""}
                  />
                </div>
                <div className="lg:col-span-2">
                  <SubmitButton busy={pending === "edit"}>
                    Enregistrer les modifications
                  </SubmitButton>
                </div>
              </form>
              <form
                onSubmit={uploadCover}
                className="mt-6 grid gap-5 border-t border-slate-200 pt-6 md:grid-cols-[150px_minmax(0,1fr)]"
              >
                <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  {coverPreview || editing.cover_url ? (
                    <img
                      src={coverPreview || editing.cover_url || ""}
                      alt={`Aperçu de la couverture de ${editing.title}`}
                      className="size-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="mx-auto" size={28} />
                      <span className="mt-2 block text-[10px]">Aucune couverture</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold">Photo de couverture</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    PNG, JPG ou WebP, 10 Mo maximum. Une nouvelle image remplace automatiquement la
                    couverture principale.
                  </p>
                  <input
                    name="file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                    onChange={previewCover}
                    className={`${controlClass} mt-4`}
                  />
                  <div className="mt-3">
                    <SubmitButton busy={pending === "cover"}>
                      {editing.cover_url ? "Remplacer la couverture" : "Importer la couverture"}
                    </SubmitButton>
                  </div>
                </div>
              </form>
            </>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">
                Corpus
              </span>
              <h2 className="mt-1 text-xl font-bold">
                {loading
                  ? "Chargement…"
                  : `${works.length} khassaïde${works.length !== 1 ? "s" : ""}`}
              </h2>
            </div>
          </div>
          {!loading && works.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              Aucune fiche disponible pour ce compte.
            </p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {works.map((work) => (
                <article key={work.id} className="rounded-2xl border border-slate-200 p-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${work.is_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {work.is_verified ? "Publié" : "Brouillon"}
                  </span>
                  <h3 className="mt-3 font-bold">{work.title}</h3>
                  {work.arabic_title && (
                    <p dir="rtl" className="mt-1 font-arabic text-xl">
                      {work.arabic_title}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {work.aliases.join(" · ") || "Aucune variante"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-slate-600">
                    {work.page_count && (
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        {work.page_count} pages
                      </span>
                    )}
                    {work.verse_count && (
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        {work.verse_count} vers
                      </span>
                    )}
                    {work.cover_url && (
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                        <ImageIcon size={11} /> Couverture
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingId(work.id)}
                    className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold"
                  >
                    Modifier
                  </button>
                  {["validator", "admin"].includes(role) && (
                    <button
                      disabled={pending === `publish-${work.id}`}
                      onClick={() => void setPublished(work, !work.is_verified)}
                      className={`mt-2 w-full rounded-xl py-2 text-xs font-semibold text-white ${work.is_verified ? "bg-amber-600" : "bg-emerald-800"}`}
                    >
                      {work.is_verified ? "Remettre en brouillon" : "Publier"}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const controlClass =
  "min-h-11 w-full border-b border-line bg-transparent px-1 py-2.5 text-sm text-ink outline-none transition focus:border-brand";

function splitList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function optionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function stringOrUndefined(value: FormDataEntryValue | null) {
  const result = String(value || "").trim();
  return result || undefined;
}
function numberOrUndefined(value: FormDataEntryValue | null) {
  const result = Number(value);
  return value && Number.isInteger(result) && result > 0 ? result : undefined;
}
function AdminCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line bg-surface p-5 sm:p-6">
      <header className="mb-6 flex gap-3">
        <span className="grid size-11 shrink-0 place-items-center border-l border-gold text-brand">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
function Field({
  name,
  label,
  area,
  type = "text",
  required,
  dir,
  defaultValue,
}: {
  name: string;
  label: string;
  area?: boolean;
  type?: string;
  required?: boolean;
  dir?: "rtl";
  defaultValue?: string | number;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
      {label}
      {area ? (
        <textarea
          name={name}
          required={required}
          dir={dir}
          defaultValue={defaultValue}
          className={`${controlClass} min-h-24 resize-y`}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          dir={dir}
          defaultValue={defaultValue}
          min={type === "number" ? 1 : undefined}
          className={controlClass}
        />
      )}
    </label>
  );
}
function SelectWork({
  works,
  value,
  onChange,
}: {
  works: Khassida[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-slate-700">
      Khassaïde
      <select
        name="khassida_id"
        required
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={controlClass}
      >
        <option value="">Choisir…</option>
        {works.map((work) => (
          <option key={work.id} value={work.id}>
            {work.title}
          </option>
        ))}
      </select>
    </label>
  );
}
function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={busy}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? "Traitement…" : children}
    </button>
  );
}
