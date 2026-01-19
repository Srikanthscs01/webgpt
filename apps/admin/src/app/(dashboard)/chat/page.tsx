'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  Badge,
} from '@webgpt/ui';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ url: string; title: string | null; snippet: string }>;
}

export default function ChatPage() {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get('/sites');
      return res.data.data;
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post('/chat', {
        siteId: selectedSite,
        message,
        conversationId,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: 'assistant',
          content: data.content,
          citations: data.citations,
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || !selectedSite) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    sendMessage.mutate(input.trim());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat Testing</h1>
          <p className="text-muted-foreground mt-1">
            Test your chatbot with indexed content
          </p>
        </div>
        <Button variant="outline" onClick={handleNewConversation}>
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-4">
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a site to test" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites?.map((site: any) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {selectedSite
                      ? 'Start a conversation by typing a message'
                      : 'Select a site to start testing'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs opacity-70 mb-1">Sources:</p>
                              <div className="flex flex-wrap gap-1">
                                {msg.citations.map((c, i) => (
                                  <a
                                    key={i}
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline"
                                  >
                                    [{i + 1}] {c.title || c.url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                    {sendMessage.isPending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!selectedSite || sendMessage.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!selectedSite || !input.trim() || sendMessage.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Try asking questions that your indexed content should be able to answer:
              </p>
              <ul className="text-sm space-y-2">
                <li>• "How do I get started?"</li>
                <li>• "What features are available?"</li>
                <li>• "How do I configure X?"</li>
                <li>• "What are the pricing options?"</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                The chatbot should respond based on your indexed content and provide
                citations to source pages.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



