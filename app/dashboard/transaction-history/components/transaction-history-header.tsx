"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface ITransactionHistoryHeaderProps {
  title: string;
  subtitle: string;
}

const TransactionHistoryHeader: React.FC<ITransactionHistoryHeaderProps> = ({
  title,
  subtitle,
}) => {
  const router = useRouter();

  return (
    <div className="w-full border-b border-b-[#FFFFFF14] bg-[#010101F2] px-4 py-5 md:px-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#FFFFFF0D] p-2.5 transition-colors hover:bg-[#FFFFFF14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101] sm:h-11 sm:w-11 sm:p-3"
            aria-label="Go back"
          >
            <ArrowLeft size={17} className="text-white" />
          </button>
          <div className="min-w-0">
            <h5 className="text-xl font-bold leading-7 tracking-[0.07px] text-white sm:text-2xl sm:leading-8">
              {title}
            </h5>
            <p className="mt-1 max-w-2xl text-xs font-normal leading-5 tracking-[-0.15px] text-white/60 sm:text-sm">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:gap-2.5 md:shrink-0">
          <Image
            src="/logo.svg"
            width={36}
            height={36}
            className="sm:h-10 sm:w-10"
            alt="Remitwise logo"
            priority
          />
          <p className="font-bold leading-6 tracking-[-0.45px] text-white md:text-lg md:leading-7 xl:text-xl">
            RemitWise
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryHeader;
