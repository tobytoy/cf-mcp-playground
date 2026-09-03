import { QuizManager } from "../src/tools/quizManager";
import { NeedleClassifier } from "../src/classifier/needle";
import { getTaiwanTimeString, getTaiwanDate } from "../src/utils/time";
import type { Env } from "../src/types/env";

export async function testQuizAndTaiwanTime(): Promise<void> {
  console.log("▶ Testing Taiwan Time & Exam Quiz Features...");

  // 1. Taiwan Time Check
  const twTime = getTaiwanTimeString();
  console.log(`  ✔ Current Taiwan Time (UTC+8): ${twTime}`);
  if (!twTime || !twTime.includes("/")) {
    throw new Error(`Taiwan time string invalid: ${twTime}`);
  }

  // 2. Quiz Subjects Verification
  const subjects = QuizManager.getSubjects();
  console.log(`  ✔ Loaded ${subjects.length} subjects:`, subjects);
  if (subjects.length < 6) {
    throw new Error(`Expected at least 6 subjects, got ${subjects.length}`);
  }

  // 3. Question Picking & Year-Weighted Distribution
  const samplePicks = Array.from({ length: 50 }, () => QuizManager.pickRandomQuestion());
  const yearCounts: Record<number, number> = {};
  for (const q of samplePicks) {
    yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
  }
  console.log("  ✔ Sample 50 picks year distribution:", yearCounts);

  // 4. Test Single Question Structure
  const sampleQ = QuizManager.pickRandomQuestion("高等資料庫設計");
  if (sampleQ.subject !== "高等資料庫設計" || sampleQ.options.length !== 4 || !sampleQ.answer) {
    throw new Error(`Sample question malformed: ${JSON.stringify(sampleQ)}`);
  }
  console.log(`  ✔ Question picked: [${sampleQ.year}年 ${sampleQ.subject}] ${sampleQ.question.slice(0, 30)}…`);

  // 5. Answer Checking
  const correctCheck = QuizManager.checkAnswer(sampleQ.id, sampleQ.answer);
  if (!correctCheck || !correctCheck.isCorrect) {
    throw new Error("Correct answer check failed!");
  }
  console.log(`  ✔ Answer check correct -> ${sampleQ.answer} isCorrect: true`);

  const wrongOption = sampleQ.answer === "A" ? "B" : "A";
  const wrongCheck = QuizManager.checkAnswer(sampleQ.id, wrongOption);
  if (!wrongCheck || wrongCheck.isCorrect) {
    throw new Error("Wrong answer check failed!");
  }
  console.log(`  ✔ Answer check wrong -> ${wrongOption} isCorrect: false`);

  // 6. Needle Intent Routing for Quiz
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    GEMINI_API_KEY: "k"
  };
  const classifier = new NeedleClassifier(mockEnv);

  const route1 = await classifier.classify("考一題高等資料庫考古題");
  if (route1.tool !== "exam_quiz") {
    throw new Error(`Expected exam_quiz, got ${route1.tool}`);
  }
  console.log(`  ✔ '考一題高等資料庫考古題' -> ${route1.tool}`);

  const route2 = await classifier.classify("做一題國考測驗");
  if (route2.tool !== "exam_quiz") {
    throw new Error(`Expected exam_quiz, got ${route2.tool}`);
  }
  console.log(`  ✔ '做一題國考測驗' -> ${route2.tool}`);

  console.log("✅ Taiwan Time & Exam Quiz tests passed!\n");
}
