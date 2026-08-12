# Workflows du projet

## 1. Publier un khassida

Le guide complet est dans [AJOUTER-UN-KHASSIDA.md](./AJOUTER-UN-KHASSIDA.md).

```mermaid
flowchart TD
    A[Compte Supabase Auth] --> B[Rôle editor, validator ou admin]
    B --> C[Créer la fiche dans /admin]
    C --> D[Importer PDF et audio]
    C --> E[Ajouter une couverture locale]
    C --> F[Saisir les passages]
    F --> G[draft]
    G --> H[review]
    H --> I[Validation humaine]
    I --> J[verified]
    D --> K[Contrôle des médias]
    E --> K
    J --> K
    K --> L[is_verified = true]
    L --> M[Publication publique]
```

Une fiche et ses passages ont des statuts distincts. Publier la fiche ne rend pas les brouillons visibles; seuls les passages `verified` sont lus par le public et par l’IA.

## 2. Lire ou écouter un khassida

```mermaid
sequenceDiagram
    participant U as Visiteur
    participant N as Next.js
    participant S as Supabase
    participant M as MinIO
    U->>N: ouvre /khassidas/[slug]
    N->>S: fiche + passages + médias principaux
    S-->>N: données vérifiées
    N-->>U: Informations clés
    U->>N: clique Lire ou Écouter
    N->>N: charge /api/media/[id]
    N->>M: signe l'objet privé
    M-->>N: URL temporaire
    N-->>U: PDF ou audio
```

Le lecteur audio global ne doit apparaître qu’après un clic sur **Écouter**. L’audio n’implique pas l’affichage de paroles synchronisées.

## 3. Ajouter une ressource à la bibliothèque

Les ressources sont préparées dans `scripts/seed-library.ts`, puis insérées de façon idempotente avec :

```bash
bun run seed:library
```

Workflow éditorial recommandé :

```mermaid
flowchart LR
    A[Identifier une source] --> B[Vérifier auteur, langue et provenance]
    B --> C[Valider les droits et la stabilité]
    C --> D[Créer une fiche library_items]
    D --> E[is_verified = true]
    E --> F[/bibliotheque]
    F --> G[/bibliotheque/slug]
```

La navigation principale reste interne : une carte ouvre toujours `/bibliotheque/[slug]`. Une vidéo YouTube peut être intégrée dans la fiche via le domaine sans cookies. Pour un article, un livre ou un audio non hébergé, la fiche conserve actuellement un lien secondaire vers l’original. Pour garantir un fonctionnement entièrement local, il faudra obtenir le droit d’héberger le document, importer le fichier dans le stockage privé et relier la fiche à ce média.

## 4. Recherche classique

1. `/api/search` charge le catalogue validé et les statistiques de médias/pages.
2. Il normalise la requête avec `normalizeSearch`.
3. Il cherche d’abord dans titres, titres arabes, variantes et thèmes.
4. Il appelle la fonction PostgreSQL `hybrid_search` pour les passages.
5. Il fusionne les résultats sans dupliquer une œuvre déjà trouvée par un passage.

Sans requête, l’API renvoie le catalogue public utilisé par l’accueil.

## 5. Recherche IA sourcée

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant API as /api/ask
    participant O as OpenAI
    participant DB as Supabase
    U->>API: question
    API->>O: embedding de la question
    O-->>API: vecteur
    API->>DB: hybrid_search texte + vecteur
    DB-->>API: 6 passages validés
    API->>O: question + contexte numéroté
    O-->>API: réponse avec citations [n]
    API-->>U: réponse + sources cliquables
```

Si aucune source validée ne suffit, l’API renvoie une réponse de repli explicite. Toute correction de texte devrait entraîner un recalcul de l’embedding correspondant.

## 6. Migrer ou importer les médias

| Commande | Usage |
| --- | --- |
| `bun run import:xassaid` | Associer/importer le catalogue PDF Xassaid et extraire le texte disponible |
| `bun run migrate:minio` | Copier dans MinIO les médias déjà référencés |
| `bun run import:astahfir` | Import spécialisé du PDF/audio d’Astahfirul Laha Bihi |
| `bun run import:jazbul-audio` | Extraire/importer l’audio de Jazbul Qulub |

Ces scripts modifient les données et/ou le stockage distant. Ils doivent être lancés avec `.env.local` correctement configuré et après sauvegarde adaptée.

## 7. Livraison

```mermaid
flowchart LR
    A[Modifier] --> B[Formater]
    B --> C[Typecheck]
    C --> D[Build]
    D --> E[Test fonctionnel]
    E --> F[Commit logique]
    F --> G[Déploiement]
```

Chaque commit doit représenter une intention unique : schéma, import de données, interface, correctif média ou documentation.

