import type { PlotNode } from './plotSkeleton.js';
import type { DecisionVector } from '@math-game/core-math';
import type { MemorySnippet } from '@math-game/memory-client';
import { buildNarrationPrompt } from './promptTemplates.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function narrateNode(node: PlotNode, memory: MemorySnippet[], vector: DecisionVector): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable');
  }

  const prompt = buildNarrationPrompt(node, memory, vector);

  const body = {
    model: MODEL,
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq API error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  const content = (data as any).choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Unexpected Groq response shape');
  }
  return String(content);
}

export default narrateNode;
