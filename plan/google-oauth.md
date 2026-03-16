# Google OAuth Login — Implementation Plan

## 1. Google Cloud Setup (Prerequisites)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services > OAuth consent screen**.
   - Choose "External" user type.
   - Fill in app name ("Money Tracker"), support email, and authorized domains.
   - Add scopes: `openid`, `email`, `profile`.
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs:
     - Production: `https://<your-domain>/api/auth/callback/google`
     - Development: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret**.
5. Add two new environment variables:
   ```
   AUTH_GOOGLE_ID=<client-id>
   AUTH_GOOGLE_SECRET=<client-secret>
   ```

---

## 2. Database Schema Changes

The current `user` table requires `passwordHash` (non-nullable). Google OAuth users won't have a password.

### Changes to `prisma/schema.prisma` — `User` model

```diff
 model User {
   id                 String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   email              String        @unique @db.VarChar(255)
-  passwordHash       String        @map("password_hash") @db.VarChar(255)
+  passwordHash       String?       @map("password_hash") @db.VarChar(255)
   name               String?       @db.VarChar(100)
+  image              String?       @db.VarChar(500)
+  authProvider       String        @default("credentials") @map("auth_provider") @db.VarChar(50)
+  googleId           String?       @unique @map("google_id") @db.VarChar(255)
   sophtronCustomerId String?       @map("sophtron_customer_id") @db.Uuid
   createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz()
   updatedAt          DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
   ...
 }
```

| New/Changed Column | Purpose |
|---|---|
| `passwordHash` -> **nullable** | Google users won't have a password |
| `authProvider` | Tracks how the user signed up (`"credentials"` or `"google"`). Useful for UI logic (e.g., hide password-change form for Google users) |
| `googleId` | Google's unique subject identifier (`sub` claim). Unique index for fast lookup |
| `image` | Profile picture URL from Google (optional, for future use) |

### Migration

```bash
npx prisma migrate dev --name add-google-auth
```

---

## 3. Backend Code Changes

### 3a. `app/lib/auth.ts` — Add Google provider

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compareSync } from "bcryptjs";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      // ... existing credentials config unchanged
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
          // Link Google ID if user registered with credentials first
          if (!existingUser.googleId) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: account.providerAccountId,
                authProvider: "google",
                image: user.image,
              },
            });
          }
        } else {
          // Create new user from Google profile
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              googleId: account.providerAccountId,
              authProvider: "google",
            },
          });
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
```

Key behavior:
- **New Google users** are auto-created in the `user` table (no registration needed).
- **Existing credentials users** who sign in with Google (same email) get their account linked by populating `googleId`.
- The JWT `token.id` always resolves to the internal UUID, so all downstream API routes work unchanged.

### 3b. `app/api/register/route.ts`

No changes required. Registration still works for credentials users. The `passwordHash` being nullable won't affect this flow since it always provides a password.

### 3c. `app/api/profile/route.ts` — Conditional password section

Add a check: if the user has no password, reject password-change requests:

```typescript
// In the PUT handler, before processing password change:
if (newPassword) {
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password change is not available for Google sign-in accounts" },
      { status: 400 }
    );
  }
  // ... existing password change logic
}
```

Also update the `GET` response to include `authProvider` so the frontend knows:

```typescript
return NextResponse.json({
  id: user.id, name: user.name, email: user.email, authProvider: user.authProvider
});
```

### 3d. `app/api/forgot-password/route.ts` — Guard for Google users

Skip token creation for users without a password (still return success to prevent email enumeration):

```typescript
const user = await prisma.user.findUnique({ where: { email } });
if (!user || !user.passwordHash) {
  return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
}
```

---

## 4. Frontend UI Changes

### 4a. `app/(auth)/login/page.tsx` — Add "Sign in with Google" button

Add a divider and Google button below the existing form:

```tsx
{/* After the existing </form> and before the register link */}

<div className="relative my-6">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-zinc-300 dark:border-zinc-600" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
      or
    </span>
  </div>
</div>

<button
  type="button"
  onClick={() => signIn("google", { callbackUrl: "/overview" })}
  className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
>
  <GoogleIcon />
  Sign in with Google
</button>
```

### 4b. `app/(dashboard)/profile/page.tsx` — Conditionally hide password section

Fetch `authProvider` from the profile API and conditionally render the password-change panel:

```tsx
{profile.authProvider === "credentials" && (
  <div>{/* password change form */}</div>
)}
```

---

## 5. Summary of All Changes

| Area | File | Change |
|------|------|--------|
| **Google Setup** | Google Cloud Console | Create OAuth 2.0 credentials |
| **Env vars** | `.env` | Add `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` |
| **Schema** | `prisma/schema.prisma` | Make `passwordHash` nullable, add `googleId`, `authProvider`, `image` |
| **Migration** | CLI | `npx prisma migrate dev --name add-google-auth` |
| **Auth config** | `app/lib/auth.ts` | Add Google provider + `signIn` callback for user find-or-create + updated `jwt` callback |
| **Profile API** | `app/api/profile/route.ts` | Return `authProvider`, guard password change for Google users |
| **Forgot password** | `app/api/forgot-password/route.ts` | Skip token creation for users without a password |
| **Login UI** | `app/(auth)/login/page.tsx` | Add "Sign in with Google" button |
| **Profile UI** | `app/(dashboard)/profile/page.tsx` | Hide password section for Google users |
| **Package** | `package.json` | No new dependencies — `next-auth` v5 includes the Google provider out of the box |
