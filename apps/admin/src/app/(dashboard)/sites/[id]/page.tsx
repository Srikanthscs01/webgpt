'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
} from '@webgpt/ui';
import {
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Settings,
  Globe,
  FileText,
  BarChart3,
  Code,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.id as string;

  const { data: site, isLoading } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const res = await api.get(`/sites/${siteId}`);
      return res.data.data;
    },
  });

  const { data: runs } = useQuery({
    queryKey: ['runs', siteId],
    queryFn: async () => {
      const res = await api.get(`/crawl/runs?siteId=${siteId}`);
      return res.data.data;
    },
  });

  const { data: widgetConfig } = useQuery({
    queryKey: ['widget-config', siteId],
    queryFn: async () => {
      const res = await api.get(`/widget/config/${siteId}`);
      return res.data.data;
    },
  });

  const startCrawl = useMutation({
    mutationFn: () => api.post(`/crawl/start`, { siteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['runs', siteId] });
    },
  });

  const cancelCrawl = useMutation({
    mutationFn: () => api.post(`/crawl/cancel`, { siteId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteId] });
      queryClient.invalidateQueries({ queryKey: ['runs', siteId] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'destructive' | 'secondary' | 'warning' | 'info'> = {
      READY: 'success',
      CRAWLING: 'info',
      ERROR: 'destructive',
      NEW: 'secondary',
      PAUSED: 'warning',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const embedCode = `<script>
  window.webGptConfig = {
    siteKey: '${site.siteKey}',
    apiUrl: '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}'
  };
</script>
<script src="${process.env.NEXT_PUBLIC_WIDGET_URL || 'http://localhost:5173'}/widget.js" async></script>`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/sites')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{site.name}</h1>
          <p className="text-muted-foreground">{site.baseUrl}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(site.status)}
          {site.status === 'CRAWLING' ? (
            <Button
              variant="destructive"
              onClick={() => cancelCrawl.mutate()}
              disabled={cancelCrawl.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              Cancel Crawl
            </Button>
          ) : (
            <Button onClick={() => startCrawl.mutate()} disabled={startCrawl.isPending}>
              <Play className="w-4 h-4 mr-2" />
              Start Crawl
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Globe className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="crawl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Crawl History
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="widget">
            <Code className="w-4 h-4 mr-2" />
            Widget
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{site._count?.pages || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{site._count?.chunks || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{site._count?.conversations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Crawled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg">
                  {site.lastCrawledAt
                    ? formatDistanceToNow(new Date(site.lastCrawledAt), { addSuffix: true })
                    : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Crawl Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Max Pages</Label>
                  <p>{site.crawlConfig?.maxPages || 1000}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Max Depth</Label>
                  <p>{site.crawlConfig?.maxDepth || 5}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Concurrency</Label>
                  <p>{site.crawlConfig?.concurrency || 5}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delay</Label>
                  <p>{site.crawlConfig?.delayMs || 200}ms</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Respect Robots.txt</Label>
                  <p>{site.crawlConfig?.respectRobots !== false ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sitemap Only</Label>
                  <p>{site.crawlConfig?.sitemapOnly ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crawl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crawl Runs</CardTitle>
              <CardDescription>History of all crawl operations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Discovered</TableHead>
                    <TableHead>Fetched</TableHead>
                    <TableHead>Embedded</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs?.runs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No crawl runs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs?.runs?.map((run: any) => (
                      <TableRow key={run.id}>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell>
                          {run.startedAt
                            ? formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {run.startedAt && run.finishedAt
                            ? `${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                            : run.status === 'RUNNING'
                            ? 'In progress...'
                            : '-'}
                        </TableCell>
                        <TableCell>{run.pagesDiscovered}</TableCell>
                        <TableCell>{run.pagesFetched}</TableCell>
                        <TableCell>{run.pagesEmbedded}</TableCell>
                        <TableCell>
                          {run.pagesErrored > 0 ? (
                            <Badge variant="destructive">{run.pagesErrored}</Badge>
                          ) : (
                            '0'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Overview</CardTitle>
              <CardDescription>
                View and manage indexed pages and chunks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push(`/content?siteId=${siteId}`)}>
                <FileText className="w-4 h-4 mr-2" />
                View All Content
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="widget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Add this code to your website to enable the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{embedCode}</code>
              </pre>
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(embedCode)}
              >
                Copy to Clipboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>Customize your chat widget appearance and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Greeting Message</Label>
                  <Input defaultValue={widgetConfig?.greeting || 'Hi! How can I help you today?'} />
                </div>
                <div>
                  <Label>Placeholder Text</Label>
                  <Input defaultValue={widgetConfig?.placeholder || 'Type your question...'} />
                </div>
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-16"
                      defaultValue={widgetConfig?.theme?.primaryColor || '#6366f1'}
                    />
                    <Input defaultValue={widgetConfig?.theme?.primaryColor || '#6366f1'} />
                  </div>
                </div>
                <div>
                  <Label>Position</Label>
                  <Input defaultValue={widgetConfig?.theme?.position || 'bottom-right'} />
                </div>
              </div>

              <div>
                <Label>Allowed Domains</Label>
                <Input
                  placeholder="example.com, www.example.com"
                  defaultValue={widgetConfig?.allowedDomains?.join(', ') || ''}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Comma-separated list of domains where the widget can be embedded
                </p>
              </div>

              <Button>Save Widget Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Site Settings</CardTitle>
              <CardDescription>Configure your site settings and crawl parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Site Name</Label>
                <Input defaultValue={site.name} />
              </div>
              <div>
                <Label>Base URL</Label>
                <Input defaultValue={site.baseUrl} disabled />
                <p className="text-sm text-muted-foreground mt-1">
                  Base URL cannot be changed after creation
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Max Pages</Label>
                  <Input type="number" defaultValue={site.crawlConfig?.maxPages || 1000} />
                </div>
                <div>
                  <Label>Max Depth</Label>
                  <Input type="number" defaultValue={site.crawlConfig?.maxDepth || 5} />
                </div>
                <div>
                  <Label>Concurrency</Label>
                  <Input type="number" defaultValue={site.crawlConfig?.concurrency || 5} />
                </div>
                <div>
                  <Label>Delay (ms)</Label>
                  <Input type="number" defaultValue={site.crawlConfig?.delayMs || 200} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={site.crawlConfig?.respectRobots !== false} />
                <Label>Respect robots.txt</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked={site.crawlConfig?.sitemapOnly === true} />
                <Label>Sitemap only (don't follow links)</Label>
              </div>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Re-index all content</p>
                  <p className="text-sm text-muted-foreground">
                    Re-embed all chunks with the current embedding model
                  </p>
                </div>
                <Button variant="outline">Re-index</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete all content</p>
                  <p className="text-sm text-muted-foreground">
                    Remove all pages and chunks (keep site configuration)
                  </p>
                </div>
                <Button variant="destructive">Delete Content</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete site</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this site and all its data
                  </p>
                </div>
                <Button variant="destructive">Delete Site</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}



