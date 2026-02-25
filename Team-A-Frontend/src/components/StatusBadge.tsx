type Status = "offline" | "recording" | "idle";

type StatusBadgeProps = {
  status: Status;
};

const statusStyles: Record<Status, string> = {
  offline: "bg-red-500/20 text-red-300",
  recording: "bg-emerald-500/20 text-emerald-300",
  idle: "bg-slate-500/20 text-slate-200"
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
