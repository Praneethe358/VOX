type QuestionCardProps = {
  question: string;
};

export default function QuestionCard({ question }: QuestionCardProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-base text-slate-100">{question}</p>
    </div>
  );
}
