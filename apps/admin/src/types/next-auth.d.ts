import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      workspaceId: string;
    } & DefaultSession['user'];
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
    accessToken: string;
  }
}



