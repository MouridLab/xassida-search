import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Configuration Supabase manquante");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const runId = crypto.randomUUID();
const password = `Rls-${crypto.randomUUID()}-A1!`;
const roles = ["pending", "editor", "validator"] as const;
const users: { id: string; email: string; role: (typeof roles)[number] }[] = [];
const workIds: string[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  for (const role of roles) {
    const email = `rls-${role}-${runId}@example.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error || new Error(`Création ${role} impossible`);
    users.push({ id: data.user.id, email, role });
    if (role !== "pending") {
      const { error: roleError } = await admin
        .from("profiles")
        .update({ role })
        .eq("id", data.user.id);
      if (roleError) throw roleError;
    }
  }

  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: anonymousDrafts, error: anonymousReadError } = await anonymous
    .from("khassidas")
    .select("id")
    .eq("is_verified", false)
    .limit(1);
  assert(
    !anonymousReadError && anonymousDrafts?.length === 0,
    "anonymous ne doit pas lire les brouillons",
  );
  const { error: anonymousWrite } = await anonymous
    .from("khassidas")
    .insert({ slug: `rls-anon-${runId}`, title: "RLS anon" });
  assert(Boolean(anonymousWrite), "anonymous ne doit pas créer de khassaïde");

  const clients = new Map<string, SupabaseClient>();
  for (const user of users) {
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error } = await client.auth.signInWithPassword({ email: user.email, password });
    if (error) throw error;
    clients.set(user.role, client);
  }

  const pending = clients.get("pending")!;
  const { error: pendingInsert } = await pending
    .from("khassidas")
    .insert({ slug: `rls-pending-${runId}`, title: "RLS pending" });
  assert(Boolean(pendingInsert), "pending ne doit pas créer de khassaïde");
  const pendingUser = users.find((user) => user.role === "pending")!;
  await pending.from("profiles").update({ role: "admin" }).eq("id", pendingUser.id);
  const { data: pendingAfter, error: pendingAfterError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", pendingUser.id)
    .single();
  assert(
    !pendingAfterError && pendingAfter?.role === "pending",
    "pending ne doit pas pouvoir se promouvoir",
  );

  const editor = clients.get("editor")!;
  const editorSlug = `rls-editor-${runId}`;
  const { data: draft, error: draftError } = await editor
    .from("khassidas")
    .insert({
      slug: editorSlug,
      title: "RLS editor draft",
      created_by: users.find((user) => user.role === "editor")!.id,
    })
    .select("id,is_verified")
    .single();
  if (draft?.id) workIds.push(draft.id);
  assert(
    !draftError && draft && !draft.is_verified,
    `editor doit pouvoir créer un brouillon: ${JSON.stringify(draftError)}`,
  );
  const { error: editorPublish } = await editor
    .from("khassidas")
    .update({ is_verified: true })
    .eq("id", draft.id);
  assert(Boolean(editorPublish), "editor ne doit pas pouvoir publier directement");

  const validator = clients.get("validator")!;
  const { data: published, error: validatorPublish } = await validator
    .from("khassidas")
    .update({
      is_verified: true,
      validated_by: users.find((user) => user.role === "validator")!.id,
    })
    .eq("id", draft.id)
    .select("is_verified")
    .single();
  assert(!validatorPublish && published?.is_verified, "validator doit pouvoir publier");

  console.log("RLS integration: anonymous, pending, editor et validator validés");
} finally {
  if (workIds.length) await admin.from("khassidas").delete().in("id", workIds);
  for (const user of users.reverse()) await admin.auth.admin.deleteUser(user.id);
}
