# Rapport de remédiation

Date : 12 août 2026

## Résumé

| Finding                                   | Statut                                     | Résultat                                                                    |
| ----------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| Nouveaux comptes automatiquement `editor` | CONFIRMED — corrigé dans le repository     | Migration `008`, rôle `pending`, gardes et tests                            |
| `/api/ask` sans protection d’abus         | CONFIRMED — partiellement corrigé          | Taille, validation, rate limit local, concurrence, timeout et erreurs sûres |
| Incohérence MinIO/PostgreSQL              | CONFIRMED — corrigé sur routes principales | Transaction SQL média, verrou, compensation MinIO                           |
| Imports automatiquement vérifiés          | CONFIRMED — corrigé                        | Passages en `review`, seed sans validation forcée                           |
| Erreurs de validation en HTTP 500         | CONFIRMED — corrigé                        | Modèle 400/401/403/409/500                                                  |
| Gros uploads bufferisés                   | CONFIRMED — backlog                        | Upload direct dépendant de MinIO CORS/hébergeur                             |

## Sécurité

- Les nouveaux profils deviennent `pending`; les comptes staff existants sont préservés.
- Les rôles privilégiés sont centralisés et ne proviennent jamais du client.
- La RPC de remplacement média est réservée à `service_role`.
- `/api/ask` limite payload, débit et concurrence et masque les erreurs OpenAI/PostgreSQL.
- Le rate limit reste local à chaque instance : une limite globale exige une infrastructure partagée.

## Intégrité des données

- Le remplacement du média principal est transactionnel dans PostgreSQL.
- Un verrou transactionnel sérialise les remplacements concurrents par œuvre/type.
- Un échec SQL après upload entraîne la suppression compensatoire du nouvel objet MinIO.
- Un échec de compensation est journalisé sans masquer l’erreur initiale.
- Les imports automatisés commencent en `review` et préservent les lignes déjà vérifiées.

## Safety net

26 tests couvrent :

- matrice des rôles ;
- contrat de migration `pending` et RLS ;
- permissions de la RPC média ;
- validation, rate limiting, concurrence et identité client de `/api/ask` ;
- compensation MinIO ;
- statut éditorial des imports ;
- mapping des erreurs HTTP.

Les tests RLS sont actuellement des tests de contrat statiques. Un environnement Supabase de test est requis pour tester l’exécution réelle des policies.

## Validation exécutée

- `npm run test` : 26/26 réussis ;
- `npm run typecheck` : réussi ;
- `npm run build` : réussi ;
- `git diff --check` : réussi ;
- recherche de secrets ajoutés : aucun secret détecté.

## Déploiement requis

1. Appliquer `008_pending_profile_role.sql`.
2. Appliquer `009_atomic_primary_media.sql`.
3. Vérifier que l’inscription publique Supabase est désactivée ou conforme au besoin.
4. Configurer les variables `ASK_RATE_LIMIT`, `ASK_RATE_WINDOW_MS` et `ASK_MAX_CONCURRENCY` si les valeurs par défaut ne conviennent pas.
5. Vérifier la confiance accordée par l’hébergeur à `x-forwarded-for`.
6. Mettre en place un rate limiter partagé avant un déploiement multi-instance à fort trafic.

## Backlog restant

### P1

- uploads directs présignés pour les fichiers volumineux ;
- tests RLS et API avec un Supabase de test réel ;
- CI non interactive ;
- audit transactionnel complet des éditions.

### P2

- pagination ;
- versionnement des embeddings ;
- types Supabase générés ;
- refactor progressif des composants monolithiques après extension des tests.

## Readiness réévaluée

| Axe                  | Avant | Maintenant |
| -------------------- | ----: | ---------: |
| Architecture         |   6,5 |          7 |
| Maintenabilité       |     5 |          6 |
| Qualité du code      |   5,5 |        6,5 |
| Sécurité             |     5 |          7 |
| Performance          |     5 |        5,5 |
| Tests                |     1 |          5 |
| Developer Experience |     5 |          6 |
| Production readiness |     4 |          6 |

Ces notes supposent l’application effective des migrations. Les contrôles d’infrastructure non observables depuis le repository ne sont pas considérés comme corrigés.
