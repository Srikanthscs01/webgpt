'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@webgpt/ui';
import { Globe, MessageSquare, FileText, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { data: workspace } = useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const res = await api.get('/workspaces/current');
      return res.data.data;
    },
  });

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get('/sites');
      return res.data.data;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', '7d'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview?range=7d');
      return res.data.data;
    },
  });

  const stats = [
    {
      name: 'Total Sites',
      value: workspace?.usage?.sites || 0,
      icon: Globe,
      color: 'text-blue-500',
    },
    {
      name: 'Total Conversations',
      value: workspace?.usage?.conversations || 0,
      icon: MessageSquare,
      color: 'text-green-500',
    },
    {
      name: 'Indexed Pages',
      value: workspace?.usage?.pages || 0,
      icon: FileText,
      color: 'text-purple-500',
    },
    {
      name: 'Tokens Used',
      value: workspace?.usage?.tokensUsed?.toLocaleString() || 0,
      icon: Zap,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your WebGPT workspace
        </p>
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
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Sites</CardTitle>
          </CardHeader>
          <CardContent>
            {sites?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No sites yet. Create your first site to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {sites?.slice(0, 5).map((site: any) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-muted-foreground">{site.domain}</p>
                    </div>
                    <Badge
                      variant={
                        site.status === 'READY'
                          ? 'success'
                          : site.status === 'CRAWLING'
                          ? 'info'
                          : site.status === 'ERROR'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {site.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.chatsOverTime?.slice(-7).map((day: any) => (
              <div
                key={day.date}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-sm text-muted-foreground">{day.date}</span>
                <span className="font-medium">{day.count} chats</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



