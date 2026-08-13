# Initialiser le projet Supabase de test

Cette procédure est exclusivement destinée à un projet Supabase de test vide. Elle
reste une action locale, manuelle et contrôlée. CircleCI exécute seulement les tests
RLS et ne migre pas la base distante.

## Prérequis

- Supabase CLI installé et authentifié (`supabase login` ou profil CLI existant) ;
- Project Ref du projet `xassida-search-test` ;
- Project Ref de production, fourni dans `SUPABASE_PRODUCTION_PROJECT_REF` ;
- mot de passe PostgreSQL du projet de test, saisi à l'invite du CLI ou fourni par
  le mécanisme sécurisé `SUPABASE_DB_PASSWORD` du CLI.

Ne placez aucun token, mot de passe, clé anon ou service-role dans la commande, le
repository ou les logs.

## Initialisation manuelle

```sh
SUPABASE_PRODUCTION_PROJECT_REF=<production-ref> \
  bun run supabase:test:setup -- <test-project-ref>
```

Le script refuse une ref cible identique à la ref de production. Il vérifie aussi,
via les métadonnées authentifiées de `supabase projects list`, que le projet cible
est visible et porte un nom de test/staging/RLS. Il affiche la cible et exige deux
confirmations exactes : avant le link/dry-run, puis avant le `db push`.

Il vérifie localement la séquence exacte 001–013, lie le CLI à la ref explicitement
fournie, affiche l'historique distant, exécute `db push --dry-run --include-all`,
puis, après confirmation, applique les migrations sans seed et contrôle que
l'historique distant contient exactement 001–013. Il n'utilise jamais `db reset`,
`migration repair` ou une suppression.

## Tests RLS après initialisation

Configurez `.env.local` avec les trois credentials du projet de test, puis lancez :

```sh
bun run test:rls
```

Vérifiez que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY` pointent tous vers le même projet de test. Ne réutilisez
jamais les credentials de production.
