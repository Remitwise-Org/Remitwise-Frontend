"use client";

const GlobeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-full h-full"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M12 2v20" />
  </svg>
);

const ValueProposition = () => {
  return (
    <section className="max-w-7xl mx-auto bg-brand-dark py-24 px-6">
      <div className="mx-auto flex flex-col text-left md:flex-row items-start gap-8">
        {/* Left: Icon */}
        <div className="flex-shrink-0 w-24 h-24 bg-[#1a0a0a] border border-[#331111] rounded-[2rem] flex items-center justify-center text-brand-red shadow-2xl shadow-brand-red/5">
          <div className="w-12 h-12">
            <GlobeIcon />
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-grow">
          {/* Headline */}
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
            <span className="block text-white">Designed for Families.</span>
            <span className="block text-brand-red">Powered by Stellar.</span>
          </h2>

          {/* Body */}
          <p className="text-[#808080] text-xl md:text-2xl leading-relaxed max-w-2xl">
            RemitWise goes beyond simple money transfers. We help you build
            long-term financial security with intelligent allocation, automated
            savings, and comprehensive protection—all on the fast, secure Stellar
            blockchain.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
