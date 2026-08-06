# Xassida Search — V2 RAG

Application Next.js pour constituer, valider et rechercher un corpus de khassaïdes. Elle associe une recherche lexicale (titres, variantes, arabe normalisé et transcription) à une recherche sémantique pgvector, puis produit des réponses strictement sourcées.

## Fonctionnalités

- Bibliothèque publique limitée aux fiches et passages validés
- Titres officiels/arabe, variantes, thèmes, transcription et traduction
- Recherche hybride PostgreSQL (`pg_trgm` + `pgvector`, index HNSW)
- Assistant RAG avec citations, références de vers/pages et réponse de repli anti-invention
- Pages individuelles avec distinction original/transcription/traduction/commentaire
- Authentification administrateur, rôles éditeur/validateur/admin et audit
- Import PDF/audio dans deux buckets privés avec contrôle du type et de la taille
- Interface responsive prête pour Vercel

## Installation locale

Prérequis : Node.js 20+, un projet Supabase et une clé API OpenAI.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Renseignez les six variables de `.env.local`. La clé `SUPABASE_SERVICE_ROLE_KEY` et la clé OpenAI sont exclusivement utilisées côté serveur et ne doivent jamais porter le préfixe `NEXT_PUBLIC_`.

## Initialiser Supabase

1. Créez un projet Supabase dans une région adaptée à vos utilisateurs.
2. Exécutez, dans l’ordre, les fichiers de `supabase/migrations/` depuis le SQL Editor (ou `supabase db push` avec la CLI).
3. Exécutez `supabase/seed.sql` pour importer uniquement les métadonnées de départ non vérifiées.
4. Dans Authentication, créez le premier utilisateur, puis promouvez-le en `admin` avec la requête commentée dans `002_profile_bootstrap.sql`.
5. Configurez l’URL du site et les URL de redirection dans Authentication.

La migration active RLS. Le public ne peut lire que les contenus `verified`; la clé de service reste côté serveur. Les fichiers ne sont pas publics : une publication devra enregistrer une URL signée ou passer par une route serveur contrôlée.

## Flux éditorial

1. L’éditeur crée la fiche, importe le média et découpe le texte selon les vers/chapitres/pages.
2. Il conserve distinctement texte arabe original, transcription, traduction et commentaire.
3. Un validateur vérifie la source et marque les passages `verified`.
4. La fiche est publiée (`is_verified=true`) seulement quand sa provenance est documentée.
5. L’embedding doit être recalculé après toute correction du contenu textuel.

Les entrées du seed ne sont pas un corpus religieux validé. Elles sont volontairement invisibles au public jusqu’à revue humaine.

## Déploiement Vercel

Importez le dépôt dans Vercel, ajoutez les variables de `.env.example`, puis lancez le déploiement. Configurez ensuite le domaine dans Vercel; HTTPS est fourni automatiquement. Activez les sauvegardes/PITR Supabase selon le niveau de service retenu et définissez une politique de rétention.

Commandes de contrôle avant déploiement :

```bash
npm run typecheck
npm run build
```

## Import du catalogue PDF Xassaid

L’importeur associe les PDF publics de Xassaid aux fiches correspondantes et extrait les éditions françaises page par page pour la recherche textuelle :

```bash
bun --env-file=.env.local scripts/import-xassaid.ts
```

Il est idempotent : un nouvel import remplace uniquement les passages provenant du même PDF. Chaque passage conserve l’URL source et le numéro de page. Les scans arabes sont liés aux fiches mais nécessitent un traitement OCR séparé.

## Limites explicites de cette livraison

- Le premier corpus de 10 à 20 khassaïdes doit être fourni et validé par le comité compétent.
- L’extraction OCR/PDF n’est pas automatisée : l’admin accepte les passages corrigés afin d’éviter de publier un OCR non contrôlé.
- Le nom de domaine, les clés cloud, les sauvegardes payantes et la création des comptes nécessitent les accès du propriétaire.
