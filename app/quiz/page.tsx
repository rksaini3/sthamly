import quiz from "@/content/quiz/questions.json";
import QuizClient from "@/components/quiz/QuizClient";
import type { QuizFile } from "@/lib/dosha/types";

export default function QuizPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <QuizClient quiz={quiz as QuizFile} />
    </main>
  );
}