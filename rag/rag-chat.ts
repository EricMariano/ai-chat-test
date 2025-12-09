/**
 * Chat principal com RAG
 * 
 * Integra pipeline RAG com lógica de tipos de resposta
 * (transacional/insight/educação) do sistema existente
 */

import { ragChat, type RAGResult } from "./rag-pipeline.ts";

type ReplyKind = "transacional" | "insight" | "educacao";

/**
 * Determina tipo de resposta e limites de caracteres baseado na query
 * Reutiliza lógica do gemini-chat.ts
 */
function chooseTarget(q: string): { kind: ReplyKind; max: number; min: number } {
  const lower = q.toLowerCase();
  if (lower.includes("quanto") || lower.includes("gastei") || lower.includes("pagarei")) {
    return { kind: "transacional", min: 0, max: 140 };
  }
  if (lower.includes("como está") || lower.includes("saúde financeira") || lower.includes("resumo")) {
    return { kind: "insight", min: 250, max: 500 };
  }
  return { kind: "educacao", min: 200, max: 500 }; // padrão da sua faixa desejada
}

/**
 * Ajusta texto para ficar dentro do range de caracteres
 * Reutiliza lógica do gemini-chat.ts
 */
function trimToRange(text: string, min: number, max: number): string {
  const clean = text.trim();
  if (clean.length > max) return clean.slice(0, max).trimEnd();
  if (clean.length < min) return clean; // confia no modelo para completar no próximo turno
  return clean;
}

/**
 * Chat com RAG integrado
 * 
 * @param userMessage Mensagem do usuário
 * @param currentDate Data atual (padrão: new Date())
 * @returns Resposta do chat com RAG aplicado
 */
export async function chat(
  userMessage: string,
  currentDate: Date = new Date()
): Promise<string> {
  // Determina tipo de resposta e limites
  const { min, max, kind } = chooseTarget(userMessage);

  // Executa pipeline RAG
  const ragResult: RAGResult = await ragChat(userMessage, currentDate);

  // Ajusta resposta para ficar dentro do range de caracteres
  const trimmedResponse = trimToRange(ragResult.response, min, max);

  return trimmedResponse;
}

/**
 * Chat com RAG retornando metadados completos
 * 
 * @param userMessage Mensagem do usuário
 * @param currentDate Data atual (padrão: new Date())
 * @returns Resultado completo com resposta e metadados
 */
export async function chatWithMetadata(
  userMessage: string,
  currentDate: Date = new Date()
): Promise<{
  response: string;
  metadata: RAGResult["metadata"] & {
    chunksUsed: RAGResult["chunksUsed"];
    characterRange: { min: number; max: number };
  };
}> {
  const { min, max, kind } = chooseTarget(userMessage);
  const ragResult = await ragChat(userMessage, currentDate);
  const trimmedResponse = trimToRange(ragResult.response, min, max);

  return {
    response: trimmedResponse,
    metadata: {
      ...ragResult.metadata,
      chunksUsed: ragResult.chunksUsed,
      characterRange: { min, max },
    },
  };
}
