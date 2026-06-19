interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] ${className}`}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  variant?: "default" | "stat" | "chart";
}

export function SkeletonCard({ variant = "default" }: SkeletonCardProps) {
  const variants = {
    default: "h-32 rounded-2xl",
    stat: "h-40 rounded-[24px]",
    chart: "h-80 rounded-3xl",
  };

  return (
    <div
      className={`${variants[variant]} border border-white/10`}
      style={{ backgroundImage: "var(--card)" }}
    >
      <div className="p-6 h-full flex flex-col">
        {variant === "stat" && (
          <>
            <div className="flex justify-between items-start mb-8">
              <Skeleton className="w-12 h-12 rounded-2xl" />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
            <div className="space-y-3">
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-32 h-9 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
          </>
        )}
        {variant === "chart" && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="w-32 h-5 rounded" />
                  <Skeleton className="w-20 h-4 rounded" />
                </div>
              </div>
              <Skeleton className="w-12 h-6 rounded" />
            </div>
            <div className="flex-1 flex items-end gap-2 px-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col gap-1">
                  <Skeleton
                    className="w-full rounded-t"
                    style={{ height: `${30 + Math.random() * 60}%` }}
                  />
                  <Skeleton className="w-full h-3 rounded" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <Skeleton className="w-16 h-3 rounded" />
              <Skeleton className="w-16 h-3 rounded" />
            </div>
          </div>
        )}
        {variant === "default" && (
          <div className="space-y-3">
            <Skeleton className="w-1/3 h-4 rounded" />
            <Skeleton className="w-2/3 h-8 rounded" />
            <Skeleton className="w-1/2 h-4 rounded" />
          </div>
        )}
      </div>
    </div>
  );
}

interface SkeletonListProps {
  rows?: number;
  variant?: "table" | "cards";
}

export function SkeletonList({ rows = 5, variant = "table" }: SkeletonListProps) {
  if (variant === "table") {
    return (
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 w-full">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <Skeleton className="w-40 h-6 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
          </div>
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>

        <div className="hidden md:block">
          <div className="flex gap-4 pb-4 border-b border-white/5">
            <Skeleton className="flex-1 h-4 rounded" />
            <Skeleton className="flex-[2] h-4 rounded" />
            <Skeleton className="w-20 h-4 rounded" />
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-20 h-4 rounded" />
          </div>
          {[...Array(rows)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 border-b border-white/5 last:border-0"
            >
              <Skeleton className="flex-1 h-4 rounded" />
              <Skeleton className="flex-[2] h-4 rounded" />
              <Skeleton className="w-20 h-6 rounded-full" />
              <Skeleton className="w-24 h-4 rounded" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
          ))}
        </div>

        <div className="md:hidden space-y-4">
          {[...Array(rows)].map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.03] rounded-xl border border-white/5 p-5 space-y-3"
            >
              <div className="flex justify-between">
                <Skeleton className="w-2/3 h-5 rounded" />
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
              <Skeleton className="w-1/3 h-3 rounded" />
              <Skeleton className="w-24 h-6 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="bg-white/[0.03] rounded-xl border border-white/5 p-5 flex items-center gap-4"
        >
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-2/3 h-4 rounded" />
            <Skeleton className="w-1/3 h-3 rounded" />
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="w-16 h-5 rounded" />
            <Skeleton className="w-12 h-3 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonChartProps {
  type?: "bar" | "line" | "donut";
}

export function SkeletonChart({ type = "bar" }: SkeletonChartProps) {
  if (type === "bar") {
    return (
      <div className="bg-black/40 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-sm w-full">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="w-32 h-5 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
          </div>
          <Skeleton className="w-12 h-6 rounded" />
        </div>

        <div className="flex items-end justify-between gap-2 h-[220px] px-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full rounded-t"
                style={{ height: `${40 + Math.random() * 50}%` }}
              />
              <Skeleton className="w-6 h-3 rounded" />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-6 mt-4">
          <Skeleton className="w-16 h-3 rounded" />
          <Skeleton className="w-16 h-3 rounded" />
        </div>
      </div>
    );
  }

  if (type === "donut") {
    return (
      <div className="bg-black/40 border border-white/10 rounded-3xl p-6 w-full">
        <div className="flex items-start justify-between mb-6">
          <Skeleton className="w-32 h-5 rounded" />
          <Skeleton className="w-12 h-6 rounded" />
        </div>

        <div className="flex justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
        </div>

        <div className="mt-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="w-20 h-3 rounded" />
              </div>
              <Skeleton className="w-12 h-3 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-6 w-full">
      <div className="flex items-start justify-between mb-6">
        <Skeleton className="w-32 h-5 rounded" />
        <Skeleton className="w-12 h-6 rounded" />
      </div>

      <div className="h-[200px] flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          <path
            d="M0 150 Q 50 100, 100 120 T 200 80 T 300 100 T 400 60"
            fill="none"
            stroke="transparent"
            strokeWidth="3"
          />
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={25 * i}
              x2="400"
              y2={25 * i}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <rect
              key={i}
              x={80 * i + 10}
              y={50 + Math.random() * 80}
              width="40"
              height="0"
              className="animate-pulse"
              fill="rgba(255,255,255,0.05)"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export function SkeletonWidget({ 
  title, 
  children 
}: { 
  title?: string; 
  children?: React.ReactNode 
}) {
  return (
    <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 w-full">
      {title && (
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-40 h-6 rounded" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
      )}
      {children || <Skeleton className="w-full h-32 rounded-xl" />}
    </div>
  );
}
