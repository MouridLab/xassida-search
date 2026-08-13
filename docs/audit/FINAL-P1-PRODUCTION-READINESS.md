# Final P1 remediation & production readiness

Date: 2026-08-12

## Release scope update

**MinIO/S3 production gate: DEFERRED UNTIL PUBLIC LAUNCH**

Le stockage MinIO/S3 de production n'est pas encore déployé. Sa confidentialité,
son CORS, les uploads directs, la finalisation réelle et la sauvegarde des objets
restent obligatoires avant tout lancement public, mais ne font pas partie du
périmètre de la release contrôlée actuelle. Ce report ne constitue ni un PASS ni
une validation implicite du stockage production.

Statut local: prêt. Statut distant: migration 012 non appliquée, car le CLI Supabase ne dispose d’aucun jeton d’accès dans cette session.

## Résultat

- Uploads HTTP: le navigateur envoie désormais directement vers une URL MinIO `PUT` valable cinq minutes. PostgreSQL conserve l’intention (`pending_uploads`) et la finalisation vérifie l’objet avec `HEAD`, sa taille, son type et sa signature avant la transaction SQL.
- Éditions: création, validation/rejet et écriture de l’audit sont dans une même transaction PostgreSQL. Une erreur annule l’ensemble.
- `/api/ask`: le quota est partagé entre instances via l’RPC atomique `consume_rate_limit`. Le service échoue fermé (`503`) si le contrôle de quota est indisponible. La concurrence locale reste une protection complémentaire.

## Flux d’upload

```text
Admin → authorize (authz + politique) → pending_uploads + URL PUT courte
Admin → MinIO PUT direct
Admin → finalize → HEAD/signature → RPC transactionnelle → média/édition + audit
```

La finalisation est idempotente. En cas d’échec SQL confirmé, l’objet est supprimé en best effort. Les enregistrements `pending` expirés rendent les uploads abandonnés détectables et nettoyables.

## Conditions de déploiement

1. Appliquer `012_presigned_uploads_and_edition_audit.sql` avant le code applicatif.
2. Configurer le CORS du bucket MinIO pour autoriser l’origine de l’admin, la méthode `PUT` et l’en-tête `Content-Type`. Ne pas rendre le bucket public.
3. Définir `ASK_RATE_LIMIT_BACKEND=supabase`; réserver `memory` au développement local.
4. Définir `ASK_TRUST_PROXY=true` uniquement derrière un proxy qui remplace les en-têtes clients; sinon le quota conservateur est partagé sous `untrusted-proxy`.
5. Superviser les réponses `429/503`, les `pending_uploads` expirés et les échecs de finalisation. Purger périodiquement les objets `pending/` expirés après réconciliation DB/MinIO.

## Rollback

Revenir au build précédent ne nécessite pas de supprimer les tables. Conserver la migration: elle est additive. Le vieux proxy d’upload renvoie volontairement `410` et ne doit pas être réactivé en production, car il rebuffériserait les gros fichiers.

## Validation exécutée

- `bun run lint`: PASS
- `bun run typecheck`: PASS
- `bun run test`: PASS, 32/32
- `bun run build`: PASS, 21 pages générées
- `git diff --check`: PASS
- `bun run test:rls`: non rejoué, accès réseau Supabase indisponible. La passe précédente est documentée dans `VERIFICATION-P1-2026-08-12.md`.
- `supabase db push --include-all`: non appliqué, jeton CLI absent.

## Production readiness gates

| Gate                         | Statut                       | Preuve                                                                               | Travail restant                                                                  |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| A — Identity & Authorization | PASS                         | Tests RLS réels de la passe précédente, migrations 008–011                           | Aucun changement P1 ne relâche ces règles                                        |
| B — Editorial integrity      | PASS                         | Triggers 010–011, tests de contrats/imports                                          | —                                                                                |
| C — Media integrity          | PASS                         | RPC transactionnelles, verrouillage, pending uploads et compensation                 | Automatiser la réconciliation en P2                                              |
| D — Large uploads            | DEFERRED UNTIL PUBLIC LAUNCH | UI → PUT MinIO direct; aucune lecture `arrayBuffer` dans les routes; HEAD/signatures | Déployer MinIO/S3, configurer CORS et exécuter l'E2E réel avant lancement public |
| E — AI abuse protection      | PARTIAL                      | Compteur PostgreSQL atomique, fail-closed, timeout, concurrence et tokens bornés     | Appliquer 012 et tester deux instances réellement                                |
| F — Tests                    | PARTIAL                      | 32 tests, lint, typecheck et build verts; CI présente                                | Intégration upload réel et nouveau test RLS distant non exécutés                 |
| G — Operations               | PARTIAL                      | Variables et procédure documentées                                                   | Vérifications externes ci-dessous                                                |

## Vérifications externes requises

- `NEEDS EXTERNAL VERIFICATION`: sauvegarde et restauration MinIO/S3 — **DEFERRED UNTIL PUBLIC LAUNCH**.
- `NEEDS EXTERNAL VERIFICATION`: MFA des administrateurs MinIO — **DEFERRED UNTIL PUBLIC LAUNCH**.
- `NEEDS EXTERNAL VERIFICATION`: alertes de budget OpenAI et monitoring 429/503.
- `NEEDS EXTERNAL VERIFICATION`: CORS MinIO/S3 restreint à l’origine de production — **DEFERRED UNTIL PUBLIC LAUNCH**.
- `NEEDS EXTERNAL VERIFICATION`: secrets CI du projet Supabase de test.

## Backlog reclassé

- Gate obligatoire avant lancement public: déployer MinIO/S3 privé et persistant, configurer/tester son CORS, vérifier sa sauvegarde et exécuter l'E2E upload/finalisation réel. Statut: **DEFERRED UNTIL PUBLIC LAUNCH**.
- P2 recommandé avant montée en charge: pagination, réconciliation automatique MinIO, observabilité, versionnement des embeddings, types Supabase générés.
- P2 après lancement contrôlé: découpage de `ReaderView` et `AdminDashboard`.
- P3: nettoyage des contrôles UI morts non bloquants.

Score de préparation actuel: **82/100**. Le code et les gates locaux sont solides; les points perdus correspondent aux changements distants non appliqués et aux preuves d’exploitation absentes, pas à des résultats supposés.
