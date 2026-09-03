import examQuestions from "../data/examQuestions.json";
import { getTaiwanTimeString } from "../utils/time";

export interface ExamQuestion {
  id: string;
  subject: string;
  year: number;
  question: string;
  options: string[];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface QuizCheckResult {
  isCorrect: boolean;
  userChoice: string;
  correctAnswer: string;
  question: ExamQuestion;
}

export interface UserMistakeItem {
  qid: string;
  subject: string;
  year: number;
  lastWrongChoice: string;
  correctAnswer: string;
  wrongCount: number;
  lastFailedAt: string;
}

export interface MistakeSummary {
  totalCount: number;
  bySubject: Record<string, number>;
  recentMistakes: UserMistakeItem[];
}

const inMemoryMistakes = new Map<string, UserMistakeItem[]>();

const ALL_QUESTIONS = examQuestions as ExamQuestion[];

export class QuizManager {
  /**
   * Get list of all available subjects.
   */
  static getSubjects(): string[] {
    const subjects = new Set<string>();
    for (const q of ALL_QUESTIONS) {
      subjects.add(q.subject);
    }
    return Array.from(subjects);
  }

  /**
   * Select a question using:
   * 1. Equal probability across all subjects (P = 1/N).
   * 2. Year-weighted probability within the selected subject (newer years have much higher weight).
   */
  static pickRandomQuestion(subjectFilter?: string): ExamQuestion {
    const subjects = this.getSubjects();
    let targetSubject = subjectFilter;

    // 1. Equal probability across subjects if not explicitly specified
    if (!targetSubject || targetSubject === "all" || !subjects.includes(targetSubject)) {
      const subjectIndex = Math.floor(Math.random() * subjects.length);
      targetSubject = subjects[subjectIndex];
    }

    // Filter questions by subject
    const subjectQuestions = ALL_QUESTIONS.filter((q) => q.subject === targetSubject);
    if (subjectQuestions.length === 0) {
      return ALL_QUESTIONS[Math.floor(Math.random() * ALL_QUESTIONS.length)];
    }

    // 2. Year-weighted selection (more recent years = quadratically higher probability)
    // Weight = (year - 95)^2. For year 114 -> 361, for year 101 -> 36.
    const weights = subjectQuestions.map((q) => {
      const delta = Math.max(1, q.year - 95);
      return Math.pow(delta, 2);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let randomVal = Math.random() * totalWeight;

    for (let i = 0; i < subjectQuestions.length; i++) {
      randomVal -= weights[i];
      if (randomVal <= 0) {
        return subjectQuestions[i];
      }
    }

    return subjectQuestions[subjectQuestions.length - 1];
  }

  /**
   * Lookup question by ID.
   */
  static getQuestionById(id: string): ExamQuestion | undefined {
    return ALL_QUESTIONS.find((q) => q.id === id);
  }

  /**
   * Check user's answer and return detailed result.
   */
  static checkAnswer(questionId: string, userChoice: string): QuizCheckResult | null {
    const question = this.getQuestionById(questionId);
    if (!question) return null;

    const normalizedChoice = userChoice.toUpperCase().trim().slice(0, 1);
    const isCorrect = normalizedChoice === question.answer;

    return {
      isCorrect,
      userChoice: normalizedChoice,
      correctAnswer: question.answer,
      question
    };
  }

  /**
   * Record a mistake into the user's persistent Mistake Notebook (KV + in-memory fallback).
   */
  static async recordMistake(
    kv: KVNamespace | undefined,
    userId: string,
    qid: string,
    userChoice: string
  ): Promise<UserMistakeItem | null> {
    const q = this.getQuestionById(qid);
    if (!q) return null;

    const now = getTaiwanTimeString();
    const mistakes = await this.getMistakes(kv, userId);
    const existingIdx = mistakes.findIndex((m) => m.qid === qid);

    let item: UserMistakeItem;
    if (existingIdx >= 0) {
      item = {
        ...mistakes[existingIdx],
        lastWrongChoice: userChoice,
        wrongCount: mistakes[existingIdx].wrongCount + 1,
        lastFailedAt: now
      };
      mistakes.splice(existingIdx, 1);
      mistakes.unshift(item);
    } else {
      item = {
        qid,
        subject: q.subject,
        year: q.year,
        lastWrongChoice: userChoice,
        correctAnswer: q.answer,
        wrongCount: 1,
        lastFailedAt: now
      };
      mistakes.unshift(item);
    }

    // Save back to memory & KV
    inMemoryMistakes.set(userId, mistakes);
    if (kv) {
      try {
        const key = `user:${userId}:mistakes`;
        await kv.put(key, JSON.stringify(mistakes));
      } catch (err) {
        console.warn("[QuizManager] Failed to persist mistake to KV:", err);
      }
    }

    return item;
  }

  /**
   * Remove a question from the user's Mistake Notebook (e.g. when answered correctly).
   */
  static async removeMistake(
    kv: KVNamespace | undefined,
    userId: string,
    qid: string
  ): Promise<boolean> {
    const mistakes = await this.getMistakes(kv, userId);
    const filtered = mistakes.filter((m) => m.qid !== qid);
    if (filtered.length === mistakes.length) return false;

    inMemoryMistakes.set(userId, filtered);
    if (kv) {
      try {
        const key = `user:${userId}:mistakes`;
        await kv.put(key, JSON.stringify(filtered));
      } catch (err) {
        console.warn("[QuizManager] Failed to update mistake removal in KV:", err);
      }
    }
    return true;
  }

  /**
   * Retrieve list of all mistakes recorded for a user.
   */
  static async getMistakes(kv: KVNamespace | undefined, userId: string): Promise<UserMistakeItem[]> {
    if (kv) {
      try {
        const key = `user:${userId}:mistakes`;
        const stored = await kv.get<UserMistakeItem[]>(key, "json");
        if (stored && Array.isArray(stored)) {
          inMemoryMistakes.set(userId, stored);
          return stored;
        }
      } catch (err) {
        console.warn("[QuizManager] Failed to fetch mistakes from KV:", err);
      }
    }

    return inMemoryMistakes.get(userId) || [];
  }

  /**
   * Get summarized breakdown of user's mistake notebook.
   */
  static async getMistakeSummary(
    kv: KVNamespace | undefined,
    userId: string
  ): Promise<MistakeSummary> {
    const mistakes = await this.getMistakes(kv, userId);
    const bySubject: Record<string, number> = {};
    for (const m of mistakes) {
      bySubject[m.subject] = (bySubject[m.subject] || 0) + 1;
    }

    return {
      totalCount: mistakes.length,
      bySubject,
      recentMistakes: mistakes.slice(0, 10)
    };
  }

  /**
   * Pick a random question from the user's mistake notebook for targeted practice.
   */
  static async pickMistakeQuestion(
    kv: KVNamespace | undefined,
    userId: string
  ): Promise<ExamQuestion | null> {
    const mistakes = await this.getMistakes(kv, userId);
    if (mistakes.length === 0) return null;

    // Pick a random mistake item
    const randomIndex = Math.floor(Math.random() * mistakes.length);
    const targetQid = mistakes[randomIndex].qid;
    return this.getQuestionById(targetQid) || null;
  }
}
