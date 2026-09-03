import examQuestions from "../data/examQuestions.json";

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
}
