import { z } from 'zod';

// Auth validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Workspace validators
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  plan: z.string().optional().default('free'),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// User validators
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Site validators
export const crawlConfigSchema = z.object({
  maxPages: z.number().int().min(1).max(100000).default(1000),
  maxDepth: z.number().int().min(1).max(20).default(5),
  includePatterns: z.array(z.string()).default([]),
  excludePatterns: z.array(z.string()).default([]),
  respectRobots: z.boolean().default(true),
  sitemapOnly: z.boolean().default(false),
  concurrency: z.number().int().min(1).max(20).default(5),
  delayMs: z.number().int().min(0).max(10000).default(200),
});

export const createSiteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  baseUrl: z.string().url('Invalid URL'),
  crawlConfig: crawlConfigSchema.optional(),
});

export const updateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  crawlConfig: crawlConfigSchema.optional(),
});

export type CrawlConfigInput = z.infer<typeof crawlConfigSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;

// API Key validators
export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  scopes: z.array(z.string()).default(['read']),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// Chat validators
export const chatMessageSchema = z.object({
  siteId: z.string().uuid('Invalid site ID'),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message is required').max(4000, 'Message too long'),
  visitorId: z.string().optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Widget config validators
export const widgetThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  borderRadius: z.number().int().min(0).max(24).default(8),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
});

export const widgetRateLimitSchema = z.object({
  rpm: z.number().int().min(1).max(1000).default(20),
  burst: z.number().int().min(1).max(100).default(5),
});

export const updateWidgetConfigSchema = z.object({
  theme: widgetThemeSchema.optional(),
  greeting: z.string().max(500).optional(),
  placeholder: z.string().max(200).optional(),
  brandName: z.string().max(100).optional(),
  allowedDomains: z.array(z.string()).optional(),
  rateLimit: widgetRateLimitSchema.optional(),
});

export type WidgetThemeInput = z.infer<typeof widgetThemeSchema>;
export type WidgetRateLimitInput = z.infer<typeof widgetRateLimitSchema>;
export type UpdateWidgetConfigInput = z.infer<typeof updateWidgetConfigSchema>;

// Feedback validators
export const createFeedbackSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  messageId: z.string().uuid('Invalid message ID'),
  rating: z.number().int().min(-1).max(1),
  comment: z.string().max(1000).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

// Pagination validators
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
