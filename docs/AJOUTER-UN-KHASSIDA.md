# Ajouter un nouveau khassida

Ce document décrit le workflow éditorial actuel de Xassida Search pour ajouter une fiche, un PDF, un audio, une couverture et des passages validés.

## Vue d’ensemble

```mermaid
flowchart TD
    A[Créer le compte dans Supabase Auth] --> B[Donner le rôle editor ou admin]
    B --> C[Se connecter à /admin/login]
    C --> D[Créer la fiche du khassida]
    D --> E[Importer le PDF dans MinIO]
    D --> F[Importer l’audio dans MinIO]
    D --> G[Ajouter la couverture dans public/images/covers]
    D --> H[Ajouter les passages]
    H --> I[Contrôler les textes et les références]
    I --> J[Passer les passages à verified]
    E --> K[Publier la fiche avec is_verified = true]
    F --> K
    G --> K
    J --> K
    K --> L[Khassida visible sur le site]
```

## Où va chaque élément ?

| Élément | Où l’ajouter ? | Destination |
| --- | --- | --- |
| Fiche du khassida | `/admin` | Table Supabase `khassidas` |
| PDF | `/admin`, panneau « Importer dans MinIO » | MinIO + table `media_assets` |
| Audio | `/admin`, panneau « Importer dans MinIO » | MinIO + table `media_assets` |
| Couverture | Manuellement dans le dépôt | `public/images/covers/{slug}.png` |
| Texte et traduction | `/admin`, formulaire « Ajouter un passage » | Table `khassida_chunks` |
| Publication | Supabase SQL Editor | Colonne `khassidas.is_verified` |

## 1. Préparer les fichiers

Préparer de préférence :

- un PDF lisible de moins de 60 Mo ;
- un fichier audio MP3, M4A ou OGG de moins de 150 Mo ;
- une couverture PNG ou WebP nette ;
- le titre officiel et le titre arabe ;
- les variantes du titre et les thèmes ;
- les textes, traductions et références de pages vérifiés ;
- le nom et la provenance de la source.

Utiliser des noms de fichiers simples, sans caractères spéciaux :

```text
nom-du-khassida.pdf
nom-du-khassida.mp3
nom-du-khassida.png
```

## 2. Accéder à l’administration

Démarrer l’application :

```bash
bun run dev
```

Ouvrir ensuite :

```text
http://localhost:3000/admin/login
```

Le compte doit exister dans **Supabase Authentication** et posséder un rôle d’équipe dans la table `profiles`. Le mot de passe n’est pas enregistré dans le dépôt.

## 3. Créer la fiche

Dans `/admin`, remplir le formulaire « Ajouter un khassida » :

1. titre officiel ;
2. titre arabe ;
3. variantes séparées par des virgules ;
4. thèmes séparés par des virgules ;
5. description.

L’application crée automatiquement un slug. Exemple :

```text
astahfirul-laha-bihi-a1b2c3
```

Noter ce slug : il sert pour l’URL publique et le nom de la couverture.

## 4. Importer le PDF

Dans le panneau « Importer dans MinIO » :

1. sélectionner le khassida ;
2. choisir `PDF` ;
3. sélectionner le fichier ;
4. cliquer sur « Stocker dans MinIO ».

Le stockage est automatique :

```text
MinIO
└── khassidas
    └── {id-du-khassida}
        └── pdf
            └── {identifiant}-{nom-du-fichier}.pdf
```

Le fichier est privé. L’application le sert par `/api/media/{id}` avec une URL signée temporaire. Importer un nouveau PDF le rend principal à la place du précédent.

## 5. Importer l’audio

Dans le même panneau :

1. sélectionner le khassida ;
2. choisir `Audio` ;
3. sélectionner le fichier ;
4. cliquer sur « Stocker dans MinIO ».

Le stockage est automatique :

```text
MinIO
└── khassidas
    └── {id-du-khassida}
        └── audio
            └── {identifiant}-{nom-du-fichier}.mp3
```

Importer un nouvel audio le rend principal à la place du précédent.

## 6. Ajouter la couverture

L’administration ne permet pas encore d’importer une couverture. Déposer manuellement le fichier ici :

```text
public/images/covers/{slug-du-khassida}.png
```

Exemple :

```text
public/images/covers/astahfirul-laha-bihi.png
```

Attention : le code actuel ne détecte pas encore toutes les couvertures automatiquement. Astahfirul Laha Bihi possède une intégration spécifique. Pour généraliser ce workflow, il faudra ajouter un champ `cover_url` ou un média de type `cover`.

## 7. Ajouter les passages

Dans « Ajouter un passage » :

1. sélectionner le khassida ;
2. saisir le texte arabe original ;
3. saisir la transcription, si elle existe ;
4. saisir la traduction validée ;
5. saisir le commentaire sans le mélanger à la traduction ;
6. indiquer le chapitre, les vers et la page ;
7. enregistrer d’abord en `draft` ou `review` ;
8. passer à `verified` après contrôle humain.

```mermaid
stateDiagram-v2
    [*] --> draft: saisie initiale
    draft --> review: prêt à contrôler
    review --> draft: corrections demandées
    review --> verified: validation humaine
    verified --> disabled: retrait exceptionnel
```

Seuls les passages `verified` sont visibles publiquement.

## 8. Publier la fiche

Après vérification du PDF, de l’audio, des textes et de la source, publier la fiche depuis le SQL Editor de Supabase :

```sql
update public.khassidas
set is_verified = true
where slug = 'slug-du-khassida';
```

Pour retirer temporairement une fiche :

```sql
update public.khassidas
set is_verified = false
where slug = 'slug-du-khassida';
```

## 9. Vérifier avant la mise en ligne

```mermaid
flowchart LR
    A[Fiche publiée] --> B{Page visible ?}
    B -->|Oui| C{PDF lisible ?}
    C -->|Oui| D{Audio lisible ?}
    D -->|Oui| E{Couverture correcte ?}
    E -->|Oui| F{Textes et pages exacts ?}
    F -->|Oui| G[Publication terminée]
    B -->|Non| H[Vérifier is_verified]
    C -->|Non| I[Vérifier media_assets et MinIO]
    D -->|Non| I
    E -->|Non| J[Vérifier le slug et le fichier]
    F -->|Non| K[Corriger les passages]
```

Contrôles techniques :

```bash
bun run typecheck
bun run build
```

Contrôles fonctionnels :

- la fiche apparaît sur l’accueil ou dans la bibliothèque ;
- la page `/khassidas/{slug}` s’ouvre ;
- le PDF se charge ;
- l’audio démarre, se met en pause et peut être parcouru ;
- la couverture correspond au bon khassida ;
- les références de pages et de vers sont exactes ;
- aucun brouillon n’est visible publiquement.

## Checklist rapide

- [ ] Compte administrateur ou éditeur disponible
- [ ] Fiche créée
- [ ] Slug noté
- [ ] Source renseignée et contrôlée
- [ ] PDF importé
- [ ] Audio importé
- [ ] Couverture ajoutée
- [ ] Passages saisis
- [ ] Passages validés
- [ ] Fiche publiée
- [ ] Page publique contrôlée sur mobile et ordinateur

