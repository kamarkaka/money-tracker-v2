import { prisma } from "@/app/lib/db";

interface Rule {
  match: string;
  categoryId: string;
}

/**
 * Fetch all rules for a user, ordered by sequence.
 */
export async function getUserRules(userId: string): Promise<Rule[]> {
  return prisma.categoryRule.findMany({
    where: { userId },
    orderBy: { sequence: "asc" },
    select: { match: true, categoryId: true },
  });
}

/**
 * Given a list of rules and a description, return the first matching categoryId or null.
 */
export function matchRuleFromList(rules: Rule[], description: string): string | null {
  const lowerDesc = description.toLowerCase();
  for (const rule of rules) {
    if (lowerDesc.includes(rule.match.toLowerCase())) {
      return rule.categoryId;
    }
  }
  return null;
}

/**
 * Fetch rules and match a description in one call. Use for single-transaction creation.
 */
export async function matchRule(userId: string, description: string): Promise<string | null> {
  const rules = await getUserRules(userId);
  return matchRuleFromList(rules, description);
}
