import type { IsoDateString } from "@/types/workspace";

export interface LessonAttachment {
  label: string;
  url: string;
}

export interface LessonQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface LessonQuiz {
  questions: LessonQuizQuestion[];
}

export interface Lesson {
  lessonId: string;
  title: string;
  youtubeVideoId: string;
  notes: string;
  order: number;
  requiresPrevious: boolean;
  attachments: LessonAttachment[];
  quiz?: LessonQuiz;
  requiresQuizPass: boolean;
}

export interface CourseSection {
  sectionId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  courseId: string;
  workspaceId: string;
  title: string;
  description: string;
  thumbnailVideoId: string;
  accessTier: string | "all";
  published: boolean;
  sections: CourseSection[];
}

export interface LessonProgress {
  workspaceId: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  watchedPercent: number;
  completed: boolean;
  quizScore?: number;
  quizPassed?: boolean;
  lastWatched: IsoDateString;
}
