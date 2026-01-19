import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { withRetry } from '@webgpt/shared';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onDone?: (result: ChatCompletionResult) => void;
  onError?: (error: Error) => void;
}

@Injectable()
export class OpenAIService implements OnModuleInit {
  private readonly logger = new Logger(OpenAIService.name);
  private client: OpenAI;
  private embeddingModel: string;
  private chatModel: string;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(private configService: ConfigService) {
    this.embeddingModel = this.configService.get<string>(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    this.chatModel = this.configService.get<string>('OPENAI_CHAT_MODEL', 'gpt-5.2');
    this.maxRetries = this.configService.get<number>('OPENAI_MAX_RETRIES', 3);
    this.timeoutMs = this.configService.get<number>('OPENAI_TIMEOUT_MS', 60000);
  }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const organization = this.configService.get<string>('OPENAI_ORG_ID');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - OpenAI features will be disabled');
      return;
    }

    this.client = new OpenAI({
      apiKey,
      organization: organization || undefined,
      timeout: parseInt(String(this.timeoutMs)),
      maxRetries: 0, // We handle retries ourselves
    });

    this.logger.log('OpenAI client initialized');
  }

  /**
   * Generate embedding for a single text
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    return withRetry(
      async () => {
        const response = await this.client.embeddings.create({
          model: this.embeddingModel,
          input: text,
          encoding_format: 'float',
        });

        const data = response.data[0];
        if (!data) {
          throw new Error('No embedding returned');
        }

        return {
          embedding: data.embedding,
          tokenCount: response.usage?.total_tokens || 0,
        };
      },
      { maxRetries: this.maxRetries, delayMs: 1000 },
    );
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async createEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    if (texts.length === 0) return [];

    // OpenAI supports up to 2048 inputs per batch
    const batchSize = 100;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await withRetry(
        async () => {
          return this.client.embeddings.create({
            model: this.embeddingModel,
            input: batch,
            encoding_format: 'float',
          });
        },
        { maxRetries: this.maxRetries, delayMs: 1000 },
      );

      const tokensPerItem = Math.ceil((response.usage?.total_tokens || 0) / batch.length);

      for (const data of response.data) {
        results.push({
          embedding: data.embedding,
          tokenCount: tokensPerItem,
        });
      }
    }

    return results;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    },
  ): Promise<ChatCompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    return withRetry(
      async () => {
        const response = await this.client.chat.completions.create({
          model: options?.model || this.chatModel,
          messages,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.7,
        });

        const choice = response.choices[0];
        if (!choice?.message?.content) {
          throw new Error('No response content');
        }

        return {
          content: choice.message.content,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        };
      },
      { maxRetries: this.maxRetries, delayMs: 1000 },
    );
  }

  /**
   * Create a streaming chat completion
   */
  async createChatCompletionStream(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    },
  ): Promise<void> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: options?.model || this.chatModel,
        messages,
        max_tokens: options?.maxTokens || 1024,
        temperature: options?.temperature ?? 0.7,
        stream: true,
        stream_options: { include_usage: true },
      });

      let fullContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          callbacks.onToken?.(delta);
        }

        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      callbacks.onDone?.({
        content: fullContent,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      });
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if OpenAI is configured and available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Test the connection to OpenAI
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}



