import { LightningBoltIcon } from "@radix-ui/react-icons";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative flex min-h-[700px] md:min-h-[900px] w-full pt-24 justify-center overflow-hidden bg-black px-4 sm:px-6">
      {/* Starry background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1143px] text-center">
        {/* Social proof capsule */}
        <div className="mb-12 flex justify-center">
          <div
            className="
      flex items-center 
      w-full max-w-[370.95px] h-[64px] md:h-[75px]
      rounded-full
      px-6
      backdrop-blur-md
    "
            style={{
              background:
                "linear-gradient(180deg, rgba(220, 38, 38, 0.13) 0%, rgba(220, 38, 38, 0.04) 100%)",
              borderTop: "1px solid #FFFFFF26",
              borderLeft: "1px solid rgba(220,38,38,0.25)",
              borderRight: "1px solid rgba(220,38,38,0.25)",
              borderBottom: "1px solid rgba(220,38,38,0.25)",
            }}
          >
            {/* Avatars */}
            <div className="flex items-center -space-x-3 w-[130px] md:w-[157px] h-[36px] md:h-[41px]">
              {[
                "/avatars/image1.png",
                "/avatars/image2.jpg",
                "/avatars/image3.jpg",
                "/avatars/image4.jpg",
                "/avatars/image5.jpg",
              ].map((src, i) => (
                <div
                  key={i}
                  className="relative h-8 w-8 overflow-hidden rounded-full border border-black"
                >
                  <Image
                    src={src}
                    alt="Happy family"
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Stars + text container */}
            <div className="flex flex-col gap-[4px] w-[140px] md:w-[151.95px] h-[36px] md:h-[39.76px] -ml-[6px] md:-ml-[10px]">
              <div className="flex items-center gap-[2px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="#DC2626"
                    opacity="1"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.5l1.2-6.5-4.8-4.6 6.6-.9L12 2.5z" />
                  </svg>
                ))}
              </div>

              <span className=" relative mt-1 w-[154px] h-[22px] text-s font-medium text-gray-300 whitespace-nowrap "
                style={{ top: "-0.5px" }}>
                120K+ happy families
              </span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className=" mx-auto font-inter font-bold text-center text-white text-[40px] sm:text-[56px] md:text-[80px] leading-[48px] sm:leading-[64px] md:leading-[88px] w-full max-w-[957px] ">
          Smart Remittance & <br />
          <span className="text-[#DC2626]">Financial Planning</span>
        </h1>

        {/* Subheadline */}
        <div className="mx-auto mt-6 w-full max-w-[681px] flex items-center justify-center px-4">
          <p className=" font-inter font-normal text-center text-gray-300 text-[16px] sm:text-[18px] md:text-[22px] leading-[26px] sm:leading-[30px] md:leading-[33px] tracking-[-0.26px] w-full md:w-[627px] ">
            Our Stellar-powered platform empowers families to save,
            <span className="hidden md:inline"><br /></span>
            plan, and protect—going beyond simple money transfers to
            <span className="hidden md:inline"><br /></span>
            build long-term financial security.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-6 py-3 font-medium text-white transition hover:bg-red-700"
          >
            <LightningBoltIcon />
            Get Started
          </a>

          <a
            href="#details"
            className="rounded-lg border border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10"
          >
            See Details
          </a>
        </div>
      </div>
    </section>
  );
}
