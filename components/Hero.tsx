import Link from "next/link";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative flex min-h-[600px] md:min-h-[800px] w-full pt-20 md:pt-32 justify-center overflow-hidden px-4 sm:px-6">
      {/* Dark warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a0a] via-[#2d1510] to-[#0a0a0a]" />
      
      {/* Warm accent gradient overlay */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#DC2626]/10 to-transparent rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-tl from-[#8B4513]/5 to-transparent rounded-full blur-3xl opacity-30" />

      <div className="relative z-10 mx-auto w-full max-w-[1143px] text-center">
        {/* Social proof badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center -space-x-2">
              {[
                "/avatars/image1.png",
                "/avatars/image2.jpg",
                "/avatars/image3.jpg",
                "/avatars/image4.jpg",
              ].map((src, i) => (
                <div
                  key={i}
                  className="relative h-6 w-6 overflow-hidden rounded-full border border-white/20 bg-gray-800"
                >
                  <Image
                    src={src}
                    alt="User"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-gray-300">120K+ families trust RemitWise</span>
          </div>
        </div>

        {/* Main Headline - Clear value proposition */}
        <h1 className="mx-auto font-bold text-center text-white text-[44px] sm:text-[56px] md:text-[72px] leading-[52px] sm:leading-[64px] md:leading-[84px] w-full max-w-[1000px] tracking-tight">
          Global Payments
          <br />
          <span className="bg-gradient-to-r from-[#DC2626] to-[#FF6B35] bg-clip-text text-transparent">
            Without Borders
          </span>
        </h1>

        {/* Subheadline - Concise, benefit-focused */}
        <div className="mx-auto mt-6 w-full max-w-[700px] px-4">
          <p className="font-normal text-center text-gray-300 text-[16px] sm:text-[18px] md:text-[20px] leading-[26px] sm:leading-[28px] md:leading-[32px]">
            Send money instantly across borders with zero hassle. Smart allocation, automatic savings, and comprehensive protection—all on the secure Stellar network.
          </p>
        </div>

        {/* CTA Section - Primary + Secondary hierarchy */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-4 sm:gap-5 items-center">
          {/* Primary CTA */}
          <Link
            href="/send"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-8 py-4 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-red-600/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black"
          >
            <LightningBoltIcon className="w-5 h-5" />
            Send Money Now
          </Link>

          {/* Secondary CTA */}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/20 px-8 py-4 font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-black"
          >
            View Dashboard
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-400 md:gap-12">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Instant Settlement</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>AES-256 Security</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </section>
  );
}
