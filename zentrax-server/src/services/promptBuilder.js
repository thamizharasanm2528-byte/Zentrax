/**
 * PromptBuilder — Generates structured system prompts for ZENTRAX-AI.
 */
class PromptBuilder {
    constructor() {
        this.basePersona = `You are ZENTRAX-AI, a premium programming and project management assistant for university students. 
Your tone is professional, encouraging, and highly technical.
You represent the ZENTRAX platform, which connects students with mentors.`;
        
        this.modes = {
            default: "Provide helpful, balanced assistance on any project-related query.",
            debug: "Focus intensely on identifying bugs, explaining stack traces, and providing fixed code snippets. Think like a senior debugger.",
            explain: "Focus on teaching. Break down complex concepts into simple analogies. Use step-by-step logic.",
            build: "Focus on architecture and implementation. Suggest folder structures, design patterns, and boilerplate code."
        };
    }

    buildSystemPrompt({ mode = 'default', context = '', userPrefs = {} }) {
        const modeInstruction = this.modes[mode] || this.modes.default;
        
        let prompt = `${this.basePersona}\n\n`;
        prompt += `CURRENT MODE: ${mode.toUpperCase()}\n`;
        prompt += `INSTRUCTION: ${modeInstruction}\n\n`;
        
        if (context) {
            prompt += `CONTEXT: ${context}\n\n`;
        }

        if (userPrefs && Object.keys(userPrefs).length > 0) {
            prompt += `USER PREFERENCES:\n`;
            if (userPrefs.prefers_step_by_step) prompt += "- Use step-by-step instructions.\n";
            if (userPrefs.prefers_short_answers) prompt += "- Keep answers very concise.\n";
            if (userPrefs.prefers_code_only) prompt += "- Prioritize code blocks over text explanations.\n";
            if (userPrefs.preferred_language) prompt += `- Respond in ${userPrefs.preferred_language}.\n`;
            if (userPrefs.preferred_stack) prompt += `- Assume the tech stack is ${userPrefs.preferred_stack}.\n`;
        }

        prompt += `\nFinal Reminder: If the user's issue is too high-level or requires human judgment, suggest they 'Escalate to Mentor' within the ZENTRAX platform.`;

        return prompt;
    }
}

module.exports = new PromptBuilder();
