# ai-test

**EN**: Personal finance AI assistant using Gemini and Llama with RAG (Retrieval Augmented Generation) for contextual responses.

**PT**: Assistente de finanças pessoais com IA usando Gemini e Llama, integrado com RAG para respostas contextuais.

## Features / Funcionalidades

**EN**: Gemini AI chat, Llama chat (Ollama), RAG pipeline with LanceDB, smart response types (transactional/insight/education).

**PT**: Chat com Gemini AI, chat com Llama (Ollama), pipeline RAG com LanceDB, tipos de resposta inteligentes (transacional/insight/educação).

## Install / Instalação

```bash
bun install
```

## Run / Execução

```bash
# Gemini chat
bun run index.ts
bun run gemini-chat.ts

# Llama chat (requires Ollama)
bun run llama-chat.ts

# RAG example
bun run rag/example.ts
```

## Environment / Variáveis de Ambiente

```bash
GEMINI_API_KEY=your_api_key
```

## Utils

**BrasilAPI**:
- **Taxas**: https://brasilapi.com.br/docs#tag/TAXAS/paths/~1taxas~1v1/get
- **Câmbio**: https://brasilapi.com.br/docs#tag/CAMBIO/paths/~1cambio~1v1~1cotacao~1%7Bmoeda%7D~1%7Bdata%7D/get

## Tech Stack / Tecnologias

Bun, @google/genai, ollama, @lancedb/lancedb
