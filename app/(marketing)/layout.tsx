import Footer from "@/components/footer";
import FinalCallToAction from "@/components/FinalCallToAction";
import Header from "@/components/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pt-20">
        {children}
      </main>
      <FinalCallToAction />
      <Footer />
    </>
  );
}
