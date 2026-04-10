import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone") || "";

  const quizzes = await prisma.$queryRaw`SELECT * FROM "Quiz" ORDER BY id` as any[];
  if (!quizzes.length) return NextResponse.json({ quiz: null, alreadyAnswered: false });

  const dayIndex = new Date().getDate() % quizzes.length;
  const quiz = quizzes[dayIndex];

  let alreadyAnswered = false;
  if (phone) {
    const result = await prisma.$queryRaw`
      SELECT id FROM "QuizResult"
      WHERE phone=${phone} AND "quizId"=${quiz.id}
      AND DATE("answeredAt") = CURRENT_DATE
    ` as any[];
    alreadyAnswered = result.length > 0;
  }

  return NextResponse.json({
    quiz: { ...quiz, options: typeof quiz.options === "string" ? JSON.parse(quiz.options) : quiz.options },
    alreadyAnswered,
  });
}
