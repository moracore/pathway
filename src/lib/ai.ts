import { type ProjectData } from "./parser";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// We default to a cheap/fast model on OpenRouter, but you could adjust.
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export async function generateAIResponse(
    apiKey: string,
    messages: ChatMessage[],
    systemPrompt?: string
) {
    if (!apiKey) throw new Error("No API key provided. Please set one in Settings.");

    const payloadMessages = [];
    if (systemPrompt) {
        payloadMessages.push({ role: "system", content: systemPrompt });
    }
    payloadMessages.push(...messages);

    // Assume if key starts with sk-or it's openrouter, otherwise assume it might be gemini directly?
    // For simplicity of this prompt, we'll route everything to OpenRouter structure.
    const isGeminiDirect = apiKey.startsWith("AIza"); 

    if (isGeminiDirect) {
        // Simple direct Gemini API call fallback if user puts in Google Studio key instead of OpenRouter
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const geminiContents = payloadMessages.map(m => ({
            role: m.role === "assistant" ? "model" : (m.role === "system" ? "user" : m.role),
            parts: [{ text: m.content }]
        }));

        const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: geminiContents })
        });

        if (!res.ok) throw new Error("Failed to fetch from Gemini API");
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
        // OpenRouter route
        const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Pathway",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: payloadMessages
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`OpenRouter API error: ${err.error?.message || res.statusText}`);
        }
        
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
    }
}

export async function generateMilestonesForGoal(
  apiKey: string,
  goalName: string,
  existingMilestones: string[]
): Promise<string[]> {
  const systemPrompt = `You are an AI assistant in the "Pathway" goal tracker.
Your job is to suggest milestones that break down a high-level goal into concrete, achievable checkpoints.
Return ONLY a plain list of milestone names, one per line, with no numbering, no bullet points, and no extra text.
Each milestone should be a short, clear achievement (3-8 words). Do not include deadlines or project names.`;

  const existing = existingMilestones.length > 0
    ? `Existing milestones:\n${existingMilestones.map(m => `- ${m}`).join("\n")}\n\nSuggest 3-5 additional milestones that complement the existing ones.`
    : "Suggest 3-5 milestones to break down this goal.";

  const userMessage = `Goal: "${goalName}"\n\n${existing}`;
  const result = await generateAIResponse(apiKey, [{ role: "user", content: userMessage }], systemPrompt);
  return result.split("\n").map((l: string) => l.replace(/^[-*•]\s*/, "").trim()).filter((l: string) => l.length > 0);
}

export async function generateTasksForProject(
   apiKey: string,
   project: ProjectData
): Promise<string[]> {
    const memoryContext = project.content;
    
    const systemPrompt = `You are an AI assistant built right into the "Pathway" project tracker. 
Your job is to look at the current markdown project state below, and generate 3 to 5 highly actionable, granular, next-step tasks.
Return ONLY a markdown list of tasks using the exact format: \`- [ ] \`[ Complexity | Time ]\` Task Description\`.
Complexity and Time should be numbers between 1 and 5. Time 1 = < 10 mins, Time 5 = > 2 hours.
Make sure the tasks make logical sense based on what is already done and what the project is about.
DO NOT return any other text or conversational filler, ONLY the bulleted markdown list.`;

    const userMessage = `Here is my project file context:\n\n` + memoryContext;

    const result = await generateAIResponse(apiKey, [{ role: "user", content: userMessage }], systemPrompt);
    
    // Split the result by lines and keep only actual task lines
    const lines = result.split("\n").filter((l: string) => l.trim().startsWith("- [ ]"));
    return lines;
}
