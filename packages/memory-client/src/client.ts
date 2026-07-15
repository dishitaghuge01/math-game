import type { GameMemory, MemorySnippet } from './schemas.js';

export class SupermemoryClientError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
    this.name = 'SupermemoryClientError';
  }
}

export interface SupermemoryClientConfig {
  baseUrl?: string;
  apiKey: string;
  /** Escape hatch: forces ALL calls to use one shared containerTag instead of per-user isolation. Only pass this if you explicitly want cross-user sharing. */
  forceSharedContainerTag?: string;
}

export class SupermemoryClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly forceSharedContainerTag?: string;

  constructor(config: SupermemoryClientConfig) {
    const rawBaseUrl = (config.baseUrl ?? process.env.SUPERMEMORY_BASE_URL ?? 'http://localhost:6767').trim();
    this.baseUrl = rawBaseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey.trim();
    this.forceSharedContainerTag = config.forceSharedContainerTag?.trim();
  }

  async addMemory(userId: string, memory: GameMemory): Promise<{ id: string; status: string }> {
    const content = this.serializeMemory(memory);
    const metadata = this.buildMetadata(memory);
    const customId = this.buildCustomId(userId, memory);
    const containerTag = this.getContainerTag(userId);

    const response = await fetch(`${this.baseUrl}/v3/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        containerTag,
        metadata,
        customId,
      }),
    });

    if (!response.ok) {
      throw await this.toError(response, 'Failed to add memory');
    }

    const body = (await response.json()) as { id?: string; status?: string };
    return {
      id: body.id ?? customId,
      status: body.status ?? 'queued',
    };
  }

  async search(userId: string, query: string, k = 5): Promise<MemorySnippet[]> {
    const containerTag = this.getContainerTag(userId);
    const response = await fetch(`${this.baseUrl}/v3/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        containerTag,
        limit: k,
      }),
    });

    if (!response.ok) {
      throw await this.toError(response, 'Failed to search memories');
    }

    const body = (await response.json()) as {
      results?: Array<{
        documentId: string;
        score?: number;
        metadata?: Record<string, string | number | boolean>;
        createdAt?: string;
        chunks?: Array<{ content: string; score?: number }>;
      }>;
    };

    const results = body.results ?? [];

    return results.flatMap((result) => {
      const chunks = result.chunks ?? [];
      return chunks.map((chunk) => ({
        content: chunk.content,
        score: chunk.score ?? result.score ?? 0,
        documentId: result.documentId,
        metadata: result.metadata ?? {},
        createdAt: result.createdAt ?? '',
      }));
    });
  }

  private serializeMemory(memory: GameMemory): string {
    switch (memory.type) {
      case 'decision':
        return `Player chose ${memory.choiceLabel} at narrative node ${memory.narrativeNodeId}, shifting morality by ${memory.vectorSnapshot.morality.toFixed(2)} in session ${memory.sessionId}.`;
      case 'npc_relationship':
        return `NPC ${memory.npcName} now has relationship score ${memory.relationshipScore.toFixed(2)} following ${memory.lastInteractionSummary}.`;
      case 'plot_thread':
        return `Plot thread ${memory.title} is ${memory.status} with summary: ${memory.summary}.`;
      default: {
        const _exhaustiveCheck: never = memory;
        return _exhaustiveCheck;
      }
    }
  }

  private buildMetadata(memory: GameMemory): Record<string, string | number | boolean> {
    switch (memory.type) {
      case 'decision':
        return {
          type: memory.type,
          sessionId: memory.sessionId,
          timestamp: memory.timestamp,
          choiceId: memory.choiceId,
          narrativeNodeId: memory.narrativeNodeId,
        };
      case 'npc_relationship':
        return {
          type: memory.type,
          sessionId: memory.sessionId,
          timestamp: memory.timestamp,
          npcId: memory.npcId,
          relationshipScore: memory.relationshipScore,
        };
      case 'plot_thread':
        return {
          type: memory.type,
          sessionId: memory.sessionId,
          timestamp: memory.timestamp,
          threadId: memory.threadId,
          status: memory.status,
        };
      default: {
        const _exhaustiveCheck: never = memory;
        return { type: _exhaustiveCheck as unknown as string };
      }
    }
  }

  private buildCustomId(userId: string, memory: GameMemory): string {
    const dedupeKey = (() => {
      switch (memory.type) {
        case 'decision':
          return `${memory.choiceId}${memory.narrativeNodeId}`;
        case 'npc_relationship':
          return `${memory.npcId}${memory.timestamp}`;
        case 'plot_thread':
          return memory.threadId;
        default: {
          const _exhaustiveCheck: never = memory;
          return _exhaustiveCheck;
        }
      }
    })();

    const baseId = `${memory.type}:${userId}:${memory.sessionId}:${dedupeKey}`;
    if (baseId.length <= 100) {
      return baseId;
    }

    return `${baseId.slice(0, 92)}-${this.hashString(baseId)}`;
  }

  private hashString(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }

  private getContainerTag(userId: string): string {
    return this.forceSharedContainerTag ?? `user_${this.sanitize(userId)}`;
  }

  private sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  private async toError(response: Response, fallbackMessage: string): Promise<SupermemoryClientError> {
    let body: unknown;
    try {
      body = await response.text();
      try {
        body = JSON.parse(body as string);
      } catch {
        // keep the raw text if it is not valid JSON
      }
    } catch {
      body = undefined;
    }

    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    return new SupermemoryClientError(`${fallbackMessage} (${response.status}): ${detail ?? response.statusText}`, response.status, body);
  }
}
