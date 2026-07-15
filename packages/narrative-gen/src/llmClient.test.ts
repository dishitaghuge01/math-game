import { it, describe, expect, vi, afterEach } from 'vitest';
import { createInitialVector } from '@math-game/core-math';
import { PlotNode } from './plotSkeleton.js';
import { narrateNode } from './llmClient.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GROQ_API_KEY;
});

describe('llmClient', () => {
  it('sends prompt containing node tokens and no-invent instruction to Groq', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const fakeNode: PlotNode = { id: '0-0', symbol: 'BETRAYAL', tokens: ['BETRAYAL', 'CONSEQUENCE'] };
    const fakeResponse = { choices: [{ message: { content: 'Narration text' } }] };
    const stub = vi.fn().mockResolvedValue(new Response(JSON.stringify(fakeResponse), { status: 200 }));
    // @ts-ignore global fetch
    global.fetch = stub;

    const vector = createInitialVector();
    await narrateNode(fakeNode, [{ content: 'He stole the amulet.', documentId: 'doc1', metadata: {}, createdAt: 'now' } as any], vector as any);

    expect(stub).toHaveBeenCalled();
    const calledUrl = stub.mock.calls[0][0];
    const called = stub.mock.calls[0][1];
    expect(calledUrl).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(called.headers['Authorization']).toBe(`Bearer ${process.env.GROQ_API_KEY}`);
    const body = JSON.parse(called.body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain('BETRAYAL');
    expect(prompt).toContain('CONSEQUENCE');
    expect(prompt).toContain("Do NOT invent new plot beats");
  });
});
