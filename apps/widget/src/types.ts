export interface WidgetTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  position: 'bottom-right' | 'bottom-left';
  offsetX: number;
  offsetY: number;
}

export interface WidgetPublicConfig {
  siteKey: string;
  theme: WidgetTheme;
  greeting: string;
  placeholder: string;
  brandName: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: Date;
}

export interface Citation {
  chunkId: string;
  url: string;
  title: string | null;
  snippet: string;
  score: number;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  citations: Citation[];
}



