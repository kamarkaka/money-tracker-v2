import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import type { AuthRequest } from "../lib/auth.js";
import { requireAuth } from "../lib/auth.js";
import { registerLimiter, loginLimiter, loginByEmailLimiter, refreshLimiter, deleteAccountLimiter } from "../lib/rate-limit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();

// POST /auth/register
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 6 || password.length > 72) {
      res.status(400).json({ error: "Email and password (6-72 chars) required" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    // Hash before checking existence to prevent timing-based email enumeration
    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "Registration failed" });
      return;
    }
    const trimmedName = (name && typeof name === "string") ? name.slice(0, 100).trim() : null;
    const user = await prisma.user.create({
      data: { email, passwordHash, name: trimmedName },
    });

    const token = await signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error("[Auth]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/login
router.post("/login", loginLimiter, loginByEmailLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
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
    console.error("[Auth]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/refresh
router.post("/refresh", refreshLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const token = await signToken({ userId: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    console.error("[Auth]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /auth/account — permanently delete user and all associated data
router.delete("/account", deleteAccountLimiter, requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body || {};

    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password required to delete account" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

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
    console.error("[Auth]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
