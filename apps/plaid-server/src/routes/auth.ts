import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import type { AuthRequest } from "../lib/auth.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: "Email and password (min 6 chars) required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });

    const token = await signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = await signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /auth/refresh
router.post("/refresh", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const token = await signToken({ userId: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// DELETE /auth/account — permanently delete user and all associated data
router.delete("/account", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // PlaidItems cascade-delete with User, but revoke tokens at Plaid first
    const items = await prisma.plaidItem.findMany({ where: { userId } });
    for (const item of items) {
      try {
        const { decryptToken } = await import("../lib/crypto.js");
        const { removeItem } = await import("../lib/plaid.js");
        const accessToken = decryptToken(item.accessToken);
        await removeItem(accessToken);
      } catch {
        // Continue even if Plaid revocation fails
      }
    }

    // Delete user (cascades to PlaidItems)
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
