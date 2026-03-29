"use client";

interface ITransactionHistoryButtonProps {
  text: string;
  onclick?: () => void;
  icon: React.ReactNode;
}

const Button: React.FC<ITransactionHistoryButtonProps> = ({
  text,
  icon,
  onclick,
}) => {
  return (
    <button
      type="button"
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-[#FFFFFF14] bg-white/5 px-4 py-3 text-center transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101] sm:w-auto sm:min-w-[148px]"
      onClick={onclick}
    >
      {icon}
      <p className="whitespace-normal break-words text-center text-sm font-semibold leading-5 tracking-[-0.2px] text-white sm:text-base sm:leading-6">
        {text}
      </p>
    </button>
  );
};

export default Button;
