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

  // 6. Test Mistake Notebook (Recording, Summary, Review, Removal)
  console.log("  ▶ Testing Mistake Notebook (錯題本)...");
  const testUser = "test_user_mistakes_999";
  const recorded = await QuizManager.recordMistake(undefined, testUser, sampleQ.id, wrongOption);
  if (!recorded || recorded.wrongCount !== 1) {
    throw new Error(`Mistake recording failed: ${JSON.stringify(recorded)}`);
  }
  console.log(`    ✔ Mistake recorded: [${recorded.subject}] ${recorded.qid} (wrong: ${recorded.lastWrongChoice}, ans: ${recorded.correctAnswer})`);

  const summary = await QuizManager.getMistakeSummary(undefined, testUser);
  if (summary.totalCount !== 1 || !summary.bySubject[sampleQ.subject]) {
    throw new Error(`Mistake summary mismatch: ${JSON.stringify(summary)}`);
  }
  console.log(`    ✔ Mistake summary: total ${summary.totalCount} items, bySubject:`, summary.bySubject);

  const reviewQ = await QuizManager.pickMistakeQuestion(undefined, testUser);
  if (!reviewQ || reviewQ.id !== sampleQ.id) {
    throw new Error(`Mistake question review pick failed: ${JSON.stringify(reviewQ)}`);
  }
  console.log(`    ✔ Picked mistake question for review: ${reviewQ.id}`);

  const removed = await QuizManager.removeMistake(undefined, testUser, sampleQ.id);
  if (!removed) {
    throw new Error("Mistake removal failed!");
  }
  const postSummary = await QuizManager.getMistakeSummary(undefined, testUser);
  if (postSummary.totalCount !== 0) {
    throw new Error(`Expected 0 mistakes after removal, got ${postSummary.totalCount}`);
  }
  console.log(`    ✔ Mastered question removed from mistake notebook. Remaining: ${postSummary.totalCount}`);

  // 7. Needle Intent Routing for Quiz & Mistakes
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

  const routeMistakes1 = await classifier.classify("我想看我的錯題本");
  if (routeMistakes1.tool !== "view_mistakes") {
    throw new Error(`Expected view_mistakes, got ${routeMistakes1.tool}`);
  }
  console.log(`  ✔ '我想看我的錯題本' -> ${routeMistakes1.tool}`);

  const routeMistakes2 = await classifier.classify("幫我複習錯題");
  if (routeMistakes2.tool !== "review_mistakes") {
    throw new Error(`Expected review_mistakes, got ${routeMistakes2.tool}`);
  }
  console.log(`  ✔ '幫我複習錯題' -> ${routeMistakes2.tool}`);

  console.log("✅ Taiwan Time & Exam Quiz tests passed!\n");
}
