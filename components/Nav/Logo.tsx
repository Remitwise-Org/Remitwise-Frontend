"use client";

import Image from "next/image";
import Link from "next/link";

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <Link href="/" className={`flex items-center gap-2 group ${className}`}>
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-105">
        <Image 
          src="/logo.svg" 
          width={40} 
          height={40} 
          alt="RemitWise Logo" 
          className="relative z-10"
        />
        <div className="absolute inset-0 bg-brand-red/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <span className="text-white text-lg sm:text-xl font-bold tracking-tight">
        RemitWise
      </span>
    </Link>
  );
};

export default Logo;
