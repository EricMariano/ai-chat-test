/**
 * Função para popular LanceDB com dados de teste
 * 
 * Cria exemplos de:
 * - Transações de diferentes meses
 * - Insights financeiros
 * - Conteúdo educativo
 * Todos com campo date obrigatório em ISO 8601
 */

import { initLanceDB, insertChunks, type FinancialChunk } from "./vector-db.ts";
import { generateEmbeddingsBatch } from "./embeddings.ts";
import { toISO8601 } from "./utils/temporal.ts";

/**
 * Gera dados de teste e popula o LanceDB
 */
export async function seedTestData(): Promise<void> {
  console.log("Inicializando LanceDB...");
  await initLanceDB();

  console.log("Gerando dados de teste...");
  const testChunks = generateTestChunks();

  console.log("Gerando embeddings para os chunks...");
  const texts = testChunks.map((chunk) => chunk.text);
  const embeddings = await generateEmbeddingsBatch(texts);

  // Adiciona embeddings aos chunks
  const chunksWithEmbeddings: FinancialChunk[] = testChunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));

  console.log("Inserindo chunks no LanceDB...");
  await insertChunks(chunksWithEmbeddings);

  console.log(`✅ ${chunksWithEmbeddings.length} chunks inseridos com sucesso!`);
}

/**
 * Gera chunks de teste com diferentes tipos e datas
 */
function generateTestChunks(): Omit<FinancialChunk, "embedding">[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Helper para calcular mês passado
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const chunks: Omit<FinancialChunk, "embedding">[] = [];

  // ===== TRANSAÇÕES (mês passado) =====
  chunks.push({
    id: "tx-001",
    text: "Gasto com supermercado no valor de R$ 450,00 em março. Compra mensal de alimentos e produtos de limpeza.",
    type: "transacional",
    date: toISO8601(new Date(lastMonthYear, lastMonth - 1, 5)),
    source: "extrato-bancario",
    amount: 450.0,
  });

  chunks.push({
    id: "tx-002",
    text: "Pagamento de conta de luz: R$ 180,50 no mês passado. Consumo médio para apartamento de 2 quartos.",
    type: "transacional",
    date: toISO8601(new Date(lastMonthYear, lastMonth - 1, 10)),
    source: "extrato-bancario",
    amount: 180.5,
  });

  chunks.push({
    id: "tx-003",
    text: "Recebimento de salário: R$ 3.200,00 no início do mês passado. Renda principal mensal.",
    type: "transacional",
    date: toISO8601(new Date(lastMonthYear, lastMonth - 1, 1)),
    source: "extrato-bancario",
    amount: 3200.0,
  });

  chunks.push({
    id: "tx-004",
    text: "Gasto com transporte: R$ 120,00 em passagens de ônibus durante o mês passado.",
    type: "transacional",
    date: toISO8601(new Date(lastMonthYear, lastMonth - 1, 15)),
    source: "extrato-bancario",
    amount: 120.0,
  });

  // ===== TRANSAÇÕES (mês atual) =====
  chunks.push({
    id: "tx-005",
    text: "Gasto com supermercado: R$ 380,00 este mês. Economia de R$ 70 comparado ao mês anterior.",
    type: "transacional",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 3)),
    source: "extrato-bancario",
    amount: 380.0,
  });

  chunks.push({
    id: "tx-006",
    text: "Pagamento de internet: R$ 99,90 este mês. Plano de 100MB.",
    type: "transacional",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 8)),
    source: "extrato-bancario",
    amount: 99.9,
  });

  // ===== INSIGHTS =====
  chunks.push({
    id: "insight-001",
    text: "Análise financeira: No mês passado, você gastou R$ 750,50 com despesas essenciais (supermercado, luz, transporte). Isso representa 23% da sua renda de R$ 3.200,00. Você está dentro de uma faixa saudável (recomendado: 20-30% para despesas essenciais).",
    type: "insight",
    date: toISO8601(new Date(lastMonthYear, lastMonth - 1, 28)),
    source: "analise-automatica",
  });

  chunks.push({
    id: "insight-002",
    text: "Resumo financeiro: Sua renda de R$ 3.200,00 permite economizar aproximadamente R$ 2.000,00 por mês após despesas essenciais. Com essa economia, você pode quitar dívidas ou começar a investir.",
    type: "insight",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 1)),
    source: "analise-automatica",
  });

  chunks.push({
    id: "insight-003",
    text: "Bottom Line: Você reduziu gastos com supermercado em 15% este mês comparado ao anterior. Continue monitorando para manter essa tendência de economia.",
    type: "insight",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 5)),
    source: "analise-automatica",
  });

  // ===== EDUCAÇÃO =====
  chunks.push({
    id: "edu-001",
    text: "O que é CDI? O CDI (Certificado de Depósito Interbancário) é uma taxa de juros usada em operações entre bancos. É uma referência importante para investimentos de renda fixa como CDB e LCI. Geralmente, investimentos que pagam 100% do CDI são considerados seguros e líquidos.",
    type: "educacao",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 1)),
    source: "manual-investimentos",
  });

  chunks.push({
    id: "edu-002",
    text: "Como organizar finanças pessoais: 1) Liste todas as receitas e despesas, 2) Categorize os gastos (essenciais, supérfluos), 3) Defina metas de economia (ex: 20% da renda), 4) Use a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança/investimentos.",
    type: "educacao",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 1)),
    source: "manual-financas-pessoais",
  });

  chunks.push({
    id: "edu-003",
    text: "Dicas para pagar dívidas: 1) Priorize dívidas com maior taxa de juros (cartão de crédito), 2) Negocie com credores para reduzir juros, 3) Use método da bola de neve (pague a menor dívida primeiro para ganhar motivação) ou método da avalanche (pague a maior taxa primeiro para economizar juros).",
    type: "educacao",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 1)),
    source: "manual-financas-pessoais",
  });

  chunks.push({
    id: "edu-004",
    text: "Investimentos para iniciantes: Comece com opções de baixo risco como Tesouro Selic (liquidez diária) ou CDB de bancos grandes. Evite investimentos complexos até ter conhecimento. Diversifique gradualmente conforme aprende mais sobre o mercado financeiro.",
    type: "educacao",
    date: toISO8601(new Date(currentYear, currentMonth - 1, 1)),
    source: "manual-investimentos",
  });

  // ===== TRANSAÇÕES ANTIGAS (para testar filtros temporais) =====
  const twoMonthsAgo = lastMonth === 1 ? 12 : lastMonth - 1;
  const twoMonthsAgoYear = lastMonth === 1 ? lastMonthYear - 1 : lastMonthYear;

  chunks.push({
    id: "tx-007",
    text: "Gasto com supermercado: R$ 520,00 há dois meses. Valor mais alto devido a compras de estoque.",
    type: "transacional",
    date: toISO8601(new Date(twoMonthsAgoYear, twoMonthsAgo - 1, 7)),
    source: "extrato-bancario",
    amount: 520.0,
  });

  return chunks;
}

// Se executado diretamente, popula o database
if (import.meta.main) {
  seedTestData()
    .then(() => {
      console.log("✅ Seed concluído com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro ao fazer seed:", error);
      process.exit(1);
    });
}
