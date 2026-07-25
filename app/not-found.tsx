import Link from "next/link";
import {
  LayoutDashboard,
  Send,
  FileText,
  Shield,
  Users,
  Settings,
  Home,
  ArrowLeft,
} from "lucide-react";

export const metadata = {
  title: "Page Not Found – RemitWise",
  description: "The page you were looking for could not be found.",
};

const primaryLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Your financial overview" },
  { name: "Send Money", href: "/send", icon: Send, description: "Transfer funds instantly" },
  { name: "Bills", href: "/bills", icon: FileText, description: "Manage bill payments" },
  { name: "Insurance", href: "/insurance", icon: Shield, description: "Your coverage policies" },
  { name: "Family", href: "/family", icon: Users, description: "Family wallet hub" },
  { name: "Settings", href: "/settings", icon: Settings, description: "Account preferences" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-dark starry-bg flex flex-col items-center justify-center px-4 py-16">
      {/* Error badge */}
      <div className="inline-flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 rounded-full px-4 py-1.5 mb-8">
        <span className="w-2 h-2 rounded-full bg-brand-red animate-neon-pulse" />
        <span className="text-brand-red text-sm font-semibold tracking-wide">404 – Page Not Found</span>
      </div>

      {/* Heading */}
      <h1 className="text-4xl sm:text-5xl font-bold text-white text-center mb-4">
        Lost in the transfer?
      </h1>
      <p className="text-white/50 text-center text-base sm:text-lg max-w-md mb-12">
        This page doesn&apos;t exist or may have moved. Use the links below to get
        back on track.
      </p>

      {/* Primary nav links */}
      <nav aria-label="Recovery navigation" className="w-full max-w-2xl mb-12">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {primaryLinks.map(({ name, href, icon: Icon, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-red/30 transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50"
              >
                <div className="p-2 rounded-xl bg-white/5 group-hover:bg-brand-red/10 transition-colors flex-shrink-0">
                  <Icon className="w-4 h-4 text-white/40 group-hover:text-brand-red transition-colors" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                    {name}
                  </span>
                  <span className="block text-xs text-white/30 mt-0.5">{description}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Go home CTA */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-red text-white text-sm font-semibold hover:bg-brand-redHover transition-colors shadow-lg shadow-brand-red/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50"
        >
          <Home className="w-4 h-4" />
          Go to Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}