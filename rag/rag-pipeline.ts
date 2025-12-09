/**
 * Pipeline RAG completo
 * 
 * Orquestra todo o fluxo:
 * 1. Query Understanding (extrai intenção e filtros temporais)
 * 2. Gera embedding da query
 * 3. Busca no LanceDB com pre-filtering
 * 4. Constrói contexto com top-k chunks
 * 5. Gera resposta com Llama 3.1:8b incluindo contexto e data atual
 */

import ollama from "ollama";
import { understandQuery, type LanceDBFilters } from "./query-understanding.ts";
import { generateEmbedding } from "./embeddings.ts";
import { searchChunks, type SearchResult } from "./vector-db.ts";
import { toISO8601 } from "./utils/temporal.ts";

/**
 * Resultado do pipeline RAG
 */
export interface RAGResult {
  response: string;
  chunksUsed: SearchResult[];
  metadata: {
    queryType: "transacional" | "insight" | "educacao";
    chunksFound: number;
  };
}

/**
 * Pipeline RAG principal
 * @param userQuery Query do usuário
 * @param currentDate Data atual (padrão: new Date())
 * @returns Resposta gerada pelo Llama com contexto RAG
 */
export async function ragChat(
  userQuery: string,
  currentDate: Date = new Date()
): Promise<RAGResult> {
  // Passo 1: Query Understanding
  const filters: LanceDBFilters = await understandQuery(userQuery, currentDate);

  // Passo 2: Gera embedding da query
  const queryEmbedding = await generateEmbedding(userQuery);

  // Passo 3: Busca no LanceDB com pre-filtering
  const chunks = await searchChunks(
    queryEmbedding,
    filters.whereClause,
    5 // top-k
  );

  // Passo 4: Constrói contexto
  const contextualQuery = buildContextualQuery(userQuery, chunks);

  // Passo 5: Gera resposta com Llama 3.1:8b
  const systemPrompt = buildSystemPrompt(currentDate);
  const response = await generateResponse(systemPrompt, contextualQuery);

  return {
    response,
    chunksUsed: chunks,
    metadata: {
      queryType: extractQueryType(filters.whereClause),
      chunksFound: chunks.length,
    },
  };
}

/**
 * Constrói system prompt com data atual dinamicamente
 */
function buildSystemPrompt(currentDate: Date): string {
  const dateStr = currentDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const dayOfWeek = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
  });

  return `Você é um assistente de finanças pessoais em português, conciso e assertivo.

DATA ATUAL: ${dateStr} (${dayOfWeek})

REGRAS DE RESPOSTA:
- Máximo 400 caracteres (3-4 frases)
- Use os contextos fornecidos para dar respostas específicas e precisas
- Sempre considere a data atual ao interpretar períodos temporais
- Para perguntas transacionais: vá direto ao número
- Para insights: comece com "Bottom Line" + 1 detalhe
- Para educação: resumo curto + ofereça detalhes
- Use 1-2 emojis temáticos
- Se não houver contexto relevante, diga "Não tenho informações suficientes sobre isso"
- Seja específico e assertivo baseado nos dados fornecidos`;
}

/**
 * Constrói query contextual combinando query do usuário com chunks relevantes
 */
function buildContextualQuery(userQuery: string, chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return userQuery;
  }

  const contextParts = chunks.map((chunk, index) => {
    let context = `[Contexto ${index + 1}]\n`;
    context += `Tipo: ${chunk.type}\n`;
    context += `Data: ${chunk.date}\n`;
    if (chunk.amount !== undefined) {
      context += `Valor: R$ ${chunk.amount.toFixed(2)}\n`;
    }
    context += `Fonte: ${chunk.source}\n`;
    context += `Conteúdo: ${chunk.text}\n`;
    return context;
  });

  return `Query do usuário: ${userQuery}

Contextos relevantes encontrados:
${contextParts.join("\n---\n")}

Baseado nos contextos acima, responda à query do usuário de forma específica e assertiva.`;
}

/**
 * Gera resposta usando Llama 3.1:8b
 */
async function generateResponse(
  systemPrompt: string,
  contextualQuery: string
): Promise<string> {
  try {
    const response = await ollama.chat({
      model: "llama3.1:8b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextualQuery },
      ],
      options: {
        temperature: 0.5, // Baixa temperatura para respostas mais determinísticas
        num_predict: 400, // Limita tokens para respostas curtas
      },
    });

    return response.message.content.trim();
  } catch (error) {
    console.error("Erro ao gerar resposta:", error);
    throw new Error(
      `Falha ao gerar resposta: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extrai tipo de query da cláusula WHERE
 */
function extractQueryType(whereClause: string): "transacional" | "insight" | "educacao" {
  if (whereClause.includes("type = 'transacional'")) {
    return "transacional";
  }
  if (whereClause.includes("type = 'insight'")) {
    return "insight";
  }
  return "educacao";
}
