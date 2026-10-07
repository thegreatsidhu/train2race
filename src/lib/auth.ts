import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeRememberToken } from "@/lib/rememberToken";
import { consumeLimit } from "@/lib/usageLimit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberToken: { label: "Remember token", type: "text" },
      },
      async authorize(credentials) {
        // Silent restore path: a localStorage-backed token standing in for a session cookie that
        // didn't survive the native app being fully closed (see src/lib/rememberToken.ts for why).
        if (credentials?.rememberToken) {
          const userId = await consumeRememberToken(credentials.rememberToken as string);
          if (!userId) return null;
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, image: true, isBanned: true },
          });
          if (!user || user.isBanned) return null;
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        }

        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();

        // Server-side brute-force guard (the login page's 5-attempt counter is client-only):
        // 10 attempts per email per 15 minutes.
        if (!(await consumeLimit(`login:${email}`, 10, 15 * 60_000))) return null;

        // Case-insensitive so accounts created before emails were normalised still sign in.
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true, email: true, name: true, image: true, passwordHash: true, isBanned: true },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        if (user.isBanned) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        // Fetch role from DB on sign-in
        const dbUser = await prisma.user.findUnique({ where: { id: user.id as string }, select: { role: true } });
        token.role = dbUser?.role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as { id?: string; role?: string }).id = token.userId as string;
        (session.user as { id?: string; role?: string }).role = (token.role as string) ?? "user";
      }
      return session;
    },
  },
});
