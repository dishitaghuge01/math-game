import type { PlotNode } from './plotSkeleton.js';
import type { DecisionVector } from '@math-game/core-math';
import type { MemorySnippet } from '@math-game/memory-client';
import { buildNarrationPrompt, buildChoiceNarrationPrompt } from './promptTemplates.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function narrateNode(node: PlotNode, memory: MemorySnippet[], vector: DecisionVector, previousNarration: string | null = null): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable');
  }

  const prompt = buildNarrationPrompt(node, memory, vector, previousNarration);

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

  const responseText = String(content);
  return capSentences(responseText, 3);
}

function capSentences(text: string, maxSentences = 3): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export async function narrateChoice(node: PlotNode, archetype: string, vector: DecisionVector): Promise<{ label: string; description: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY environment variable');
  }

  const prompt = buildChoiceNarrationPrompt(node, archetype, vector);

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
    throw new Error('Unexpected Groq response shape for choice narration');
  }

  try {
    return JSON.parse(String(content)) as { label: string; description: string };
  } catch (parseErr) {
    throw new Error(`Failed to parse choice narration JSON: ${String(content)}`);
  }
}

export default narrateNode;
