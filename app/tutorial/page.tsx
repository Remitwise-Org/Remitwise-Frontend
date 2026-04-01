import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import TutorialList from "../../components/tutorials/TutorialList";

export default function TutorialPage() {
  const tutorials = [
    {
      id: "getting-started",
      title: "Getting Started with RemitWise",
      description:
        "Learn the basics of sending money and managing your account",
      duration: "5 min",
      progress: 0,
    },
    {
      id: "family-wallets",
      title: "Setting Up Family Wallets",
      description:
        "Connect and manage family member wallets for easy transfers",
      duration: "3 min",
      progress: 20,
    },
    {
      id: "savings-goals",
      title: "Creating Savings Goals",
      description: "Set up and track your financial goals with RemitWise",
      duration: "4 min",
      progress: 60,
    },
    {
      id: "emergency-transfers",
      title: "Emergency Transfers",
      description: "How to use emergency transfer for urgent situations",
      duration: "2 min",
      progress: 0,
    },
    {
      id: "bill-payments",
      title: "Bill Payments",
      description: "Pay bills directly from your RemitWise wallet",
      duration: "3 min",
      progress: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-bg1">
      {/* Header */}
      <header className="bg-transparent shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-foreground hover:text-muted"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Tutorials</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Learn How to Use RemitWise
          </h2>
          <p className="text-muted">
            Watch our step-by-step tutorials to get the most out of RemitWise
          </p>
        </div>

        <TutorialList tutorials={tutorials} />

        <div className="mt-12 bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-8 border border-border">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-brand-red rounded-full">
              <BookOpen className="w-8 h-8 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Need More Help?
              </h3>
              <p className="text-muted mb-4">
                Visit our help center for detailed guides, FAQs, and support
                resources.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-brand-red hover:bg-red-700 text-foreground font-semibold rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
