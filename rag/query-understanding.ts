/**
 * Query Understanding Layer
 * 
 * Traduz linguagem natural em filtros SQL para LanceDB.
 * Usa Llama 3.1:8b como "tradutor" para converter expressões temporais
 * em filtros SQL concretos.
 */

import ollama from "ollama";
import { parseTemporalExpression } from "./utils/temporal.ts";

/**
 * Estrutura de resposta do Query Understanding
 * O Llama 3.1:8b vai preencher isso analisando a query do usuário
 */
export interface QueryIntent {
  type: "transacional" | "insight" | "educacao";
  hasTemporalFilter: boolean;
  temporalExpression?: string; // Ex: "mês passado", "carnaval", "últimos 30 dias"
  dateStart?: string; // ISO 8601: YYYY-MM-DD
  dateEnd?: string; // ISO 8601: YYYY-MM-DD
  keywords: string[]; // Palavras-chave para busca semântica
}

/**
 * Filtros SQL-ready para o LanceDB
 */
export interface LanceDBFilters {
  whereClause: string; // Ex: "type = 'transacional' AND date >= '2024-03-01' AND date <= '2024-03-31'"
  searchKeywords: string[]; // Para busca semântica
}

/**
 * Query Understanding Layer
 * 
 * Pipeline:
 * 1. Usuário pergunta: "Quanto gastei mês passado?"
 * 2. Llama extrai: { type: "transacional", temporalExpression: "mês passado" }
 * 3. Função converte "mês passado" em datas ISO: { dateStart: "2024-03-01", dateEnd: "2024-03-31" }
 * 4. Retorna filtros SQL: "type = 'transacional' AND date >= '2024-03-01' AND date <= '2024-03-31'"
 */
export async function understandQuery(
  userQuery: string,
  currentDate: Date = new Date()
): Promise<LanceDBFilters> {
  // Passo 1: Llama extrai entidades da query
  const intent = await extractIntent(userQuery, currentDate);
  
  // Passo 2: Converter expressões temporais em datas ISO 8601
  const filters = buildLanceDBFilters(intent, currentDate);
  
  return filters;
}

/**
 * Usa Llama 3.1:8b para extrair intenção e entidades temporais da query
 */
async function extractIntent(
  query: string,
  currentDate: Date
): Promise<QueryIntent> {
  const dateContext = currentDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'long'
  });

  const systemPrompt = `Você é um extrator de intenções para um sistema de finanças pessoais.

Analise a query do usuário e extraia:
1. Tipo de pergunta: "transacional" (quanto, gastos, receitas), "insight" (resumo, saúde financeira), ou "educacao" (como, o que é)
2. Se há referência temporal (mês passado, carnaval, última semana, etc.)
3. Palavras-chave relevantes para busca semântica

DATA ATUAL: ${dateContext}

Responda APENAS em JSON válido, sem markdown, sem explicações:
{
  "type": "transacional" | "insight" | "educacao",
  "hasTemporalFilter": boolean,
  "temporalExpression": "string opcional (ex: 'mês passado', 'carnaval', 'últimos 30 dias')",
  "keywords": ["palavra1", "palavra2"]
}`;

  try {
    const response = await ollama.chat({
      model: "llama3.1:8b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      format: "json", // Força resposta em JSON
      options: {
        temperature: 0.1, // Baixa temperatura para respostas mais determinísticas
      }
    });

    const content = response.message.content;
    
    // Parse do JSON (pode vir com markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const intent = JSON.parse(jsonStr) as QueryIntent;

    return intent;
  } catch (error) {
    console.error("Erro ao extrair intenção:", error);
    // Fallback: análise básica sem LLM
    return fallbackIntentExtraction(query);
  }
}

/**
 * Converte expressões temporais em datas ISO 8601 e constrói filtros SQL
 */
function buildLanceDBFilters(
  intent: QueryIntent,
  currentDate: Date
): LanceDBFilters {
  const filters: string[] = [];
  
  // Filtro por tipo
  filters.push(`type = '${intent.type}'`);
  
  // Filtro temporal (se houver)
  if (intent.hasTemporalFilter && intent.temporalExpression) {
    const dateRange = parseTemporalExpression(intent.temporalExpression, currentDate);
    
    if (dateRange.start && dateRange.end) {
      filters.push(`date >= '${dateRange.start}'`);
      filters.push(`date <= '${dateRange.end}'`);
    }
  }
  
  const whereClause = filters.join(" AND ");
  
  return {
    whereClause,
    searchKeywords: intent.keywords
  };
}

/**
 * Fallback: extração básica sem LLM (caso o Llama falhe)
 */
function fallbackIntentExtraction(query: string): QueryIntent {
  const lower = query.toLowerCase();
  
  let type: "transacional" | "insight" | "educacao" = "educacao";
  if (lower.includes("quanto") || lower.includes("gastei") || lower.includes("recebi") || lower.includes("pagarei")) {
    type = "transacional";
  } else if (lower.includes("resumo") || lower.includes("saúde financeira") || lower.includes("como está")) {
    type = "insight";
  }

  const hasTemporal = /mês|mes|semana|dia|abril|março|fevereiro|janeiro|carnaval|último|ultimo/.test(lower);
  
  // Tentar extrair expressão temporal
  let temporalExpression: string | undefined;
  if (hasTemporal) {
    if (lower.includes("mês passado") || lower.includes("mes passado")) {
      temporalExpression = "mês passado";
    } else if (lower.includes("últimos") || lower.includes("ultimos")) {
      const daysMatch = lower.match(/últimos?\s+(\d+)\s+dia/i) || lower.match(/ultimos?\s+(\d+)\s+dia/i);
      if (daysMatch) {
        temporalExpression = `últimos ${daysMatch[1]} dias`;
      }
    }
  }
  
  return {
    type,
    hasTemporalFilter: hasTemporal,
    temporalExpression,
    keywords: query.split(/\s+/).filter(w => w.length > 3)
  };
}

