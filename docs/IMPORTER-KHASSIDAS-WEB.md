# Import contrôlé de khassaïdes depuis le Web

Ce workflow inventorie le catalogue public, stocke les PDF autorisés dans MinIO privé et place
chaque édition dans la file de validation du portail admin. Il ne publie jamais automatiquement une
ressource collectée sur le Web.

## Principes de sécurité éditoriale

- une œuvre publique sans PDF/audio MinIO réellement lisible est **dépubliée**, jamais supprimée;
- l’audit est en lecture seule par défaut;
- seules les sources HTTPS dont l’hôte est explicitement autorisé sont téléchargées;
- le manifeste conserve le slug, le titre, la langue, le type d’édition et la source;
- le téléchargement doit avoir une signature PDF, un type PDF et rester sous la taille maximale;
- la clé MinIO contient le SHA-256 du contenu pour rendre les reprises idempotentes;
- toute édition importée reçoit `validation_status = review`;
- si l’écriture PostgreSQL échoue après l’upload, l’objet MinIO est supprimé en compensation;
- aucune ressource ambiguë ne doit être validée sans contrôle dans `/admin`.

## 1. Auditer le catalogue public

```bash
bun run catalog:minio:audit
```

La commande vérifie par `HEAD` que chaque œuvre publiée possède soit un média primaire PDF/audio
MinIO, soit une édition MinIO validée. Elle affiche le plan et termine sans écrire en base.

Pour dépublier les fiches sans média lisible, relire la liste puis lancer :

```bash
bun run catalog:minio:unpublish
```

La commande exige la confirmation exacte :

```text
UNPUBLISH WORKS WITHOUT MINIO
```

Elle applique uniquement `is_verified = false`. Elle ne supprime ni fiche, ni passage, ni objet.

## 2. Préparer les sources

Le manifeste versionné est `config/khassida-import-sources.json`. Une entrée doit identifier une
œuvre et une ou plusieurs ressources. Ne pas ajouter une URL avant d’avoir vérifié :

1. l’attribution de l’œuvre;
2. la nature du document (original, traduction ou transcription);
3. la langue;
4. le traducteur ou l’éditeur lorsqu’il est indiqué;
5. le droit de conserver une copie privée et de la rendre accessible après validation.

Le lot initial inventorie 26 œuvres et 51 éditions PDF. Plusieurs fichiers d’une même œuvre sont
regroupés comme éditions : ils ne doivent pas devenir des fiches distinctes à cause d’une différence
de translittération ou de langue.

Les hôtes autorisés sont configurables sans secret :

```text
WEB_IMPORT_ALLOWED_HOSTS=files.xassaid.com
WEB_IMPORT_MAX_BYTES=52428800
```

## 3. Prévisualiser puis importer

```bash
bun run import:xassaid
```

Ce dry-run valide le manifeste et les hôtes, sans télécharger, sans écrire dans MinIO et sans
modifier Supabase.

Après revue :

```bash
bun run import:xassaid:apply
```

Le script crée uniquement les fiches absentes comme brouillons, télécharge et contrôle les PDF,
les place dans MinIO, puis crée des éditions en `review`.

## 4. Valider dans le portail admin

Dans `/admin`, ouvrir « Éditions à valider » :

1. vérifier le titre, l’œuvre, la langue et la source;
2. prévisualiser le PDF;
3. refuser (`disabled`) toute attribution ou qualité incertaine;
4. valider (`verified`) uniquement la bonne édition;
5. publier séparément la fiche de l’œuvre quand au moins un média validé est lisible.

Le stockage MinIO et PostgreSQL ne forment pas une transaction unique. Après tout incident, relancer
le même import : la clé basée sur le SHA-256 évite de créer une seconde édition identique.
