export default function StatCard({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: "up" | "down" | "neutral";
}) {
  return (
    <div
      className="rounded-xl shadow-md p-6"
      style={{ backgroundImage: "var(--card)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600 text-sm">{title}</div>
        <div className="text-[var(--accent)]">{icon}</div>
      </div>
      <div
        className={`text-sm ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"}`}
      >
        {change}
      </div>
      <div className="text-3xl font-bold text-(--foreground) mb-1">{value}</div>
    </div>
  );
}
