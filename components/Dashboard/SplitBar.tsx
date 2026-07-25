export default function SplitBar({
  label,
  amount,
  percentage,
  color,
}: {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-gray-100 font-medium">{label}</span>
        <span className="text-white font-semibold">
          ${amount} ({percentage}%)
        </span>
      </div>
      <div 
        className="w-full bg-[#1F1F1F] rounded-full h-3"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} split`}
      >
        <div
          className={`${color} h-3 rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
