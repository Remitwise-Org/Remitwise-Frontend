"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  Send,
  PiggyBank,
  FileText,
  Shield,
  Users,
  TrendingUp,
} from "lucide-react";
import FAQSection from "@/components/FAQSection";
import FeatureSection from "@/components/FeatureSection";
import WalletDropdown from "@/components/WalletDropdown";
import WhyChooseStellar from "@/components/WhyChooseStellar";
import Hero from "@/components/Hero";
import ValueProposition from "@/components/ValueProposition";


export default function Home() {
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <main className="min-h-screen bg-brand-dark from-blue-50 to-indigo-100">
      {/* Header */}
      {/* <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">RemitWise</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
              <Link href="/send" className="text-gray-700 hover:text-blue-600">
                Send Money
              </Link>
              <Link href="/goals" className="text-gray-700 hover:text-blue-600">
                Savings Goals
              </Link>
              <Link href="/bills" className="text-gray-700 hover:text-blue-600">
                Bills
              </Link>
              <Link
                href="/settings"
                className="text-gray-700 hover:text-blue-600"
              >
                Settings
              </Link>
            </nav>
            <div className="relative">
              <button
                ref={walletButtonRef}
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Connect Wallet
              </button>
              <WalletDropdown
                isOpen={isWalletDropdownOpen}
                onClose={() => setIsWalletDropdownOpen(false)}
                buttonRef={walletButtonRef}
              />
            </div>
          </div>
        </div>
      </header> */}


      {/* Hero Section */}
      <Hero/>

      

        {/* Quick Actions */}
        {/* <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/send"
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition"
            >
              <div className="font-semibold text-lg mb-2">Send Remittance</div>
              <div className="text-blue-100 text-sm">
                Send money to family with smart allocation
              </div>
            </Link>
            <Link
              href="/split"
              className="bg-indigo-600 text-white p-6 rounded-lg hover:bg-indigo-700 transition"
            >
              <div className="font-semibold text-lg mb-2">Configure Split</div>
              <div className="text-indigo-100 text-sm">
                Set up automatic money allocation rules
              </div>
            </Link>
            <Link
              href="/dashboard"
              className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition"
            >
              <div className="font-semibold text-lg mb-2">View Dashboard</div>
              <div className="text-purple-100 text-sm">
                See your new Money Split widget and financial insights
              </div>
            </Link>
          </div>
        </div> */}
      </section >


        {/* Value Proposition Section */}
        <ValueProposition />
        
        {/* Highlight Feature Cards - Instant Remittance & Smart Allocation */}
        <div className="max-w-7xl mx-auto bg-[#0a0a0a] rounded-3xl p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <HighlightCard
              icon={<Send className="w-6 h-6" />}
              title="Instant Remittance"
              description="Send money across borders in seconds with minimal fees. Our Stellar-powered infrastructure ensures your transfers are fast, secure, and transparent."
            />
            <HighlightCard
              icon={<PiggyBank className="w-6 h-6" />}
              title="Smart Allocation"
              description="Automatically split remittances into spending, savings, bills, and insurance. Configure once and every transfer follows your rules automatically."
            />
          </div>
        </div>

        {/* Dark Feature Cards */}
        <FeatureSection />

        {/* Why Choose Stellar Section */}
        <WhyChooseStellar />

      {/* FAQ Section */}
      < FAQSection />
    </main >
  );
}

function HighlightCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#141414] border border-[#232323] rounded-2xl p-7 pb-12 flex items-start gap-4">
      <div className="w-11 h-11 bg-[#1c1010] border border-[#2a1515] rounded-lg flex items-center justify-center flex-shrink-0">
        <div className="text-red-500">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-[#808080] text-sm leading-6 mt-3">{description}</p>
      </div>
    </div>
  );
}
