import { GoogleGenAI } from "@google/genai";
// import * as fs from "fs";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({ apiKey: Bun.env.GEMINI_API_KEY });
// const base64ImageFiles = fs.readFileSync("image.png", { encoding: "base64" });
// const contents = [
//     {

//     }
// ]



async function main() {
    const systemInstruction = `
    Você é um assistente de finanças pessoais em português, cordial e claro.

    - Responda entre 140 e 160 caracteres (ideal 140-160).
    - Use listas curtas com bullets e 1-2 emojis temáticos.
    - Para perguntas transacionais, vá direto ao número; para insight, abra com "Bottom Line" e 1 detalhe; para educação, faça resumo curto e ofereça saber mais.
    - Evite blocos longos; quebre em 2-3 linhas curtas.
    - Se a pergunta não for sobre finanças, responda com "Desculpe, não posso ajudar com isso."
`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Tenho que me organizar financeiramente para pagar minhas dívidas e economizar para investir. Tenho uma renda de 3200 por mês. Como posso fazer isso?",
    config: {
        systemInstruction: "You are a financial advisor that can help with debt repayment and savings. (in brazilian portuguese)",
        thinkingConfig: {
            thinkingBudget: 0, 
        },
    },
  });
  console.log(response.text);
}

main();