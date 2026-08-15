# Contribuer à Xassida Search

Merci de contribuer à la transmission numérique du patrimoine mouride.

## Développement

1. Créez une branche depuis `main`.
2. Installez les dépendances avec `bun install --frozen-lockfile`.
3. Ne commitez jamais de secret, de fichier `.env`, de corpus sous droits non clarifiés ou de données personnelles.
4. Ajoutez des tests proportionnés au changement.
5. Exécutez avant toute pull request :

```bash
bun run lint
bun run typecheck
bun run test
bun run build
git diff --check
```

Les migrations, changements RLS, imports éditoriaux et opérations MinIO doivent être décrits explicitement dans la pull request. Aucune validation culturelle ou éditoriale ne doit être déduite automatiquement.

## Commits et pull requests

Utilisez des commits ciblés, avec un préfixe comme `feat`, `fix`, `docs`, `test`, `refactor` ou `chore`. Une pull request doit expliquer le besoin, les risques, les validations réalisées et les éventuelles actions externes.
