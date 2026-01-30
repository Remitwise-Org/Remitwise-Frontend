export default function GoalProgress({
  name,
  current,
  target,

  gradient,
}: {
  name: string;
  current: number;
  target: number;
  gradient: { from: string; to: string };
}) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium text-[var(--foreground)]">{name}</span>
        <div className="flex gap-3 items-center">
          <span className="text-(--foreground) font-bold text-sm">
            ${target}
          </span>
          <span className="text-white/40 text-xs">
            {Math.floor((current / target) * 100)}%
          </span>
        </div>
      </div>
      <div className="w-full bg-[#FFFFFF0D] rounded-full h-3 mb-2">
        <div
          className="h-3 rounded-full"
          style={{
            width: `${percentage}%`,
            transition: "width 0.3s ease-in-out",
            backgroundImage: `linear-gradient( ${gradient.from}, ${gradient.to})`,
          }}
        ></div>
      </div>
    </div>
  );
}
