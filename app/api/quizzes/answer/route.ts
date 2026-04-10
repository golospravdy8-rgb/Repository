import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  const { quizId, phone, answerIndex } = await req.json();

  const quizzes = await prisma.$queryRaw`SELECT * FROM "Quiz" WHERE id=${quizId}` as any[];
  if (!quizzes.length) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const quiz = quizzes[0];

  const isCorrect = answerIndex === quiz.correctIndex;

  try {
    await prisma.$executeRaw`
      INSERT INTO "QuizResult" (phone, "quizId", "isCorrect")
      VALUES (${phone}, ${quizId}, ${isCorrect})
      ON CONFLICT (phone, "quizId") DO NOTHING
    `;
    if (isCorrect && phone) {
      await prisma.guestContact.updateMany({
        where: { phone },
        data: { hp: { increment: quiz.hpReward } },
      });
    }
  } catch (e) {
    /* ignore duplicate */
  }

  return NextResponse.json({
    isCorrect,
    correctIndex: quiz.correctIndex,
    hpEarned: isCorrect ? quiz.hpReward : 0,
  });
}
