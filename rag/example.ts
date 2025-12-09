/**
 * Exemplo de uso do sistema RAG
 * 
 * Demonstra como usar o chat com RAG para fazer perguntas
 * sobre finanças pessoais com suporte a filtros temporais
 */

import { chat, chatWithMetadata } from "./rag-chat.ts";
import { seedTestData } from "./seed-test-data.ts";

async function main() {
  console.log("=== Exemplo de Uso do Sistema RAG ===\n");

  // Primeiro, popula o database com dados de teste (se ainda não foi feito)
  try {
    console.log("Verificando se o database precisa ser populado...");
    await seedTestData();
  } catch (error) {
    console.log("Database já populado ou erro ao popular (continuando...)\n");
  }

  // Exemplos de queries
  const testQueries = [
    "Quanto gastei mês passado?",
    "Gastos no supermercado este mês",
    "Resumo da minha saúde financeira",
    "Como posso organizar minhas finanças?",
    "Como posso investir meu dinheiro?",
    "Como posso lavar dinheiro?",
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(50));

    try {
      // Versão simples (apenas resposta)
      const response = await chat(query);
      console.log(`\n💬 Resposta: ${response}`);

      // Versão com metadados (descomente para ver detalhes)
      // const result = await chatWithMetadata(query);
      // console.log(`\n📊 Metadados:`);
      // console.log(`   - Tipo: ${result.metadata.queryType}`);
      // console.log(`   - Chunks encontrados: ${result.metadata.chunksFound}`);
      // console.log(`   - Range de caracteres: ${result.metadata.characterRange.min}-${result.metadata.characterRange.max}`);
      // if (result.metadata.chunksUsed.length > 0) {
      //   console.log(`   - Chunks usados:`);
      //   result.metadata.chunksUsed.forEach((chunk, i) => {
      //     console.log(`     ${i + 1}. [${chunk.type}] ${chunk.date}: ${chunk.text.substring(0, 50)}...`);
      //   });
      // }
    } catch (error) {
      console.error(`❌ Erro ao processar query:`, error);
    }
  }

  console.log("\n✅ Exemplos concluídos!");
}

// Executa se chamado diretamente
if (import.meta.main) {
  main().catch(console.error);
}
