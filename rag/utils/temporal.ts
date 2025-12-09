/**
 * Utilitários para manipulação de datas e conversão de expressões temporais
 * em formato ISO 8601 (YYYY-MM-DD) para uso no LanceDB
 */

/**
 * Converte expressões temporais em português para datas ISO 8601
 * 
 * Exemplos:
 * - "mês passado" → { start: "2024-03-01", end: "2024-03-31" }
 * - "carnaval" → { start: "2024-02-10", end: "2024-02-13" } (aproximado)
 * - "últimos 30 dias" → { start: "2024-03-15", end: "2024-04-14" }
 */
export function parseTemporalExpression(
  expression: string,
  currentDate: Date
): { start: string | null; end: string | null } {
  const lower = expression.toLowerCase().trim();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const day = currentDate.getDate();

  // Mês passado
  if (lower.includes("mês passado") || lower.includes("mes passado") || lower.includes("mês anterior")) {
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastMonthYear = month === 1 ? year - 1 : year;
    const lastDay = new Date(lastMonthYear, lastMonth, 0).getDate();
    
    return {
      start: `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`,
      end: `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  }

  // Este mês
  if (lower.includes("este mês") || lower.includes("este mes") || lower.includes("mês atual")) {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${year}-${String(month).padStart(2, '0')}-01`,
      end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    };
  }

  // Últimos N dias
  const daysMatch = lower.match(/últimos?\s+(\d+)\s+dia/i) || lower.match(/ultimos?\s+(\d+)\s+dia/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1] || "30", 10);
    const end = new Date(currentDate);
    const start = new Date(currentDate);
    start.setDate(start.getDate() - days);
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  // Última semana
  if (lower.includes("última semana") || lower.includes("ultima semana")) {
    const end = new Date(currentDate);
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 7);
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  // Nomes de meses (ex: "abril", "março")
  const monthNames: Record<string, number> = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3,
    "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9,
    "outubro": 10, "novembro": 11, "dezembro": 12
  };
  
  for (const [monthName, monthNum] of Object.entries(monthNames)) {
    if (lower.includes(monthName)) {
      const lastDay = new Date(year, monthNum, 0).getDate();
      return {
        start: `${year}-${String(monthNum).padStart(2, '0')}-01`,
        end: `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      };
    }
  }

  // Carnaval (aproximado - geralmente em fevereiro/março)
  if (lower.includes("carnaval")) {
    // Simplificação: assume fevereiro do ano atual
    return {
      start: `${year}-02-10`,
      end: `${year}-02-13`
    };
  }

  // Se não conseguir parsear, retorna null
  return { start: null, end: null };
}

/**
 * Valida se uma string está no formato ISO 8601 (YYYY-MM-DD)
 */
export function isValidISO8601Date(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Formata uma data para ISO 8601 (YYYY-MM-DD)
 */
export function toISO8601(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Obtém o nome do mês em português
 */
export function getMonthName(monthNumber: number): string {
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  return months[monthNumber - 1] || "";
}
