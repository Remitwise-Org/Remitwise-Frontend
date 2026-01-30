export default function TransactionItem({
  date,
  description,
  amount,
  status,
}: {
  date: string;
  description: string;
  amount: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="font-medium text-(--foreground)">{description}</div>
        <div className="text-sm text-gray-500">{date}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-(--foreground)">{amount}</div>
        <div className="text-sm text-green-600">{status}</div>
      </div>
    </div>
  );
}