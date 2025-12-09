/**
 * Geração de embeddings via Ollama usando nomic-embed-text
 * Retorna vetores de 768 dimensões
 */

import ollama from "ollama";

/**
 * Gera embedding para um texto usando nomic-embed-text via Ollama
 * @param text Texto para gerar embedding
 * @returns Array de números representando o vetor de embedding (768 dimensões)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ollama.embeddings({
      model: "nomic-embed-text",
      prompt: text,
    });

    if (!response.embedding || response.embedding.length === 0) {
      throw new Error("Embedding vazio retornado pelo Ollama");
    }

    return response.embedding;
  } catch (error) {
    console.error("Erro ao gerar embedding:", error);
    throw new Error(`Falha ao gerar embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Gera embeddings em batch (útil para popular o vector DB)
 * @param texts Array de textos para gerar embeddings
 * @returns Array de embeddings
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}
