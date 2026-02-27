"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        question: "What is this platform used for?",
        answer:
            "Our platform is designed to help you manage your finances, send remittances, and plan for your future with ease. It combines secure transactions with smart financial tools.",
    },
    {
        question: "What happens if I hit my free generation limit?",
        answer:
            "If you reach your limit, you can upgrade your plan or wait for the next billing cycle for your limit to reset. We offer flexible tiers to suit your needs.",
    },
    {
        question: "Do I need design experience to use it?",
        answer:
            "No, absolutely not! Our platform is user-friendly and intuitive, designed for everyone regardless of their technical or design background.",
    },
    {
        question: "Can I collaborate with my team?",
        answer:
            "Yes, our family wallet and shared features allow you to collaborate on financial goals and manage expenses together seamlessly.",
    },
    {
        question: "Is it really free to use?",
        answer:
            "We offer a generous free tier that includes many essential features. For advanced capabilities and higher limits, we have premium plans available.",
    },
];

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="relative bg-black py-24 overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute top-1/2 -left-[150px] w-[300px] h-[300px] border-[23px] border-[#DC2626] rounded-full transform -translate-y-1/2 pointer-events-none opacity-50" />
            <div className="absolute top-1/2 -right-[150px] w-[300px] h-[300px] border-[23px] border-[#DC2626] rounded-full transform -translate-y-1/2 pointer-events-none opacity-50" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                        Frequently Asked <span className="text-[#DC2626]">Questions</span>
                    </h2>
                    <p className="text-white/60 max-w-xl mx-auto text-base font-regular">
                        Got questions? We&apos;ve got answers. Find everything you need to know
                        about using our platform, plans, and features.
                    </p>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                    {faqData.map((item, index) => (
                        <div
                            key={index}
                            className="bg-[#0A0A0ACC] border border-[#FFFFFF14] rounded-xl overflow-hidden transition-all duration-300"
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full flex items-center justify-between p-5 text-left bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors focus:outline-none"
                                aria-expanded={openIndex === index}
                            >
                                <span className="text-white font-medium text-lg">
                                    {item.question}
                                </span>
                                <ChevronDown
                                    className={`w-5 h-5 text-white transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""
                                        }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                    }`}
                            >
                                <div className="p-5 pt-0 text-gray-400 leading-relaxed">
                                    {item.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
