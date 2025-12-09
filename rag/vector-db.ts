/**
 * Setup e operações do LanceDB
 * Vector database para armazenar chunks financeiros com embeddings
 */

import * as lancedb from "@lancedb/lancedb";
import { isValidISO8601Date } from "./utils/temporal.ts";

/**
 * Schema de um chunk financeiro
 */
export interface FinancialChunk {
  id: string;
  embedding: number[];
  text: string;
  type: "transacional" | "insight" | "educacao";
  date: string; // ISO 8601: YYYY-MM-DD - OBRIGATÓRIO
  source: string;
  amount?: number; // Opcional, para transações
}

/**
 * Resultado de busca no LanceDB
 */
export interface SearchResult {
  id: string;
  text: string;
  type: "transacional" | "insight" | "educacao";
  date: string;
  source: string;
  amount?: number;
  _distance?: number; // Distância do embedding (similaridade)
}

let db: lancedb.Database | null = null;
let table: lancedb.Table | null = null;

const DB_PATH = "./data/lancedb";
const TABLE_NAME = "financial_chunks";

/**
 * Inicializa o LanceDB e abre a tabela (se existir)
 * A tabela será criada automaticamente no primeiro insert
 */
export async function initLanceDB(): Promise<void> {
  try {
    // Conecta ao database (cria se não existir)
    db = await lancedb.connect(DB_PATH);

    // Tenta abrir a tabela existente
    try {
      table = await db.openTable(TABLE_NAME);
      console.log(`Tabela ${TABLE_NAME} aberta com sucesso`);
    } catch (error) {
      // Se a tabela não existe, será criada no primeiro insert
      console.log(`Tabela ${TABLE_NAME} não encontrada. Será criada no primeiro insert.`);
      table = null;
    }
  } catch (error) {
    console.error("Erro ao inicializar LanceDB:", error);
    throw new Error(`Falha ao inicializar LanceDB: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Valida um chunk antes de inserir
 */
function validateChunk(chunk: FinancialChunk): void {
  if (!chunk.id) {
    throw new Error("Chunk deve ter um id");
  }
  if (!chunk.embedding || chunk.embedding.length === 0) {
    throw new Error("Chunk deve ter um embedding");
  }
  if (!chunk.text || chunk.text.trim().length === 0) {
    throw new Error("Chunk deve ter texto");
  }
  if (!chunk.type || !["transacional", "insight", "educacao"].includes(chunk.type)) {
    throw new Error("Chunk deve ter um tipo válido: transacional, insight ou educacao");
  }
  if (!chunk.date) {
    throw new Error("Chunk deve ter uma data (campo obrigatório)");
  }
  if (!isValidISO8601Date(chunk.date)) {
    throw new Error(`Data inválida: ${chunk.date}. Deve estar no formato ISO 8601 (YYYY-MM-DD)`);
  }
  if (!chunk.source) {
    throw new Error("Chunk deve ter uma fonte");
  }
}

/**
 * Insere chunks no LanceDB
 * @param chunks Array de chunks para inserir
 */
export async function insertChunks(chunks: FinancialChunk[]): Promise<void> {
  if (!db) {
    await initLanceDB();
  }

  if (!db) {
    throw new Error("Database não inicializado");
  }

  // Valida todos os chunks antes de inserir
  for (const chunk of chunks) {
    validateChunk(chunk);
  }

  try {
    // Mapeia chunks para o formato do LanceDB (renomeia "embedding" para "vector")
    const lancedbChunks = chunks.map((chunk) => ({
      id: chunk.id,
      vector: chunk.embedding, // Renomeia para "vector" (padrão do LanceDB)
      text: chunk.text,
      type: chunk.type,
      date: chunk.date,
      source: chunk.source,
      amount: chunk.amount,
    }));

    // Se a tabela não existe, cria com os primeiros dados
    if (!table) {
      console.log(`Criando tabela ${TABLE_NAME} com ${lancedbChunks.length} chunks iniciais...`);
      table = await db.createTable(TABLE_NAME, lancedbChunks);
      console.log(`Tabela ${TABLE_NAME} criada com sucesso`);
    } else {
      // Adiciona novos chunks à tabela existente
      await table.add(lancedbChunks);
    }

    // Cria índices escalares para melhor performance nas queries temporais
    try {
      await table.createScalarIndex("date");
      await table.createScalarIndex("type");
    } catch (error) {
      // Índices podem já existir, ignora erro
      console.log("Índices podem já existir, continuando...");
    }

    console.log(`${chunks.length} chunks inseridos com sucesso`);
  } catch (error) {
    console.error("Erro ao inserir chunks:", error);
    throw new Error(`Falha ao inserir chunks: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Busca chunks no LanceDB com pre-filtering
 * @param queryEmbedding Embedding da query para busca semântica
 * @param whereClause Cláusula WHERE SQL para pre-filtering (ex: "type = 'transacional' AND date >= '2024-03-01'")
 * @param limit Número máximo de resultados (padrão: 5)
 * @returns Array de resultados da busca
 */
export async function searchChunks(
  queryEmbedding: number[],
  whereClause?: string,
  limit: number = 5
): Promise<SearchResult[]> {
  if (!db) {
    await initLanceDB();
  }

  if (!db) {
    throw new Error("Database não inicializado");
  }

  // Se a tabela não existe, retorna array vazio (não há dados para buscar)
  if (!table) {
    console.log(`Tabela ${TABLE_NAME} não existe. Retornando resultados vazios.`);
    return [];
  }

  try {
    // Especifica explicitamente a coluna "vector" para a busca vetorial
    let query = table.search(queryEmbedding).column("vector");

    // Aplica pre-filtering se fornecido
    if (whereClause) {
      // Converte filtros de string para formato SQL do LanceDB
      // O LanceDB espera formato SQL, então precisamos ajustar a sintaxe
      // Ex: "type = 'transacional' AND date >= '2024-03-01'" 
      // → "type = 'transacional' AND date >= date '2024-03-01'"
      const sqlWhere = whereClause.replace(/date\s*(>=|<=|>|<|=)\s*'([^']+)'/g, (match, op, date) => {
        return `date ${op} date '${date}'`;
      });
      
      query = query.where(sqlWhere);
    }

    const results = await query.limit(limit).toArray();

    // Mapeia resultados para o formato esperado
    return results.map((result: any) => ({
      id: result.id,
      text: result.text,
      type: result.type,
      date: result.date,
      source: result.source,
      amount: result.amount,
      _distance: result._distance,
    })) as SearchResult[];
  } catch (error) {
    console.error("Erro ao buscar chunks:", error);
    throw new Error(`Falha ao buscar chunks: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Obtém a tabela atual (útil para operações avançadas)
 */
export function getTable(): lancedb.Table | null {
  return table;
}

/**
 * Fecha a conexão com o database
 */
export async function closeLanceDB(): Promise<void> {
  // LanceDB não requer fechamento explícito, mas podemos limpar referências
  table = null;
  db = null;
}
