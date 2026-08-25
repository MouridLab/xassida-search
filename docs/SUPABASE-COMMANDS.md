# Commandes Supabase utiles

Cet aide-mémoire concerne le CLI Supabase utilisé par Xassida Search. Toujours
identifier la cible avant une commande distante et ne jamais copier de token, mot
de passe, URL PostgreSQL ou clé `service_role` dans Git, le terminal partagé ou les
logs.

## Niveaux de risque

| Niveau             | Signification                                     | Exemples                                |
| ------------------ | ------------------------------------------------- | --------------------------------------- |
| Lecture            | Ne modifie pas la base                            | `projects list`, `migration list`       |
| Local              | Modifie uniquement les conteneurs/fichiers locaux | `start`, `stop`, `db reset --local`     |
| Écriture distante  | Modifie le projet ciblé                           | `db push`, restore avec `psql`          |
| Destructif distant | Supprime ou rejoue des objets distants            | `db reset --linked`, `migration repair` |

Les commandes destructives distantes sont interdites dans les procédures normales
du projet.

## Installation et authentification

```sh
supabase --version
supabase login
supabase projects list
```

`supabase login` enregistre l'authentification dans le stockage local du CLI. Ne pas
passer de token directement dans une commande conservée par l'historique du shell.

## Identifier et lier un projet

Projet TEST :

```sh
supabase link --project-ref "$SUPABASE_TEST_PROJECT_REF"
```

Projet production, uniquement pendant une opération contrôlée :

```sh
supabase link --project-ref "$SUPABASE_PRODUCTION_PROJECT_REF"
```

Vérifier immédiatement la cible liée :

```sh
cat supabase/.temp/project-ref
```

Retirer le lien local :

```sh
supabase unlink
```

`link` et `unlink` modifient l'état local du CLI, pas le schéma distant. Après une
consultation de production, relier le projet TEST ou exécuter `supabase unlink` pour
réduire le risque d'une commande accidentelle.

## Développement local

```sh
supabase start
supabase status
supabase stop
```

Rejouer les migrations uniquement sur la base locale jetable :

```sh
supabase db reset --local
```

Ne jamais remplacer `--local` par `--linked`.

## Créer une migration

```sh
supabase migration new nom_de_la_migration
```

Les migrations historiques déjà appliquées en production ne doivent pas être
réécrites. Toute nouvelle évolution reçoit un nouveau fichier dans
`supabase/migrations/`.

Afficher les migrations locales :

```sh
find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print | sort
```

## Consulter l'historique distant

Avec un projet lié et vérifié :

```sh
supabase migration list --linked
```

Sans modifier le lien local :

```sh
supabase migration list --db-url "$SUPABASE_DB_URL"
```

L'URL doit être fournie par l'environnement sécurisé et ne doit jamais être
affichée. `migration list` compare les versions locales et distantes ; il ne valide
pas un checksum du contenu SQL.

## Prévisualiser des migrations

Commande recommandée pour ce repository :

```sh
bun run supabase:prod:dry-run
```

Elle neutralise les anciennes variables exportées, charge `.env.local`, exige
`SUPABASE_PRODUCTION_PROJECT_REF`, vérifie que l'URL utilise le Session pooler et
que son utilisateur correspond à la Project Ref, puis exécute uniquement
`db push --dry-run`.

Gate exceptionnel actuellement autorisé :

```text
BACKUP VERIFIED: YES
RESTORE VERIFIED: NO
→ DRY-RUN AUTORISÉ AVEC WARNING
→ DB PUSH RÉEL INTERDIT
```

Le wrapper affiche ce warning avant l'appel CLI. Il ne propose aucune commande de
push réel et sa liste d'arguments est testée pour contenir obligatoirement
`--dry-run`, sans seed ni `--include-all`.

```sh
supabase db push --linked --dry-run
```

ou, sans lien local :

```sh
supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
```

Un dry-run ne doit annoncer que les migrations attendues. Arrêter si une migration
inconnue, ancienne ou divergente apparaît.

## Appliquer des migrations

Cette opération est une écriture distante. Elle exige une sauvegarde vérifiée, un
dry-run relu et une cible confirmée.

Commande protégée du repository :

```sh
bun run supabase:prod:apply
```

Elle vérifie la cible et le dernier backup par SHA-256, affiche le warning
`RESTORE VERIFIED: NO`, refait un dry-run, exige exactement la migration 016,
puis demande la confirmation exacte `APPLY 016 TO PRODUCTION`. Après le
push, elle exige que `migration list` confirme la version. Elle n'utilise ni
reset, ni repair, ni seed.

```sh
supabase db push --linked
```

ou :

```sh
supabase db push --db-url "$SUPABASE_DB_URL"
```

Ne pas ajouter `--include-seed` en production. Après application :

```sh
supabase migration list --linked
```

## Initialiser le projet TEST

```sh
SUPABASE_PRODUCTION_PROJECT_REF=<production-ref> \
  bun run supabase:test:setup -- <test-project-ref>
```

La procédure détaillée et ses protections sont décrites dans
[SUPABASE-TEST-SETUP.md](./SUPABASE-TEST-SETUP.md).

## Tester RLS

Après avoir confirmé que `.env.local` cible uniquement le projet TEST :

```sh
bun run test:rls
```

Le test exerce les acteurs anonymous, pending, editor et validator. Ne jamais
l'exécuter avec une clé `service_role` de production.

## Backup PostgreSQL de production

Créer un backup logique hors du repository :

```sh
bun run backup:prod
```

Vérifier réellement sa restauration sur un projet TEST neuf et vide :

```sh
bun run backup:verify -- /chemin/absolu/du/backup
```

Voir [PRODUCTION-BACKUP.md](./PRODUCTION-BACKUP.md).

**DATABASE BACKUP VERIFIED ≠ MINIO BACKUP VERIFIED**

## Diagnostic en lecture

Afficher l'aide avant toute commande peu familière :

```sh
supabase help
supabase db --help
supabase migration --help
supabase db push --help
```

Lister les projets accessibles sans afficher de credentials :

```sh
supabase projects list --output json
```

Vérifier la connexion PostgreSQL sans afficher l'URL :

```sh
psql "$SUPABASE_DB_URL" --no-psqlrc --command 'select current_database(), current_user;'
```

Éviter `--debug` lorsque les logs pourraient contenir des informations de connexion.

## Commandes interdites sur production

```text
supabase db reset --linked
supabase db reset --db-url ...
supabase migration repair ...
supabase migration down --linked
```

Ne jamais exécuter une commande distante destructive pour corriger un simple écart
d'historique. Arrêter, sauvegarder les preuves et faire analyser la divergence.

## Checklist production

```text
CONFIRM PROJECT REF
→ MIGRATION LIST
→ VERIFY BACKUP
→ DRY RUN
→ APPLY EXPECTED MIGRATIONS ONLY
→ MIGRATION LIST
→ SMOKE TESTS
→ UNLINK OR RELINK TEST
```
