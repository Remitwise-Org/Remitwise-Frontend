"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Globe,
  ShieldCheck,
  Info,
  FileText,
  Clock,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
  HelpCircle,
  DollarSign,
  Languages,
  Moon,
  CheckCircle,
} from "lucide-react";
import SettingsSection from "@/components/SettingsSection";
import SettingsItem from "@/components/SettingsItem";
import { AccountSection } from "@/components/AccountSection";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    billReminders: true,
    paymentConfirmations: true,
    goalUpdates: true,
    securityAlerts: true,
  });

  const [security, setSecurity] = useState({
    autoSignTransactions: false,
  });

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:text-white rounded-full border border-gray-700/50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Settings</h1>
              <p className="text-xs sm:text-sm text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center relative">
              <span className="text-white font-bold text-sm">R</span>
              <span className="absolute top-1.5 right-1.5 w-1 h-1 bg-white rounded-full"></span>
            </div>
            <span className="hidden sm:inline text-white font-semibold">RemitWise</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-6 px-4 pb-12">
        {/* Account Section */}
        <div className="mb-8">
          <AccountSection />
        </div>

        {/* Notifications Section */}
        <SettingsSection 
          title="Notifications" 
          subtitle="Manage alert preferences"
          icon={<Bell className="w-5 h-5" />}
        >
          <SettingsItem
            icon={<FileText className="w-5 h-5" />}
            title="Bill Reminders"
            description="Get notified before bills are due"
            type="toggle"
            enabled={notifications.billReminders}
            onToggle={(val) =>
              setNotifications({ ...notifications, billReminders: val })
            }
          />
          <SettingsItem
            icon={<CheckCircle className="w-5 h-5" />}
            title="Payment Confirmations"
            description="Receive transaction confirmations"
            type="toggle"
            enabled={notifications.paymentConfirmations}
            onToggle={(val) =>
              setNotifications({ ...notifications, paymentConfirmations: val })
            }
          />
          <SettingsItem
            icon={<Zap className="w-5 h-5" />}
            title="Goal Progress Updates"
            description="Track savings goal milestones"
            type="toggle"
            enabled={notifications.goalUpdates}
            onToggle={(val) =>
              setNotifications({ ...notifications, goalUpdates: val })
            }
          />
          <SettingsItem
            icon={<Clock className="w-5 h-5" />}
            title="Security Alerts"
            description="Important security notifications"
            type="toggle"
            enabled={notifications.securityAlerts}
            onToggle={(val) =>
              setNotifications({ ...notifications, securityAlerts: val })
            }
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection 
          title="Preferences" 
          subtitle="Customize your experience"
          icon={<Globe className="w-5 h-5" />}
        >
          <SettingsItem
            icon={<DollarSign className="w-5 h-5" />}
            title="Currency Display"
            description="Default currency for amounts"
            type="dropdown"
            hasDropdownBar
          />
          <SettingsItem
            icon={<Languages className="w-5 h-5" />}
            title="Language"
            description="App display language"
            type="dropdown"
            hasDropdownBar
            comingSoon
          />
          <SettingsItem
            icon={<Moon className="w-5 h-5" />}
            title="Theme"
            description="Visual appearance"
            type="dropdown"
            hasDropdownBar
            comingSoon
          />
        </SettingsSection>

        {/* Security Section */}
        <SettingsSection 
          title="Security" 
          subtitle="Protect your account"
          icon={<ShieldCheck className="w-5 h-5" />}
        >
          <SettingsItem
            icon={<Zap className="w-5 h-5" />}
            title="Auto-sign Transactions"
            description="Skip confirmation for small amounts"
            type="toggle"
            enabled={security.autoSignTransactions}
            onToggle={(val) =>
              setSecurity({ ...security, autoSignTransactions: val })
            }
          />
          <SettingsItem
            icon={<Clock className="w-5 h-5" />}
            title="Session Timeout"
            description="Auto logout after inactivity"
            type="dropdown"
            hasDropdownBar
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection 
          title="About" 
          subtitle="App information and support"
          icon={<Info className="w-5 h-5" />}
        >
          <SettingsItem
            icon={<Clock className="w-5 h-5" />}
            title="App Version"
            description="Current version: 1.0.0"
            type="text"
            value="v1.0.0"
            hasIconBackground
          />
          <SettingsItem
            icon={<FileText className="w-5 h-5" />}
            title="Terms of Service"
            description="Read our terms and conditions"
            type="navigation"
            rightIcon={<ExternalLink className="w-4 h-4" />}
            hasIconBackground
          />
          <SettingsItem
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Privacy Policy"
            description="How we protect your data"
            type="navigation"
            rightIcon={<ExternalLink className="w-4 h-4" />}
            hasIconBackground
          />
          <SettingsItem
            icon={<HelpCircle className="w-5 h-5" />}
            title="Help & Support"
            description="Get help with your account"
            type="navigation"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            hasIconBackground
          />
          <SettingsItem
            icon={<Mail className="w-5 h-5" />}
            title="Contact Us"
            description="support@remitwise.com"
            type="navigation"
            rightIcon={<ExternalLink className="w-4 h-4" />}
            hasIconBackground
          />
        </SettingsSection>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center space-y-1">
          <p className="text-sm text-gray-500">
            RemitWise © 2026 - All Rights Reserved
          </p>
          <p className="text-xs text-gray-600">
            Powered by Stellar Blockchain
          </p>
        </div>
      </div>
    </main>
  );
}
