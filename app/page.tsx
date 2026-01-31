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
      {/* Hero Section */}
      <Hero/>

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
      <FAQSection />
    </main>
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
