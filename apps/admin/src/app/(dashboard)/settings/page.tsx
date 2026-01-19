'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
} from '@webgpt/ui';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace'],
    queryFn: async () => {
      const res = await api.get('/workspaces/current');
      return res.data.data;
    },
  });

  const updateWorkspace = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.patch('/workspaces/current', { name });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>
              Basic information about your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 max-w-md">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <div className="flex gap-2">
                  <Input defaultValue={workspace?.name} id="workspace-name" />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('workspace-name') as HTMLInputElement;
                      updateWorkspace.mutate(input.value);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plan</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{workspace?.plan}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Workspace ID</Label>
                <Input value={workspace?.id} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Summary</CardTitle>
            <CardDescription>
              Current usage statistics for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{workspace?.usage?.sites || 0}</p>
                <p className="text-sm text-muted-foreground">Sites</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{workspace?.usage?.pages || 0}</p>
                <p className="text-sm text-muted-foreground">Pages</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{workspace?.usage?.chunks || 0}</p>
                <p className="text-sm text-muted-foreground">Chunks</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">
                  {(workspace?.usage?.tokensUsed || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Tokens Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Destructive actions for your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <h4 className="font-medium text-destructive">Delete Workspace</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Once you delete a workspace, there is no going back. Please be certain.
              </p>
              <Button variant="destructive" disabled>
                Delete Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



