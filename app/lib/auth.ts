import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from 'next-auth/providers/google';
import { compareSync } from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { ensureSophtronCustomer } from "@/app/lib/sophtron/create-customer";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = compareSync(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { googleId: account.providerAccountId },
              { email: user.email! },
            ],
          },
        });

        if (existingUser) {
          if (!existingUser.googleId) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: account.providerAccountId,
                image: user.image,
              },
            });
          }

          if (!existingUser.sophtronCustomerId) {
            ensureSophtronCustomer(existingUser.id);
          }
        } else {
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              authProvider: "google",
            }
          });
          // Create Sophtron customer for new Google user
          ensureSophtronCustomer(newUser.id);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (dbUser) token.id = dbUser.id;
      } else if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
