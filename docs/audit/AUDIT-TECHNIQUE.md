# Audit technique complet

Date : 12 août 2026
Périmètre : codebase `xassida-search`
Méthode : audit statique en lecture seule, contrôles TypeScript, build, formatage et lint.

## Executive Summary

Xassida Search est une application Next.js 15 / React 19 cohérente pour un MVP : catalogue public, administration éditoriale, Supabase/PostgreSQL avec RLS, stockage privé MinIO et recherche RAG OpenAI.

L’architecture générale est compréhensible et les frontières principales sont correctes. Elle n’est toutefois pas encore prête pour une production durable à trafic significatif. Les principaux obstacles sont l’absence de tests et de CI, un risque d’attribution automatique du rôle éditeur, des écritures MinIO/PostgreSQL non atomiques, l’absence de limitation des appels OpenAI et une stratégie de chargement non paginée.

| Axe                  |   Note |
| -------------------- | -----: |
| Architecture         | 6,5/10 |
| Maintenabilité       |   5/10 |
| Qualité du code      | 5,5/10 |
| Sécurité             |   5/10 |
| Performance          |   5/10 |
| Tests                |   1/10 |
| Developer Experience |   5/10 |
| Production readiness |   4/10 |

### Les cinq problèmes prioritaires

1. Tout nouvel utilisateur Supabase reçoit automatiquement le rôle `editor`.
2. `/api/ask` est public, coûteux et sans rate limiting.
3. Les imports MinIO et les mutations SQL ne sont ni transactionnels ni compensés.
4. Aucun test automatisé ni pipeline CI n’existe.
5. Les catalogues et écrans admin chargent des collections entières sans pagination.

### État des contrôles

- `npm run typecheck` : réussi.
- Build de production : réussi.
- `npm run format:check` : échec sur 44 fichiers.
- `npm run lint` : inutilisable en CI, car `next lint` ouvre une configuration interactive.
- Tests : aucun fichier de test détecté.
- CI/CD : aucun workflow détecté.
- Aucun fichier n’a été modifié pendant l’audit initial.

## Cartographie du projet

```mermaid
flowchart TD
    B[Navigateur] --> P[Pages publiques Next.js]
    P --> S[Supabase + RLS]
    B --> A[Administration React]
    A --> API[Routes /api/admin]
    API --> AUTH[Supabase Auth]
    API --> DB[(PostgreSQL)]
    API --> M[(MinIO privé)]
    B --> R[/api/ask]
    R --> O[OpenAI]
    R --> DB
```

Responsabilités principales :

- `app/` : pages App Router et endpoints HTTP ;
- `components/` : interfaces publiques et administratives ;
- `lib/` : clients Supabase, authentification, MinIO et normalisation ;
- `supabase/migrations/` : schéma, RLS et recherche hybride ;
- `scripts/` : import du corpus et migration des médias ;
- `docs/` : architecture et procédures d’exploitation.

La séparation entre les corpus « Khassaïdes » et « Bibliothèque » est correctement matérialisée par deux modèles distincts.

## Findings

### [CRITICAL] Un nouvel utilisateur Auth devient automatiquement éditeur

**Catégorie :** Security

**Localisation :** `supabase/migrations/002_profile_bootstrap.sql:2`, `lib/admin-auth.ts:2`

**Problème :** le trigger `handle_new_user` crée systématiquement un profil avec le rôle `editor`. `requireStaff` considère ensuite ce rôle comme membre autorisé de l’équipe.

**Pourquoi c’est important :** si l’inscription Supabase est ouverte, n’importe qui peut créer un compte puis appeler les routes administratives pour créer ou modifier des fiches et importer des médias.

**Preuve :** le trigger insère `role = 'editor'`, puis l’API autorise `editor`, `validator` et `admin`.

**Recommandation :** créer les nouveaux profils avec un rôle sans privilège tel que `pending`, n’accorder `editor` qu’après invitation ou promotion administrative, désactiver l’inscription publique si elle est inutile et ajouter un test d’intégration garantissant un retour `403` pour un nouveau compte.

**Effort :** S
**Priorité :** P0

### [HIGH] La Recherche IA est exposée aux abus et aux dépenses incontrôlées

**Catégorie :** Security / Performance

**Localisation :** `app/api/ask/route.ts:3`

**Problème :** chaque requête publique valide déclenche un embedding OpenAI, une recherche PostgreSQL et une génération OpenAI. Il n’existe ni authentification, quota, rate limiting, protection anti-bot ou cache.

**Pourquoi c’est important :** un script peut générer une facture importante ou dégrader le service.

**Recommandation :** appliquer des quotas par IP et utilisateur, des limites globales, des timeouts, un contrôle de concurrence, un cache des questions normalisées et des alertes budgétaires.

**Effort :** M
**Priorité :** P1

### [HIGH] Les écritures MinIO et PostgreSQL peuvent devenir incohérentes

**Catégorie :** Bug / Data

**Localisation :** `app/api/admin/upload/route.ts:2`, `app/api/admin/editions/route.ts:72`, `scripts/import-astahfir-media.ts:36`, `scripts/migrate-media-to-minio.ts:13`

**Problème :** l’écriture MinIO, la désactivation de l’ancien média et l’insertion SQL sont indépendantes, sans transaction ni compensation.

**Scénarios :**

- MinIO réussit mais SQL échoue : objet orphelin ;
- l’ancien média est désactivé puis l’insertion échoue : plus de média principal ;
- deux imports concurrents entrent en conflit sur l’index unique ;
- une édition est stockée puis rejetée par une contrainte SQL.

**Recommandation :** basculer le média principal dans une fonction SQL transactionnelle, supprimer l’objet nouvellement créé en cas d’échec SQL et ajouter une tâche de réconciliation MinIO/PostgreSQL.

**Effort :** M
**Priorité :** P1

### [HIGH] Les fichiers sont entièrement chargés en mémoire

**Catégorie :** Performance / Reliability

**Localisation :** `app/api/admin/upload/route.ts:2`, `app/api/admin/editions/route.ts:63`, `lib/minio.ts:9`, `next.config.ts:2`

**Problème :** les routes acceptent jusqu’à 150 Mo puis exécutent `Buffer.from(await file.arrayBuffer())`. Plusieurs copies du fichier peuvent coexister en mémoire. La limite `serverActions.bodySizeLimit` ne protège pas ces Route Handlers.

**Pourquoi c’est important :** ces imports risquent d’échouer sur une plateforme serverless à cause des limites de corps, de durée ou de mémoire.

**Recommandation :** utiliser des uploads directs vers MinIO avec URL présignée, puis finaliser l’enregistrement par une petite requête API et vérifier l’objet côté serveur.

**Effort :** L
**Priorité :** P1

### [HIGH] Aucun test automatisé ne protège les flux critiques

**Catégorie :** Testing

**Localisation :** `package.json:5`

**Problème :** aucun fichier de test et aucun script `test` n’existent.

**Recommandation :** ajouter en priorité des tests d’autorisation et RLS, des tests d’intégration d’upload, de publication, d’accès aux éditions, de recherche limitée au contenu vérifié, puis des tests E2E de connexion, import, validation et lecture.

**Effort :** L
**Priorité :** P1

### [MEDIUM] Les erreurs de validation sont renvoyées comme erreurs serveur

**Catégorie :** Bug / Maintainability

**Localisation :** `lib/admin-auth.ts:3`, `app/api/admin/khassidas/route.ts:5`, `app/api/admin/editions/route.ts:103`

**Problème :** `authError` ne distingue que `UNAUTHORIZED` et `FORBIDDEN`. Une erreur Zod, une contrainte SQL ou un problème MinIO devient un HTTP 500, parfois accompagné d’un message interne.

**Recommandation :** normaliser les erreurs : validation `400`, conflit `409`, absence `404`, infrastructure `500` avec identifiant de corrélation et détails uniquement dans les logs serveur.

**Effort :** S
**Priorité :** P1

### [MEDIUM] Les catalogues et listes administratives ne sont pas paginés

**Catégorie :** Performance / Scalability

**Localisation :** `app/api/search/route.ts:9`, `app/api/admin/khassidas/route.ts:4`, `app/api/admin/editions/route.ts:48`

**Problème :** la recherche charge jusqu’à 200 œuvres, 5 000 passages et tous les médias, puis calcule les agrégations en JavaScript. L’administration charge toutes les fiches et éditions.

**Pourquoi c’est important :** au-delà des limites, les résultats deviennent silencieusement incomplets et les coûts mémoire/réseau augmentent.

**Recommandation :** paginer avec curseur et déplacer les statistiques dans une vue ou fonction SQL.

**Effort :** M
**Priorité :** P2

### [MEDIUM] Le modèle d’embedding configurable peut devenir incompatible avec PostgreSQL

**Catégorie :** Data / Reliability

**Localisation :** `supabase/migrations/001_v2_schema.sql:26`, `app/api/admin/chunks/route.ts:39`, `app/api/ask/route.ts:3`, `.env.example:5`

**Problème :** PostgreSQL impose `vector(1536)`, tandis que le modèle est modifiable par variable d’environnement sans vérification de dimension.

**Recommandation :** versionner modèle et dimension, vérifier la compatibilité au démarrage, enregistrer la version utilisée et prévoir une procédure de réindexation.

**Effort :** M
**Priorité :** P2

### [MEDIUM] Le corpus importé peut être vérifié sans validation éditoriale humaine

**Catégorie :** Data / Security métier

**Localisation :** `scripts/import-xassaid.ts:38`, `scripts/seed-library.ts:22`

**Problème :** des pages extraites automatiquement et certaines ressources seedées sont directement marquées `verified`.

**Pourquoi c’est important :** une extraction imparfaite peut devenir une source publique et alimenter le RAG.

**Recommandation :** importer en `review`, enregistrer empreinte/source/date et exiger une validation humaine explicite.

**Effort :** M
**Priorité :** P1

### [MEDIUM] Les journaux d’audit ne sont ni exhaustifs ni garantis

**Catégorie :** Security / Data

**Localisation :** `app/api/admin/khassidas/route.ts:5`, `app/api/admin/chunks/route.ts:60`, `app/api/admin/editions/route.ts:95`, `app/api/admin/upload/route.ts:2`

**Problème :** les erreurs d’écriture du journal sont ignorées, les imports média ne sont pas audités et les anciennes valeurs sont rarement conservées.

**Recommandation :** centraliser mutation et audit dans des fonctions SQL transactionnelles et enregistrer acteur, données précédentes, nouvelles données et identifiant de requête.

**Effort :** M
**Priorité :** P2

### [MEDIUM] `ReaderView` concentre trop de responsabilités

**Catégorie :** Architecture / Maintainability

**Localisation :** `components/ReaderView.tsx:1`

**Problème :** environ 1 100 lignes gèrent navigation, lecture PDF, éditions, passages, audio, progression, réactions, informations et œuvres liées.

**Recommandation :** extraire progressivement `useAudioPlayer`, `AudioPlayerBar`, `EditionReader`, `WorkInformation`, `RelatedWorks` et `ReaderNavigation`, en conservant l’orchestration dans `ReaderView`.

**Effort :** M
**Priorité :** P2

### [MEDIUM] Le tableau de bord admin est monolithique

**Catégorie :** Maintainability / UX

**Localisation :** `components/AdminDashboard.tsx:48`, `components/AdminDashboard.tsx:98`

**Problème :** un composant pilote toutes les opérations et un unique état `pending` représente les actions simultanées. Une opération peut effacer l’indicateur d’une autre.

**Recommandation :** séparer les domaines fonctionnels, utiliser un état par opération ou un `Set<string>` et ajouter des confirmations avant rejet ou dépublication.

**Effort :** M
**Priorité :** P2

### [MEDIUM] Les types ne sont pas générés depuis Supabase

**Catégorie :** Maintainability / Data

**Localisation :** `types/database.ts:1`, `lib/supabase.ts:6`

**Problème :** les interfaces sont maintenues manuellement et les clients Supabase ne reçoivent pas de type `Database` généré.

**Recommandation :** générer les types avec Supabase CLI, les passer à `createClient` et vérifier leur actualité en CI.

**Effort :** S
**Priorité :** P2

### [LOW] La qualité automatisée n’est pas exploitable en CI

**Catégorie :** DX

**Localisation :** `package.json:9`, `docs/EXPLOITATION.md:69`

**Problème :** `next lint` est interactif, ESLint n’est pas configuré, Prettier échoue sur 44 fichiers et aucun workflow CI n’existe.

**Recommandation :** configurer ESLint CLI, appliquer Prettier, puis créer une CI exécutant format, lint, typecheck, tests et build.

**Effort :** S
**Priorité :** P2

### [LOW] La documentation opérationnelle est partiellement obsolète

**Catégorie :** DX

**Localisation :** `docs/ARCHITECTURE.md:49`, `docs/EXPLOITATION.md:40`, `README.md:45`

**Problème :** la liste des migrations s’arrête à `004`, certaines nouvelles API sont absentes et le README décrit encore l’ancien workflow de passages.

**Recommandation :** documenter les migrations jusqu’à `007`, les éditions, les routes média et le workflow éditorial actuel.

**Effort :** XS
**Priorité :** P2

### [LOW] Certaines actions visuelles n’ont aucun comportement

**Catégorie :** Quality / UX

**Localisation :** `components/ReaderView.tsx:547`, `components/ReaderView.tsx:621`

**Problème :** plusieurs boutons de sauvegarde, réglages, copie ou partage sont affichés sans gestionnaire fonctionnel.

**Recommandation :** implémenter les comportements avec retour utilisateur, ou retirer temporairement ces contrôles.

**Effort :** S
**Priorité :** P3

## Risques potentiels à vérifier

- L’inscription publique Supabase est-elle désactivée ?
- MFA est-il exigé pour les administrateurs ?
- Les sauvegardes Supabase et MinIO sont-elles testées ?
- MinIO est-il accessible uniquement depuis le réseau serveur ?
- Des limites OpenAI et alertes budgétaires sont-elles configurées ?
- L’hébergeur accepte-t-il réellement les uploads de 60 à 150 Mo ?
- Les droits de reproduction et stockage des documents ont-ils été validés ?
- Les URLs de récupération Supabase sont-elles limitées aux domaines attendus ?
- Existe-t-il des logs, métriques et alertes hors du dépôt ?

## Roadmap finale

### Immédiatement

| Action                                               | Impact     | Effort | Risque | Dépendances                 |
| ---------------------------------------------------- | ---------- | -----: | ------ | --------------------------- |
| Remplacer le rôle automatique `editor` par `pending` | Très élevé |      S | Faible | Migration DB, Supabase Auth |
| Ajouter rate limiting, timeout et quota à `/api/ask` | Très élevé |      M | Faible | Hébergeur ou Redis/KV       |
| Importer les textes en `review`                      | Élevé      |      S | Faible | Workflow éditorial          |
| Ajouter des compensations aux uploads MinIO/SQL      | Élevé      |      M | Moyen  | MinIO, PostgreSQL           |
| Créer les premiers tests d’autorisation/RLS          | Très élevé |      M | Faible | Supabase de test            |

### Court terme

| Action                                    | Impact | Effort | Risque | Dépendances   |
| ----------------------------------------- | ------ | -----: | ------ | ------------- |
| Passer aux uploads directs présignés      | Élevé  |      L | Moyen  | MinIO/CORS    |
| Configurer ESLint, Prettier et CI         | Élevé  |      S | Faible | Plateforme CI |
| Normaliser les erreurs HTTP               | Moyen  |      S | Faible | Routes API    |
| Paginer administration et catalogue       | Élevé  |      M | Moyen  | API et UI     |
| Rendre mutations et audit transactionnels | Élevé  |      M | Moyen  | Fonctions SQL |
| Générer les types Supabase                | Moyen  |      S | Faible | Supabase CLI  |
| Actualiser la documentation jusqu’à `007` | Moyen  |     XS | Faible | Aucun         |

### Moyen terme

| Action                                       | Impact | Effort | Risque | Dépendances             |
| -------------------------------------------- | ------ | -----: | ------ | ----------------------- |
| Découper `ReaderView` et `AdminDashboard`    | Moyen  |      M | Moyen  | Tests de non-régression |
| Centraliser les agrégations catalogue en SQL | Moyen  |      M | Moyen  | Migration DB            |
| Versionner les embeddings                    | Élevé  |      M | Moyen  | OpenAI, pgvector        |
| Ajouter observabilité, métriques et alertes  | Élevé  |      M | Faible | Hébergeur               |
| Tester la restauration PostgreSQL et MinIO   | Élevé  |      M | Faible | Infrastructure          |
| Ajouter les tests E2E éditoriaux et médias   | Élevé  |      L | Faible | Playwright              |

### Nice-to-have

| Action                                              | Impact | Effort | Risque | Dépendances      |
| --------------------------------------------------- | ------ | -----: | ------ | ---------------- |
| Implémenter ou retirer les boutons inactifs         | Faible |      S | Faible | UX               |
| Mettre en cache les catalogues publics              | Moyen  |      S | Faible | Invalidation     |
| Détecter automatiquement les objets MinIO orphelins | Moyen  |      M | Faible | Inventaire MinIO |
| Uniformiser progressivement le formatage            | Faible |      S | Faible | Prettier         |

## Conclusion

La base est saine pour poursuivre le développement, mais les sujets P0/P1 doivent être traités avant de considérer l’application robuste pour une production publique durable, particulièrement le rôle automatique, le coût OpenAI non borné et l’absence de garanties transactionnelles et de tests.
