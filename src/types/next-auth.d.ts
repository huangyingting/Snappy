import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    sessionVersion: number;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      sessionVersion: number;
    };
  }
}
