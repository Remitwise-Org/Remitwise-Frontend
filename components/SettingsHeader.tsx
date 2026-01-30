"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { ArrowLeft } from "lucide-react";

export default function SettingsHeader() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      // Prefer native history to ensure it works in all environments
      window.history.back();
      return;
    }
    router.push("/dashboard");
  }
return (
  <header className="bg-black border-b border-gray-300/20">
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex items-center justify-center bg-white/10 border border-gray-700 hover:bg-white/20 text-white rounded-xl px-3 py-2"
            style={{ minWidth: 40, minHeight: 40 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="ml-4">
            <h1 className="text-white text-2xl font-bold">Settings</h1>
            <p className="text-gray-400 text-sm mt-1">
              Manage your account and preferences
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.svg" alt="RemitWise" className="w-10 h-10" />
            </div>
            <span className="text-white text-xl font-bold">RemitWise</span>
          </Link>
        </div>
      </div>
    </div>
  </header>
);
}