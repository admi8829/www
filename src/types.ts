export interface Question {
  id: number;
  subject: 'Physics' | 'Chemistry' | 'Biology';
  topic: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface HighScore {
  subject: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
}

export interface QuizState {
  status: 'dashboard' | 'active' | 'summary';
  currentSubject: 'Physics' | 'Chemistry' | 'Biology' | null;
  questions: Question[];
  currentQuestionIndex: number;
  selectedOptionIndex: number | null;
  isAnswerChecked: boolean;
  score: number;
  timeRemaining: number;
  answersHistory: {
    questionIndex: number;
    questionText: string;
    selectedOption: string | null;
    correctOption: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface KotlinFile {
  name: string;
  path: string;
  description: string;
  code: string;
}
