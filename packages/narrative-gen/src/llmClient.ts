import type { PlotNode } from './plotSkeleton.js';
import type { DecisionVector } from '@math-game/core-math';
import type { MemorySnippet } from './promptTemplates.js';
import { buildNarrationPrompt } from './promptTemplates.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function narrateNode(node: PlotNode, memory: MemorySnippet[], vector: DecisionVector): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY environment variable');
  }

  const prompt = buildNarrationPrompt(node, memory, vector);

  const body = {
    model: 'claude-sonnet-4-6',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json().catch(() => ({}));
  // Try common response shapes
  const completion = (data as any).completion ?? (data as any).output?.[0]?.content?.text ?? (data as any).text ?? '';
  return String(completion);
}

export default narrateNode;
