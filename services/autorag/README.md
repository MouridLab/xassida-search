# MouridLab Xassida RAG

Microservice privé de recherche documentaire pour Xassida Search. Il synchronise les passages vérifiés depuis Supabase, construit un index BM25 avec AutoRAG et utilise un unique appel local à Ollama pour produire une réponse française sourcée.

## API

- `GET /health` — état du service;
- `POST /search` — question JSON authentifiée par `Authorization: Bearer <token>`.

```json
{ "question": "Quels passages parlent de Touba ?" }
```

Le service doit rester sur un réseau privé. Il ne requiert aucune clé OpenAI et ne doit recevoir ni clé Supabase `service_role`, ni données non validées.

## Configuration

Copiez `.env.example` vers un fichier local non versionné, puis renseignez les variables sans les publier.

```bash
docker compose up -d ollama
docker compose exec ollama ollama pull qwen3:4b
docker compose up -d --build autorag
curl --fail http://127.0.0.1:8080/health
```

## Développement

```bash
npm ci
bun build server.ts --target=bun --outdir=/tmp/xassida-rag-build
```

Voir `SECURITY.md` avant toute exposition réseau ou ajout d’une nouvelle source documentaire.
