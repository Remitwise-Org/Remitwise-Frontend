"use client";

import React from "react";
import { Check } from "lucide-react";

interface PricingFeature {
  text: string;
}

interface PricingPlan {
  name: string;
  price: string;
  description: string;
  buttonText: string;
  features: PricingFeature[];
  highlighted?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Basic",
    price: "$0",
    description: "Perfect for individuals sending occasional remittances",
    buttonText: "Start Free",
    features: [
      { text: "Up to 5 transfers/month" },
      { text: "Basic money split" },
      { text: "Standard support" },
      { text: "1% transaction fee" },
    ],
  },
  {
    name: "Pro",
    price: "$7",
    description: "Best for families with regular remittance needs",
    buttonText: "Get Started",
    highlighted: true,
    features: [
      { text: "Unlimited transfers" },
      { text: "Smart allocation rules" },
      { text: "Savings goals & tracking" },
      { text: "Bill payment automation" },
      { text: "Priority support" },
      { text: "0.5% transaction fee" },
    ],
  },
  {
    name: "Enterprise",
    price: "$37",
    description: "Advanced features for families and businesses",
    buttonText: "Contact Sales",
    features: [
      { text: "Everything in Pro" },
      { text: "Family wallets & permissions" },
      { text: "Micro-insurance coverage" },
      { text: "Dedicated account manager" },
      { text: "API access" },
      { text: "0.3% transaction fee" },
    ],
  },
];

const PricingCard: React.FC<{ plan: PricingPlan }> = ({ plan }) => {
  const isHighlighted = plan.highlighted;

  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col h-full transition-all duration-300 ${
        isHighlighted
          ? "bg-[#DC2626] border-2 border-[#DC2626]"
          : "bg-bg1 border border-border hover:border-red-600/30"
      }`}
    >
      {/* Plan Name */}
      <h3
        className={`text-xl font-semibold mb-6 ${
          isHighlighted ? "text-white" : "text-white"
        }`}
      >
        {plan.name}
      </h3>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-2">
        <span
          className={`text-5xl font-bold ${
            isHighlighted ? "text-white" : "text-white"
          }`}
        >
          {plan.price}
        </span>
        <span
          className={`text-lg ${
            isHighlighted ? "text-white/80" : "text-gray-500"
          }`}
        >
          /{" "}
          <span
            className={`text-sm relative top-5 ${
              isHighlighted ? "text-white/80" : "text-gray-500"
            }`}
          >
            month
          </span>
        </span>
      </div>

      {/* Description */}
      <p
        className={`text-sm mt-2 mb-8 max-w-[250px] ${
          isHighlighted ? "text-white/90" : "text-gray-400"
        }`}
      >
        {plan.description}
      </p>

      {/* Button */}
      <button
        className={`w-full py-4 px-6 rounded-xl font-semibold text-base transition-all duration-300 mb-8 ${
          isHighlighted
            ? "bg-white text-[#DC2626] hover:bg-gray-100"
            : "bg-[#1F1F1F] text-white border border-[#333] hover:bg-[#2a2a2a] hover:border-[#444]"
        }`}
      >
        {plan.buttonText}
      </button>

      {/* Features */}
      <ul className="space-y-4 flex-grow">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 mt-0.5 ${
                isHighlighted ? "text-white" : "text-[#DC2626]"
              }`}
            >
              <Check size={18} strokeWidth={3} />
            </div>
            <span
              className={`text-sm ${
                isHighlighted ? "text-white" : "text-gray-300"
              }`}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PricingSection: React.FC = () => {
  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Choose the Plan{" "}
            <span className="text-[#DC2626]">That&apos;s Right for You</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base md:text-lg">
            Start free and scale as your family grows. All plans include our
            core remittance features with transparent pricing.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <PricingCard key={index} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
