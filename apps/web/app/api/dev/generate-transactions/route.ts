import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { EMOJI_TO_NAME } from "@/app/lib/emoji-categories";

const EXPENSE_TEMPLATES: { emoji: string; descriptions: string[]; minAmount: number; maxAmount: number }[] = [
  { emoji: "🍔", descriptions: ["Chipotle", "Pizza Hut", "Sushi", "Thai food", "McDonalds", "Panda Express", "Olive Garden", "Burger King", "Taco Bell", "Ramen", "Indian buffet", "KFC", "Subway", "Popeyes", "Five Guys", "Wingstop", "Brunch", ""], minAmount: 8, maxAmount: 45 },
  { emoji: "☕", descriptions: ["Starbucks", "Blue Bottle", "Philz Coffee", "Dunkin", "Peet's Coffee", ""], minAmount: 4, maxAmount: 8 },
  { emoji: "🛒", descriptions: ["Costco", "Trader Joe's", "Whole Foods", "Walmart", "Target groceries", "Safeway", ""], minAmount: 25, maxAmount: 120 },
  { emoji: "🚗", descriptions: ["Gas station", "Uber", "Lyft", "Parking", "Car wash", "Toll", ""], minAmount: 5, maxAmount: 55 },
  { emoji: "🏠", descriptions: ["Rent", "Electric bill", "Internet", "Water bill", "Renter insurance"], minAmount: 25, maxAmount: 1800 },
  { emoji: "🎮", descriptions: ["Netflix", "Movie tickets", "Spotify", "Concert", "Video game", "Bowling", "Disney+", "Mini golf", "Board game", ""], minAmount: 7, maxAmount: 80 },
  { emoji: "👕", descriptions: ["Amazon", "Target", "Nike", "H&M", "Best Buy", "Uniqlo", "Zara", ""], minAmount: 15, maxAmount: 130 },
  { emoji: "📱", descriptions: ["iCloud", "ChatGPT Plus", "YouTube Premium", "Claude Pro", "Gym membership", "Phone bill"], minAmount: 3, maxAmount: 50 },
  { emoji: "💊", descriptions: ["CVS pharmacy", "Doctor copay", "Vitamins", "Dental", "Eye drops", ""], minAmount: 8, maxAmount: 45 },
  { emoji: "✈️", descriptions: ["Hotel", "Airbnb", "Flight", "Souvenir", ""], minAmount: 30, maxAmount: 300 },
];

const INCOME_TEMPLATES = [
  { emoji: "💰", descriptions: ["Paycheck", "Freelance gig", "Cash back", "Sold item", "Refund", "Side hustle"], minAmount: 50, maxAmount: 3500 },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's account
  const account = await prisma.account.findFirst({ where: { userId } });
  if (!account) {
    return NextResponse.json({ error: "No account found" }, { status: 400 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const transactions: {
    userId: string;
    accountId: string;
    categoryId: string;
    description: string;
    amount: number;
    date: Date;
    isManual: boolean;
    isHidden: boolean;
  }[] = [];

  // Generate 60-80 expense transactions
  const expenseCount = randomInt(60, 80);
  for (let i = 0; i < expenseCount; i++) {
    const template = randomPick(EXPENSE_TEMPLATES);
    const desc = randomPick(template.descriptions);
    const amount = -randomAmount(template.minAmount, template.maxAmount);
    const day = randomInt(1, Math.min(daysInMonth, today));
    const date = new Date(year, month, day);

    // Find or create category
    let category = await prisma.category.findFirst({
      where: { userId, emoji: template.emoji },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { userId, name: EMOJI_TO_NAME[template.emoji] || template.emoji, emoji: template.emoji },
      });
    }

    transactions.push({
      userId,
      accountId: account.id,
      categoryId: category.id,
      description: desc,
      amount,
      date,
      isManual: true,
      isHidden: false,
    });
  }

  // Generate 3-5 income transactions
  const incomeCount = randomInt(3, 5);
  for (let i = 0; i < incomeCount; i++) {
    const template = randomPick(INCOME_TEMPLATES);
    const desc = randomPick(template.descriptions);
    const amount = randomAmount(template.minAmount, template.maxAmount);
    const day = randomInt(1, Math.min(daysInMonth, today));
    const date = new Date(year, month, day);

    let category = await prisma.category.findFirst({
      where: { userId, emoji: template.emoji },
    });
    if (!category) {
      category = await prisma.category.create({
        data: { userId, name: EMOJI_TO_NAME[template.emoji] || template.emoji, emoji: template.emoji },
      });
    }

    transactions.push({
      userId,
      accountId: account.id,
      categoryId: category.id,
      description: desc,
      amount,
      date,
      isManual: true,
      isHidden: false,
    });
  }

  await prisma.transaction.createMany({ data: transactions });

  return NextResponse.json({ success: true, count: transactions.length }, { status: 201 });
}
