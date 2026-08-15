# AutoRAG local sans OpenAI

Xassida Search utilise AutoRAG 2.0 comme service privé et Ollama comme moteur local. Les passages publiés restent dans Supabase. Le service synchronise uniquement les khassidas vérifiés et leurs passages `verified` dans un volume local, puis construit un index BM25. À chaque question, l'API de récupération BM25 d'AutoRAG sélectionne quatre passages au maximum et un seul appel à Qwen rédige la réponse sourcée.

## Pré-requis

- Docker avec au moins 8 Go de mémoire disponible;
- environ 6 Go d’espace libre pour l’image et `qwen3:4b`;
- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ciblant le projet voulu;
- un `AUTORAG_INTERNAL_TOKEN` long et aléatoire, identique pour Next.js et AutoRAG.

Aucune clé OpenAI n’est utilisée. La clé Supabase de service n’est pas transmise au service AutoRAG.
La valeur `openai-completions` du fichier de configuration désigne uniquement le protocole HTTP compatible exposé localement par Ollama; elle ne contacte pas OpenAI.

## Premier démarrage

```bash
docker compose -f docker-compose.autorag.yml up -d ollama
docker compose -f docker-compose.autorag.yml exec ollama ollama pull qwen3:4b
docker compose -f docker-compose.autorag.yml up -d --build autorag
curl http://127.0.0.1:8080/health
```

Le port AutoRAG écoute uniquement sur `127.0.0.1`. Ne l’exposez pas publiquement. Le démarrage synchronise le corpus vérifié et reconstruit les miroirs et l’index BM25.

## Variables Next.js

```dotenv
AUTORAG_SERVICE_URL=http://127.0.0.1:8080
AUTORAG_INTERNAL_TOKEN=<token local long et aléatoire>
```

## Mise à jour du corpus

Après publication ou correction de passages, reconstruire le service pour relancer la synchronisation contrôlée :

```bash
docker compose -f docker-compose.autorag.yml restart autorag
docker compose -f docker-compose.autorag.yml logs -f autorag
```

Le remplacement du miroir local est atomique et refusé si Supabase ne retourne aucun passage vérifié.

## Limites du prototype

- L’index initial est BM25; MinSync sémantique reste désactivé jusqu’à validation d’un embedder multilingue local.
- La génération utilise un unique appel local à `qwen3:4b`, sans raisonnement interne, limité à 160 tokens et à un contexte de 4096 tokens. Cette voie évite l'orchestration multi-agent, trop lente sur une machine sans GPU dédié.
- Le volume `autorag_data` contient le corpus vérifié, les index, les journaux et la mémoire AutoRAG. Il doit être sauvegardé et persistant en production.
- Le volume `ollama_models` contient le modèle local et ne doit pas être éphémère.
- AutoRAG 2.1.0 dépend encore de `slides-grab`/`image-size`, pour lesquels npm signale des dénis de service possibles sur certaines images ICNS, JXL et HEIF sans correctif publié. Xassida Search ne fournit à AutoRAG que des fichiers Markdown générés depuis les passages Supabase vérifiés; ne montez aucun dossier contenant des présentations ou images non fiables dans le conteneur.

## Production

Déployer Ollama et AutoRAG sur un hôte privé disposant de suffisamment de RAM, idéalement avec GPU. Seul Next.js doit joindre AutoRAG. Configurer des healthchecks, limites CPU/RAM, sauvegardes des volumes, rotation du token interne et supervision des délais/erreurs avant le lancement public.
