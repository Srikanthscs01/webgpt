import { useState, useRef, useEffect } from 'react';
import { WidgetTheme, WidgetPublicConfig, Message, ChatResponse } from '../types';

interface ChatWindowProps {
  siteKey: string;
  apiUrl: string;
  config: WidgetPublicConfig;
  theme: WidgetTheme;
  onClose: () => void;
}

function getVisitorId(): string {
  const key = 'webgpt_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'v_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(key, id);
  }
  return id;
}

export function ChatWindow({ siteKey, apiUrl, config, theme, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visitorId = getVisitorId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const body: any = {
        siteKey,
        message: userMessage.content,
        visitorId,
      };
      
      // Only include conversationId if it exists
      if (conversationId) {
        body.conversationId = conversationId;
      }

      const res = await fetch(`${apiUrl}/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Chat API error:', res.status, errorData);
        
        if (res.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        const errorMessage = errorData.message || errorData.error || 'Failed to send message';
        throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      }

      const data: { data: ChatResponse } = await res.json();

      setConversationId(data.data.conversationId);

      const assistantMessage: Message = {
        id: data.data.messageId,
        role: 'assistant',
        content: data.data.content,
        citations: data.data.citations,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Show error message in chat
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: 380,
        height: 520,
        backgroundColor: theme.backgroundColor,
        borderRadius: theme.borderRadius,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: theme.primaryColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {config.brandName || 'Chat'}
          </h3>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
            Powered by WebGPT
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            opacity: 0.8,
            padding: 4,
          }}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              padding: 16,
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              color: theme.textColor,
              fontSize: 14,
            }}
          >
            {config.greeting}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                backgroundColor: msg.role === 'user' ? theme.primaryColor : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : theme.textColor,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {msg.content}
            </div>

            {msg.citations && msg.citations.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {msg.citations.slice(0, 3).map((citation, i) => (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: theme.primaryColor,
                      textDecoration: 'none',
                      padding: '4px 8px',
                      backgroundColor: '#e0e7ff',
                      borderRadius: 4,
                    }}
                  >
                    {citation.title || 'Source'}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9ca3af', animation: 'pulse 1.5s infinite' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9ca3af', animation: 'pulse 1.5s infinite 0.2s' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9ca3af', animation: 'pulse 1.5s infinite 0.4s' }} />
          </div>
        )}

        {error && (
          <div style={{ padding: 12, backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: 12,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={config.placeholder}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
          }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 16px',
            backgroundColor: theme.primaryColor,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}



