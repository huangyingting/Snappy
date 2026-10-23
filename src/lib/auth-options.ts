import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authenticateUser } from "./services/auth-service";
import { z } from "zod";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  pages: { signIn: "/auth/corporate", error: "/auth/corporate" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: {}, password: {}, expectedRole: {} },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(128),
          expectedRole: z.enum(["ADMIN", "CORPORATE", "VENDOR", "RECIPIENT"]),
        }).safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, expectedRole } = parsed.data;
        return authenticateUser(email, password, expectedRole);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && typeof token.role === "string" && typeof token.sessionVersion === "number") {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
};
