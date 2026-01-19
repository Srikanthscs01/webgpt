'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from '@webgpt/ui';
import { Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit');
      return res.data.data;
    },
  });

  const getActionBadge = (action: string) => {
    const colors: Record<string, 'destructive' | 'success' | 'warning' | 'info' | 'secondary'> = {
      DELETE: 'destructive',
      CREATE: 'success',
      UPDATE: 'warning',
      LOGIN: 'info',
      LOGOUT: 'secondary',
      CRAWL_START: 'info',
      CRAWL_CANCEL: 'warning',
      KEY_CREATE: 'success',
      KEY_REVOKE: 'destructive',
    };
    return <Badge variant={colors[action] || 'secondary'}>{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all security-relevant actions in your workspace
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No audit logs yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {log.targetType}
                      </span>
                      {log.targetId && (
                        <span className="ml-1 font-mono text-xs">
                          {log.targetId.slice(0, 8)}...
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.actor?.email || (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.meta ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {JSON.stringify(log.meta).slice(0, 50)}
                          {JSON.stringify(log.meta).length > 50 && '...'}
                        </code>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}



