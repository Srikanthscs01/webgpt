'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@webgpt/ui';
import { MessageSquare, Users, ThumbsUp, Zap } from 'lucide-react';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedSite, setSelectedSite] = useState<string>('all');

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get('/sites');
      return res.data.data;
    },
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', range, selectedSite],
    queryFn: async () => {
      const params = new URLSearchParams({ range });
      if (selectedSite !== 'all') {
        params.append('siteId', selectedSite);
      }
      const res = await api.get(`/analytics/overview?${params}`);
      return res.data.data;
    },
  });

  const stats = [
    {
      name: 'Total Conversations',
      value: analytics?.totalChats || 0,
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      name: 'Unique Visitors',
      value: analytics?.uniqueVisitors || 0,
      icon: Users,
      color: 'text-green-500',
    },
    {
      name: 'Feedback Score',
      value: analytics?.feedbackScore?.toFixed(1) || 'N/A',
      icon: ThumbsUp,
      color: 'text-purple-500',
    },
    {
      name: 'Tokens Used',
      value: analytics?.tokenUsage?.totalTokens?.toLocaleString() || 0,
      icon: Zap,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Insights into your chatbot performance
          </p>
        </div>

        <div className="flex gap-4">
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites?.map((site: any) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="h-64">
                <div className="space-y-2">
                  {analytics?.chatsOverTime?.slice(-14).map((day: any) => (
                    <div key={day.date} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">
                        {day.date}
                      </span>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (day.count /
                                Math.max(
                                  ...analytics.chatsOverTime.map((d: any) => d.count),
                                  1
                                )) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8">{day.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Questions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : analytics?.topQuestions?.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No questions yet
              </div>
            ) : (
              <div className="space-y-4">
                {analytics?.topQuestions?.slice(0, 10).map((q: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-6">
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">{q.question}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.count} times
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Token Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage & Cost</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Prompt Tokens</p>
                <p className="text-xl font-bold">
                  {analytics?.tokenUsage?.promptTokens?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Tokens</p>
                <p className="text-xl font-bold">
                  {analytics?.tokenUsage?.completionTokens?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-xl font-bold">
                  {analytics?.tokenUsage?.totalTokens?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-bold">
                  ${analytics?.tokenUsage?.estimatedCost?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



