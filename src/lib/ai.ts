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

export async function brainstormTasksForProject(
   apiKey: string,
   project: ProjectData,
   braindump: string
): Promise<string[]> {
    const systemPrompt = `You are an AI assistant built into "Pathway", a project tracker.
The user has written a free-form braindump of their thoughts. Your job is to turn that into a clear, ordered list of actionable tasks.

Rules:
- Read the project title, existing tasks, and braindump together to understand the full picture.
- Generate tasks in a logical order (dependencies first, then follow-on work).
- If a piece of work is large, break it into subtasks — but keep tasks meaningful (roughly 15 min to 2 hrs each). Don't go absurdly granular.
- Assign realistic T / I / C values:
    T (Time):       1 = <15 min,  2 = ~30 min,  3 = ~1 hr,  4 = ~2 hr,  5 = half day+
    I (Importance): 1 = nice-to-have,  3 = should do,  5 = critical / blocking
    C (Complexity): 1 = trivial,  3 = moderate effort,  5 = hard / uncertain
- Return ONLY task lines in this exact format, nothing else:
  - [ ] \`[ T | I | C ]\` Task description`;

    const userMessage =
`Project: "${project.projectName}"

Existing tasks:
${project.content}

User braindump:
${braindump.trim()}`;

    const result = await generateAIResponse(apiKey, [{ role: "user", content: userMessage }], systemPrompt);
    return result.split("\n").filter((l: string) => l.trim().startsWith("- [ ]"));
}
