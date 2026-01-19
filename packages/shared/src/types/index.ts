// Workspace and User types
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export interface Workspace {
  id: string;
  name: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  workspaceId: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date | null;
}

// Site types
export enum SiteStatus {
  NEW = 'NEW',
  CRAWLING = 'CRAWLING',
  READY = 'READY',
  ERROR = 'ERROR',
  PAUSED = 'PAUSED',
}

export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  respectRobots: boolean;
  sitemapOnly: boolean;
  concurrency: number;
  delayMs: number;
}

export interface Site {
  id: string;
  workspaceId: string;
  name: string;
  domain: string;
  baseUrl: string;
  siteKey: string;
  status: SiteStatus;
  crawlConfig: CrawlConfig;
  createdAt: Date;
  updatedAt: Date;
  lastCrawledAt: Date | null;
}

// Page and Chunk types
export enum PageStatus {
  NEW = 'NEW',
  FETCHED = 'FETCHED',
  EMBEDDED = 'EMBEDDED',
  ERROR = 'ERROR',
  SKIPPED = 'SKIPPED',
}

export interface Page {
  id: string;
  workspaceId: string;
  siteId: string;
  url: string;
  title: string | null;
  contentHash: string | null;
  status: PageStatus;
  httpStatus: number | null;
  mimeType: string | null;
  lastCrawledAt: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chunk {
  id: string;
  workspaceId: string;
  siteId: string;
  pageId: string;
  url: string;
  title: string | null;
  content: string;
  tokenCount: number;
  headingPath: string | null;
  createdAt: Date;
}

// Crawl Run types
export enum CrawlRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface CrawlRun {
  id: string;
  workspaceId: string;
  siteId: string;
  status: CrawlRunStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  pagesDiscovered: number;
  pagesFetched: number;
  pagesEmbedded: number;
  pagesErrored: number;
  errorSummary: string | null;
}

// Chat types
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export interface Citation {
  chunkId: string;
  url: string;
  title: string | null;
  snippet: string;
  score: number;
}

export interface Message {
  id: string;
  workspaceId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  siteId: string;
  visitorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

// Widget types
export interface WidgetTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface WidgetRateLimit {
  rpm: number;
  burst: number;
}

export interface WidgetConfig {
  id: string;
  workspaceId: string;
  siteId: string;
  theme: WidgetTheme;
  greeting: string;
  placeholder: string;
  brandName: string | null;
  allowedDomains: string[];
  rateLimit: WidgetRateLimit;
  createdAt: Date;
  updatedAt: Date;
}

// API Key types
export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

// Analytics types
export interface AnalyticsOverview {
  totalChats: number;
  totalMessages: number;
  averageMessagesPerChat: number;
  positiveRatings: number;
  negativeRatings: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  estimatedCost: number;
  chatsByDay: { date: string; count: number }[];
  topQuestions: { question: string; count: number }[];
}

// Feedback types
export interface Feedback {
  id: string;
  workspaceId: string;
  siteId: string;
  conversationId: string;
  messageId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

// Audit log types
export interface AuditLog {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

// Retrieval types
export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
  source: 'vector' | 'fts' | 'hybrid';
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  hasContext: boolean;
}

// Chat request/response types
export interface ChatRequest {
  siteId: string;
  conversationId?: string;
  message: string;
  visitorId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Citation[];
}

// Streaming event types
export interface StreamEvent {
  type: 'chunk' | 'citation' | 'done' | 'error' | 'start';
  data?: string | Citation | { error: string };
  messageId?: string;
  conversationId?: string;
  error?: string;
}

export type ChatStreamEvent = StreamEvent;

// Auth types
export interface JwtPayload {
  sub: string; // userId
  userId: string;
  workspaceId: string;
  role: UserRole | string;
  email: string;
  iat?: number; // issued at
  exp?: number; // expiration
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole | string;
    workspaceId: string;
    createdAt?: Date;
    [key: string]: any; // Allow additional properties
  };
}

// Permission types
export enum Permission {
  // Site permissions
  SITE_CREATE = 'SITE_CREATE',
  SITE_READ = 'SITE_READ',
  SITE_UPDATE = 'SITE_UPDATE',
  SITE_DELETE = 'SITE_DELETE',
  SITE_CRAWL = 'SITE_CRAWL',
  
  // User permissions
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  
  // API Key permissions
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_READ = 'API_KEY_READ',
  API_KEY_DELETE = 'API_KEY_DELETE',
  
  // Analytics permissions
  ANALYTICS_READ = 'ANALYTICS_READ',
  
  // Audit log permissions
  AUDIT_READ = 'AUDIT_READ',
  
  // Workspace permissions
  WORKSPACE_UPDATE = 'WORKSPACE_UPDATE',
  WORKSPACE_DELETE = 'WORKSPACE_DELETE',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    Permission.SITE_CREATE,
    Permission.SITE_READ,
    Permission.SITE_UPDATE,
    Permission.SITE_DELETE,
    Permission.SITE_CRAWL,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.API_KEY_CREATE,
    Permission.API_KEY_READ,
    Permission.API_KEY_DELETE,
    Permission.ANALYTICS_READ,
    Permission.AUDIT_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
  ],
  [UserRole.ADMIN]: [
    Permission.SITE_CREATE,
    Permission.SITE_READ,
    Permission.SITE_UPDATE,
    Permission.SITE_DELETE,
    Permission.SITE_CRAWL,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.API_KEY_CREATE,
    Permission.API_KEY_READ,
    Permission.API_KEY_DELETE,
    Permission.ANALYTICS_READ,
    Permission.AUDIT_READ,
  ],
  [UserRole.MEMBER]: [
    Permission.SITE_READ,
    Permission.SITE_UPDATE,
    Permission.SITE_CRAWL,
    Permission.USER_READ,
    Permission.API_KEY_READ,
    Permission.ANALYTICS_READ,
  ],
  [UserRole.VIEWER]: [
    Permission.SITE_READ,
    Permission.USER_READ,
    Permission.ANALYTICS_READ,
  ],
};

// Extended types
export interface ChunkWithScore extends Chunk {
  score: number;
  scoreType: string;
}

export interface CrawlProgress {
  runId?: string;
  status: CrawlRunStatus | string;
  pagesDiscovered: number;
  pagesFetched: number;
  pagesEmbedded: number;
  pagesErrored: number;
  percentComplete?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
  checks?: Record<string, ComponentHealth>;
  components?: Record<string, ComponentHealth>;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  latencyMs?: number;
  error?: string;
}

export interface WidgetPublicConfig {
  siteKey: string;
  theme: WidgetTheme;
  greeting: string;
  placeholder: string;
  brandName: string | null;
}
