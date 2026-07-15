import { it, describe, expect, vi, afterEach } from 'vitest';
import { createInitialVector } from '@math-game/core-math';
import { PlotNode } from './plotSkeleton.js';
import { narrateNode } from './llmClient.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('llmClient', () => {
  it('sends prompt containing node tokens and no-invent instruction', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const fakeNode: PlotNode = { id: '0-0', symbol: 'BETRAYAL', tokens: ['BETRAYAL', 'CONSEQUENCE'] };
    const stub = vi.fn().mockResolvedValue(new Response(JSON.stringify({ completion: 'ok' }), { status: 200 }));
    // @ts-ignore global fetch
    global.fetch = stub;

    const vector = createInitialVector();
    await narrateNode(fakeNode, [{ content: 'He stole the amulet.' }], vector as any);

    expect(stub).toHaveBeenCalled();
    const called = stub.mock.calls[0][1];
    const body = JSON.parse(called.body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain('BETRAYAL');
    expect(prompt).toContain('CONSEQUENCE');
    expect(prompt).toContain("Do NOT invent new plot beats");
  });
});
