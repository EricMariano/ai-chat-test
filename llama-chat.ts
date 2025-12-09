import ollama from "ollama";

const response = await ollama.chat({
    model: "llama3.1:8b",
    messages: [
        { role: "system", content: "Você é um assistente de finanças pessoais em português, cordial e claro." },
        { role: "user", content: "" }
    ]
});

console.log(response.message.content);