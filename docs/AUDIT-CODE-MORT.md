# Audit du code mort

Audit statique réalisé le 12 août 2026. Le code mort confirmé ci-dessous a été retiré après l’audit initial.

## Code mort supprimé

### Ancienne page d’accueil masquée

Dans `components/HomeExperience.tsx`, tout le bloc commençant par `<main className="hidden">` est rendu avec `display: none` sur toutes les tailles d’écran. Il inclut l’ancien hero, les cartes de découverte, les thèmes, les blocs de confiance et leurs appels à `WorkCard`/`Card`. Le composant visible est `MobileHome`, malgré son nom.

Conséquences :

- HTML et logique inutilement conservés dans le bundle client;
- chargement et traitement de données dédiées à une interface invisible;
- imports, constantes `themes` et `trust`, et image `open-manuscript.png` partiellement maintenus pour cette ancienne interface.

Résolution : bloc masqué supprimé, `MobileHome` renommé en `HomeView`, imports, constantes et rendu associés retirés.

### `ReaderSidebar`

La fonction locale `ReaderSidebar` dans `components/ReaderView.tsx` n’est jamais appelée. `MobileDrawer` utilise encore `mainLinks`, mais `personalLinks` n’est utilisé que par cette sidebar morte.

Résolution : `ReaderSidebar`, `personalLinks` et leurs icônes exclusives ont été supprimés.

## Éléments obsolètes ou trompeurs

### Script `lint`

`package.json` contient `"lint": "next lint"`. Cette commande n’est plus le workflow lint attendu avec Next.js 15 récent. Le script est donc non fiable et doit être remplacé par ESLint avec sa configuration.

### Ancien stockage Supabase dans la migration initiale

`001_v2_schema.sql` crée encore les buckets Supabase Storage `documents` et `audio` ainsi que leurs politiques. Le chemin actif d’import et de lecture utilise maintenant `media_assets` + MinIO depuis `003_minio_media.sql`.

Ce SQL ne doit pas être effacé d’une migration déjà appliquée. Il faut d’abord confirmer qu’aucun objet historique ne dépend de ces buckets, puis créer une nouvelle migration de retrait si nécessaire.

### Colonnes média historiques

`khassidas.pdf_url`, `khassidas.audio_url`, `khassida_chunks.source_pdf_url` et `khassida_chunks.audio_url` restent utilisées comme mécanisme de repli et par la Recherche IA. Elles ne sont donc **pas mortes aujourd’hui**, mais doublonnent le modèle `media_assets`.

Recommandation : migrer toutes les références vers `media_assets`, adapter `/api/ask`, puis retirer ces colonnes dans une migration séparée.

## Faux positifs à ne pas supprimer

- `components/ui/Card.tsx` est encore utilisé par `/a-propos`, même si l’ancien accueil l’utilise aussi.
- `components/khassidas/WorkCard.tsx` reste utilisé par le catalogue et la page des thèmes.
- `public/images/open-manuscript.png` reste utilisé par l’accueil visible comme image de repli.
- `mainLinks` reste utilisé dans le menu mobile du lecteur.
- Les scripts d’import ne sont pas importés par l’application, mais sont des outils opératoires appelés via `package.json`.
- Les migrations anciennes ne sont pas du code applicatif mort : elles constituent l’historique reproductible de la base.

## Audit à compléter après réparation de Node

La commande TypeScript stricte avec `noUnusedLocals` et `noUnusedParameters` n’a pas pu s’exécuter à cause d’une bibliothèque Homebrew `libllhttp` manquante. Après correction de l’environnement, lancer :

```bash
bunx tsc --noEmit --noUnusedLocals --noUnusedParameters
```

Puis ajouter un outil comme Knip à la chaîne CI pour détecter automatiquement fichiers, exports et dépendances inutilisés. Une suppression doit être faite dans un commit distinct après tests fonctionnels.
