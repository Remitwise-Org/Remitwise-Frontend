import Link from "next/link";
import { ArrowLeft, AlertTriangle, Zap } from "lucide-react";

export default function EmergencyTransferPage() {
  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="bg-(--background) shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-(--foreground) hover:text-(--foreground)"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-(--foreground)">
              Emergency Transfer
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-8 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)]">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-6 bg-brand-red rounded-full shadow-[0_0_30px_rgba(215,35,35,0.4)]">
              <AlertTriangle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">
              Emergency Transfer Feature
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl">
              This feature is currently under development. Emergency transfers
              will allow you to send money instantly to your family members in
              urgent situations with priority processing.
            </p>
            <div className="flex gap-4 mt-8">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-brand-red hover:bg-brand-redHover text-foreground font-semibold rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/send"
                className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-white font-semibold rounded-lg border border-[#2a2a2a] transition-colors duration-200"
              >
                Use Regular Transfer
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
