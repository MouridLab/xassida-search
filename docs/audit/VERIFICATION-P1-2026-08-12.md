# Vérification de remédiation et hardening P1

Date : 12 août 2026

## Verification Summary

- Migration `008` : confirmée additive ; les comptes existants restent inchangés et les nouveaux profils deviennent `pending`.
- Autorisation API : `pending` est refusé, `editor` peut éditer, `validator/admin` peuvent valider.
- RLS réelle : testée sur Supabase avec JWT anonymous, pending, editor et validator.
- Migration média `009` : RPC `security invoker`, verrou par œuvre/type, transaction SQL et audit média atomique ; exécution réservée à `service_role`.
- Compensation MinIO : l’erreur SQL reste l’erreur principale et l’échec de nettoyage est logué.
- Imports : les passages automatiques restent en `review`; recherche/RAG/pages publiques filtrent `verified`.
- `/api/ask` : taille, validation, fenêtre locale, concurrence, timeout et erreurs upstream bornés.

## Problems Found in Previous Remediation

1. Les tests RLS étaient statiques et ne détectaient pas un contournement direct editor → publication.
2. La migration `010` initiale utilisait des champs `NEW` incompatibles entre tables. Le test RLS réel l’a détecté ; `011` corrige avec `to_jsonb(NEW)`.
3. Le rate limiter faisait confiance à `x-forwarded-for` sans opt-in de déploiement.
4. Le script RLS avait une hypothèse faible : un UPDATE filtré par RLS peut retourner sans erreur et modifier zéro ligne. Le test vérifie désormais l’état final.
5. Le script RLS nouvellement ajouté avait une annotation TypeScript incorrecte, corrigée avant livraison.

## Fixes Applied

- `010_enforce_editorial_validation.sql` : triggers anti-publication directe par editor.
- `011_fix_editorial_validation_trigger.sql` : accès générique sûr aux champs de statut.
- `ASK_TRUST_PROXY=false` par défaut ; l’IP transmise n’est utilisée qu’après opt-in explicite.
- Script `test:rls` avec création et nettoyage de comptes temporaires.
- ESLint non interactif et CI GitHub Actions.

## Tests Strengthened

- 28 tests unitaires/contrats passent.
- Test RLS distant réussi pour anonymous, pending, editor et validator.
- Le test vérifie l’état final du rôle pending, pas seulement la présence d’une erreur HTTP.
- Les comptes et données temporaires ont été nettoyés : un seul profil admin existant reste présent.

## RLS Status

**Contrat statique :** migrations, rôles, triggers et permissions RPC vérifiés par Vitest.

**Exécution réelle :** réussie sur le projet Supabase lié :

- anonymous : brouillons invisibles, mutation refusée ;
- pending : mutation privilégiée refusée, auto-promotion impossible ;
- editor : création d’un brouillon autorisée, publication directe refusée ;
- validator : publication autorisée ;
- service role : utilisé uniquement pour fixture/cleanup et mutations backend réservées.

## `/api/ask` Protection Level

- Développement local : protection raisonnable par instance.
- Instance persistante unique : protection raisonnable, sous réserve de `ASK_TRUST_PROXY` correctement configuré.
- Multi-instance/serverless : `PARTIALLY PROTECTED`; fenêtre et concurrence ne sont pas globales et sont réinitialisées aux cold starts.
- `x-forwarded-for` n’est pas utilisé par défaut. L’activer exige la preuve que le proxy le réécrit.

## Media Consistency Guarantees

Garanties :

- l’ancien primaire et le nouveau média sont basculés dans une transaction SQL ;
- l’audit média appartient à cette transaction ;
- un verrou transactionnel sérialise un couple `(khassida_id, kind)` ;
- une erreur SQL annule la bascule et déclenche une suppression MinIO best-effort.

Limites :

- MinIO et PostgreSQL ne sont pas atomiques ensemble ;
- un échec de compensation peut laisser un objet orphelin ;
- aucun job de réconciliation automatisé n’existe encore ;
- l’audit des éditions n’est pas encore transactionnel.

## CI Status

CI GitHub Actions présente : installation gelée, format ciblé, lint, typecheck, tests et build.

Le job RLS est séparé et activable avec `RUN_RLS_INTEGRATION=true` et trois secrets Supabase de test. Il ne doit pas viser la production.

Le formatage global historique échoue encore ; la CI contrôle les nouveaux fichiers de remédiation sans créer un reformatage massif hors scope.

## Presigned Upload Status

Backlog P1. Les routes continuent à bufferiser les fichiers. Le passage aux URLs présignées exige une configuration CORS MinIO et une stratégie de cleanup des uploads non finalisés.

## Final Security Gate

| Question                                                     | Réponse             | Preuve                                               |
| ------------------------------------------------------------ | ------------------- | ---------------------------------------------------- |
| Un nouveau compte devient-il staff automatiquement ?         | NO                  | trigger `pending`, test distant                      |
| Un pending peut-il se promouvoir ?                           | NO                  | état final contrôlé via service role                 |
| Un pending peut-il contourner l’API via Supabase ?           | NO                  | test RLS distant                                     |
| Anonymous peut-il déclencher OpenAI sans limite ?            | PARTIALLY PROTECTED | limite locale, non globale                           |
| Le rate limiting est-il global ?                             | NO                  | mémoire de l’instance                                |
| Un échec SQL peut-il supprimer le seul primaire valide ?     | NO                  | transaction SQL + ancien média conservé              |
| Deux remplacements concurrents créent-ils un état invalide ? | NO pour SQL         | advisory lock + index unique ; MinIO reste distribué |
| Un import review atteint-il le public/RAG ?                  | NO                  | filtres `verified` DB/RPC/pages                      |
| Les erreurs 500 exposent-elles l’infrastructure ?            | NO côté client      | message générique, détail dans logs serveur          |

## Deployment Requirements

- Migrations distantes appliquées jusqu’à `011`.
- Configurer `ASK_TRUST_PROXY=true` uniquement avec un proxy de confiance.
- Pour la CI RLS, utiliser un projet Supabase de test isolé.
- Configurer `RUN_RLS_INTEGRATION` et les secrets `TEST_SUPABASE_*`.
- Réparer ou remplacer le Node Homebrew local cassé ; la CI utilise Node 22.14.
- Les limites OpenAI globales, MFA, backups et restauration restent à vérifier hors repository.

## Remaining P1

1. Uploads directs présignés MinIO.
2. Audit transactionnel complet des mutations d’édition.
3. Rate limiting partagé avant passage multi-instance à trafic important.

## Production Readiness

La sécurité et les tests progressent grâce à une preuve RLS réelle et une CI reproductible. La note de production reste limitée par les gros uploads bufferisés, le rate limiting non distribué et l’absence de réconciliation MinIO automatique.
