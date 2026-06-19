import { Link } from "wouter";
import { ArrowRight, Shield, Zap, Globe } from "lucide-react";

const highlights = [
  {
    icon: Shield,
    label: "Bank-Level Security",
  },
  {
    icon: Zap,
    label: "3-5 Second Transfers",
  },
  {
    icon: Globe,
    label: "150+ Countries",
  },
];

const FinalCallToAction = () => {
  return (
    <section className="relative w-full overflow-hidden bg-black py-20">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-8 lg:px-0 lg: py-10">
        <div className="relative flex justify-center lg:px-12">
          <div className="relative w-full max-w-[894px]">
            <div className="pointer-events-none absolute left-0 top-1/2 z-0 h-[250px] w-[250px] -translate-x-[calc(50%+95px)] -translate-y-[calc(50%+70px)] rounded-[1172.35px] border-[23px] border-[#DC2626] opacity-60" />
            <div className="pointer-events-none absolute right-0 top-1/2 z-0 h-[250px] w-[250px] translate-x-[calc(50%+95px)] -translate-y-[calc(50%+(-70px)] rounded-[1172.35px] border-[23px] border-[#DC2626] opacity-60" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-500/20 opacity-50" />

            <div className="relative z-10 w-full rounded-3xl border border-red-500/20 bg-gradient-to-b from-[#1a0b0b]/80 via-[#120707]/85 to-[#0b0606]/90 px-6 py-12 text-center text-white shadow-[0_0_40px_rgba(220,38,38,0.15)] sm:px-10 sm:py-14">
              <h2 className="mt-8 text-4xl font-semibold leading-tight lg:font-bold lg:text-6xl">
                Ready to Transform Your
                <span className="block text-[#DC2626]">
                  Family&apos;s Future<span className="text-white">?</span>
                </span>
              </h2>
              <p className="mx-auto mt-10 max-w-2xl text-md text-white/70 lg:text-[20px] lg:font-normal lg:leading-8 lg:tracking-[-0.45px]">
                Join 120,000+ families building financial security with
                RemitWise. <br />
                Smart remittances that save, protect, and grow.
              </p>

              <div className="mt-12 mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-[62px] w-[262.71875px] lg:w-[262.71875px] items-center justify-center gap-2 rounded-[10px] bg-[#DC2626] text-[20px] leading-[30px] tracking-[-0.45px] font-bold text-white transition hover:bg-red-500"
                >
                  Get Started Free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex h-[61px] w-[262.71875px] lg:w-[228.3828125px] items-center justify-center rounded-[10px] border border-[#FFFFFF3B] bg-white/5 font-semibold text-lg leading-[27px] tracking-[-0.44px] text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  Schedule a Demo
                </Link>
              </div>

              <div className="mx-auto mt-10 h-px w-full max-w-4xl bg-white/10" />

              <div className="mt-10 flex flex-col items-center justify-center gap-6 text-sm text-white/50 sm:flex-row">
                {highlights.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={16} className="text-[#dc2626]" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCallToAction;
