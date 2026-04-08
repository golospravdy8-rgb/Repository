import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';


export async function GET() {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Quiz" (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      "correctIndex" INTEGER NOT NULL,
      category VARCHAR(50) DEFAULT 'rules',
      "hpReward" INTEGER DEFAULT 10
    )
  `;
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "QuizResult" (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      "quizId" INTEGER NOT NULL,
      "isCorrect" BOOLEAN,
      "answeredAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE(phone, "quizId")
    )
  `;
  await prisma.$executeRaw`
    INSERT INTO "Quiz" (question, options, "correctIndex", "hpReward") VALUES
    ('Скільки гравців в баскетбольній команді на майданчику?', '["4","5","6","7"]'::jsonb, 1, 15),
    ('Скільки очок дає кидок з-за лінії трьох очок?', '["1","2","3","4"]'::jsonb, 2, 10),
    ('Яка висота баскетбольного кільця?', '["2.65м","3.05м","3.25м","3.5м"]'::jsonb, 1, 20),
    ('Скільки хвилин триває одна чверть у баскетболі?', '["8 хвилин","10 хвилин","12 хвилин","15 хвилин"]'::jsonb, 1, 10),
    ('Як називається порушення коли гравець переступає з м''ячем?', '["Аут","Пробіжка","Фол","Блок"]'::jsonb, 1, 15)
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}
