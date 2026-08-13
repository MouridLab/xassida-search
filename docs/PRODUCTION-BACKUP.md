# Backup PostgreSQL de production

Cette procédure crée un backup PostgreSQL logique hors du repository, puis vérifie
sa restauration sur un projet Supabase TEST neuf et vide. Elle n'applique aucune
migration et ne doit jamais cibler la production pour la restauration.

## Périmètre

**DATABASE BACKUP VERIFIED ≠ MINIO BACKUP VERIFIED**

Les objets MinIO ne font pas partie de ces dumps PostgreSQL. Leur sauvegarde et leur
restauration constituent un gate opérationnel séparé.

Le gate temporaire `BACKUP VERIFIED: YES / RESTORE VERIFIED: NO` autorise uniquement
`bun run supabase:prod:dry-run`, avec un warning explicite. Il n'autorise jamais un
`db push` réel, qui reste bloqué tant que la restauration n'est pas vérifiée.

## Backup

Variables requises, fournies uniquement dans l'environnement local :

- `SUPABASE_PRODUCTION_DB_URL`
- `SUPABASE_BACKUP_ROOT` (optionnelle ; doit rester hors du repository)

Commande (charge `.env.local` et neutralise toute ancienne URL exportée) :

```sh
bun run backup:prod
```

Le script utilise `umask 077`, produit séparément les rôles, le schéma, les données
et l'historique `supabase_migrations`, puis vérifie les fichiers et leurs checksums
SHA-256. Le dossier par défaut est
`~/.local/share/xassida-search/backups/production-<timestamp UTC>`.

## Vérification par restauration

Utiliser un projet Supabase TEST neuf et vide. Le projet TEST déjà initialisé pour
la CI RLS ne convient pas : le script refuse toute cible ayant déjà une table dans
le schéma `public`.

Variables requises :

- `SUPABASE_PRODUCTION_DB_URL`
- `SUPABASE_PRODUCTION_PROJECT_REF`
- `SUPABASE_TEST_DB_URL`
- `SUPABASE_TEST_PROJECT_REF`
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_ROLE_KEY`

Commande :

```sh
bun run backup:verify -- /chemin/absolu/du/backup
```

La production est interrogée uniquement en lecture pour comparer les volumes des
tables critiques. Les rôles, le schéma, les données et l'historique sont restaurés
uniquement via `SUPABASE_TEST_DB_URL`. Le script vérifie ensuite migrations, tables,
volumes, RLS, policies, RPC et rôles, puis exécute `bun run test:rls` avec les
credentials TEST fournis par l'environnement.

`BACKUP VERIFIED: YES` et `RESTORE VERIFIED: YES` ne sont affichés qu'après la
réussite de tous les contrôles.

## Incident rencontré : dump impossible avec Colima

### Symptômes

Le premier lancement a échoué successivement avec :

```text
BACKUP VERIFIED: NO
Backup failed during: roles dump
Diagnostic: PostgreSQL network connection failed
```

Le diagnostic expurgé du CLI indiquait que le conteneur essayait de joindre
`db.<project-ref>.supabase.co`. Cette adresse correspond à la connexion directe,
principalement IPv6. Elle n'était pas résolue depuis le conteneur lancé par Colima.

Un test TCP exécuté depuis Colima a confirmé que le Session pooler était joignable
sur le port 5432. Docker Desktop n'est pas nécessaire : `colima start` avec le
runtime Docker suffit.

### Causes

Deux configurations se superposaient :

1. `.env.local` contenait finalement la bonne URI Session pooler ;
2. le terminal conservait une ancienne variable `SUPABASE_PRODUCTION_DB_URL`
   exportée avec l'URL directe.

Une variable déjà exportée dans le processus parent prend priorité lors du
lancement. De plus, exécuter directement
`bash scripts/backup-production-db.sh` ne charge pas `.env.local`.

Les caractères spéciaux du mot de passe, notamment `!`, ont également déclenché
l'expansion d'historique de Zsh lorsqu'une URL était collée directement dans une
commande. Une URL de connexion ne doit pas être copiée dans la ligne de commande.

### Diagnostic sûr

Vérifier Colima :

```sh
colima start
colima status
docker info >/dev/null 2>&1 && echo "DOCKER READY" || echo "DOCKER UNAVAILABLE"
```

Vérifier uniquement l'hôte chargé depuis `.env.local`, sans afficher l'URL :

```sh
bun --env-file=.env.local -e '
const value = process.env.SUPABASE_PRODUCTION_DB_URL;
if (!value) throw new Error("MISSING");
const url = new URL(value);
console.log("Host:", url.hostname);
console.log("Port:", url.port);
console.log(
  url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432"
    ? "SESSION POOLER: OK"
    : "SESSION POOLER: INVALID"
);
'
```

Le résultat requis est un hôte `*.pooler.supabase.com`, port `5432`.

### Solution appliquée

Supprimer d'abord toute ancienne valeur exportée :

```sh
unset SUPABASE_PRODUCTION_DB_URL
```

Puis charger `.env.local` explicitement dans Bun et transmettre cet environnement
au script Bash :

```sh
bun --env-file=.env.local -e '
const child = Bun.spawn(["bash", "scripts/backup-production-db.sh"], {
  env: process.env,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit"
});
process.exit(await child.exited);
'
```

La commande `bun run backup:prod` automatise maintenant ce chargement propre. Cette
méthode a produit les cinq dumps, vérifié leur présence, leur taille et leurs
checksums SHA-256, puis terminé avec :

```text
BACKUP VERIFIED: YES
```

### Règles à conserver

- utiliser l'URI **Session pooler** avec Colima ;
- ne jamais coller une URL PostgreSQL ou un mot de passe dans une commande ;
- ne jamais publier les détails bruts de `--debug` ;
- utiliser `SUPABASE_BACKUP_DIAGNOSTICS=1` uniquement pour les détails expurgés ;
- une réussite du dump PostgreSQL ne valide toujours pas le backup MinIO.
