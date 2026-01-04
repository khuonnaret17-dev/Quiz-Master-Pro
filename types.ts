
export interface Question {
  subject: string;
  question: string;
  options: string[];
  correct: number;
  isActive?: boolean;
}

// Aliases សម្រាប់ដោះស្រាយកំហុសពេល Build ក្នុងបរិស្ថានខ្លះ
export type RawQuestion = Question;

export interface QuizPart {
  title: string;
  questions: Question[];
}

export type AppMode = 'play' | 'create';

export interface QuizState {
  currentQuestionIndex: number;
  score: number;
  isFinished: boolean;
  selectedAnswer: number | null;
  showCorrect: boolean;
}

export interface SelectedQuizInfo {
  subject: string;
  partIndex: number;
}
