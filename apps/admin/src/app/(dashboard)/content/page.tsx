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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from '@webgpt/ui';
import { FileText, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function ContentPage() {
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: sites } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await api.get('/sites');
      return res.data.data;
    },
  });

  const { data: pages, isLoading } = useQuery({
    queryKey: ['pages', selectedSite, statusFilter],
    queryFn: async () => {
      if (!selectedSite) return { pages: [], total: 0 };
      const params = new URLSearchParams({ siteId: selectedSite });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const res = await api.get(`/content/pages?${params}`);
      return res.data.data;
    },
    enabled: !!selectedSite,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'info' | 'destructive' | 'secondary' | 'warning'> = {
      EMBEDDED: 'success',
      FETCHED: 'info',
      ERROR: 'destructive',
      NEW: 'secondary',
      SKIPPED: 'warning',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content</h1>
        <p className="text-muted-foreground mt-1">
          Browse and manage indexed pages and chunks
        </p>
      </div>

      <div className="flex gap-4">
        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a site" />
          </SelectTrigger>
          <SelectContent>
            {sites?.map((site: any) => (
              <SelectItem key={site.id} value={site.id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="EMBEDDED">Embedded</SelectItem>
            <SelectItem value="FETCHED">Fetched</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="SKIPPED">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedSite ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a site to view its indexed content
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Pages {pages?.total ? `(${pages.total})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Last Crawled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : pages?.pages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No pages found
                    </TableCell>
                  </TableRow>
                ) : (
                  pages?.pages?.map((page: any) => (
                    <TableRow key={page.id}>
                      <TableCell className="max-w-[300px] truncate">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:underline"
                        >
                          <span className="truncate">{page.url}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {page.title || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(page.status)}</TableCell>
                      <TableCell>
                        {page.httpStatus ? (
                          <Badge
                            variant={
                              page.httpStatus >= 200 && page.httpStatus < 300
                                ? 'success'
                                : page.httpStatus >= 400
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {page.httpStatus}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {page.lastCrawledAt
                          ? formatDistanceToNow(new Date(page.lastCrawledAt), {
                              addSuffix: true,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



