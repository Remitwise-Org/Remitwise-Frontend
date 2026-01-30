"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Bell,
  Globe,
  ShieldCheck,
  Info,
  LogOut,
  CreditCard,
  MessageSquare,
  FileText,
  Lock,
  Clock,
  CheckCircle,
  Zap,
  AlertCircle,
  Languages,
  Moon,
  ChevronDown,
} from "lucide-react";
import SettingsSection from "@/components/SettingsSection";
import SettingsItem from "@/components/SettingsItem";
import SettingsHeader from "@/components/SettingsHeader";
import PreferencesRow from "@/components/PreferencesRow";

export default function SettingsPage() {
  // Mock state for settings
  const [notifications, setNotifications] = useState({
    billReminders: true,
    paymentConfirmations: true,
    goalUpdates: false,
    securityAlerts: true,
  });

  const [security, setSecurity] = useState({
    transactionSigning: true,
  });

  const [currency, setCurrency] = useState("USD");

  const stellarAddress = "GCF2...7P3Q";

  return (
<main className="w-full min-h-screen bg-[#0F0F0F] md:px-[171.5px] px-[16px] font-inter">
  <SettingsHeader />

      <div className="w-full py-6">
        {/* Account Section */}
        <SettingsSection title="Account">
          <SettingsItem
            icon={<Wallet className="w-5 h-5" />}
            title="Stellar Address"
            description="Connected Wallet"
            type="text"
            value={stellarAddress}
          />
          <SettingsItem
            icon={<CreditCard className="w-5 h-5" />}
            title="Wallet Status"
            description="Connected via Freighter"
            type="navigation"
          />
          <SettingsItem
            icon={<LogOut className="w-5 h-5 text-red-500" />}
            title="Change Wallet"
            onClick={() => console.log("Change wallet")}
          />
        </SettingsSection>

        {/* Notifications Section */}
        <div className="mb-8 bg-[#010101] p-4">
          {/* Section header (matches your sample UI) */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center bg-[#DC262633] w-[40px] h-[40px] rounded-[14px]">
                <Bell className="w-[20px] h-[20px] text-[#DC2626]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#FFFFFF]">
                  Notifications
                </h2>
                <p className="text-[#FFFFFF80] text-[12px] -mt-1">
                  Manage alert preferences
                </p>
              </div>
            </div>
          </div>

          {/* Dark card list */}
          <SettingsSection title="" variant="dark-card">
            <SettingsItem
              variant="notification-row"
              divider
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
              variant="notification-row"
              divider
              icon={<CheckCircle className="w-5 h-5" />}
              title="Payment Confirmations"
              description="Receive transaction confirmations"
              type="toggle"
              enabled={notifications.paymentConfirmations}
              onToggle={(val) =>
                setNotifications({
                  ...notifications,
                  paymentConfirmations: val,
                })
              }
            />
            <SettingsItem
              variant="notification-row"
              divider
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
              variant="notification-row"
              icon={<AlertCircle className="w-5 h-5" />}
              title="Security Alerts"
              description="Important security notifications"
              type="toggle"
              enabled={notifications.securityAlerts}
              onToggle={(val) =>
                setNotifications({ ...notifications, securityAlerts: val })
              }
            />
          </SettingsSection>

          {/* <div className="px-4 mt-4 text-center">
            <p className="text-gray-500 text-xs">
              Notification preferences are saved locally and will persist across
              sessions.
            </p>
          </div> */}
        </div>

        {/* Preferences Section */}
        {/* Preferences Section - Custom Dark Theme Implementation */}
        <div className="bg-black p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-10 w-10 flex items-center justify-center bg-[#DC262633] rounded-xl">
              <Globe className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Preferences</h2>
              <p className="text-sm text-gray-400">Customize your experience</p>
            </div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#FFFFFF14] rounded-3xl overflow-hidden">
            {/* Currency Row */}
            <PreferencesRow
              icon={<span className="text-xl">$</span>}
              title="Currency Display"
              subtitle="Default currency for amounts"
              rightContent={
                <div className="relative">
                  <select
                    className="w-full bg-[#FFFFFF0D] text-white text-sm rounded-lg px-4 py-2 pr-8 appearance-none border border-zinc-800 focus:outline-none focus:border-[#FF4500]"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronDown className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              }
            />

            {/* Language Row */}
            <PreferencesRow
              icon={<Languages className="w-5 h-5" />}
              title={
                <div className="flex items-center justify-between w-full">
                  <span className="text-white text-[14px] md:text-[16px]">Language</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-[#DC2626] border border-[#DC262633] bg-[#DC26261A] rounded-full uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
              }
              subtitle="App display language"
              rightContent={
                <div className="relative w-full">
                  <select
                    className="w-full bg-[#FFFFFF0D] text-gray-500 text-sm rounded-lg px-4 py-2 pr-8 appearance-none border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                    defaultValue="English"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronDown className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              }
            />

            {/* Theme Row */}
            <PreferencesRow
              icon={<Moon className="w-5 h-5" />}
              title={
                <div className="flex items-center justify-between w-full">
                  <span>Theme</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold text-[#DC2626] border border-[#DC262633] bg-[#DC26261A] rounded-full uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
              }
              subtitle="Visual appearance"
              rightContent={
                <div className="relative w-full">
                  <select
                    className="w-full bg-[#FFFFFF0D] text-gray-500 text-sm rounded-lg px-4 py-2 pr-8 appearance-none border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                    defaultValue="Dark"
                  >
                    <option>Dark</option>
                    <option>Light</option>
                    <option>System</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <ChevronDown className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* Security Section */}
        <SettingsSection title="Security">
          <SettingsItem
            icon={<Lock className="w-5 h-5" />}
            title="Transaction Signing"
            description="Always ask for signature"
            type="toggle"
            enabled={security.transactionSigning}
            onToggle={(val) =>
              setSecurity({ ...security, transactionSigning: val })
            }
          />
          <SettingsItem
            icon={<Clock className="w-5 h-5" />}
            title="Session Timeout"
            description="Automatically log out after inactivity"
            type="text"
            value="30 minutes"
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsItem
            icon={<Info className="w-5 h-5" />}
            title="App Version"
            type="text"
            value="v1.0.4-alpha"
          />
          <SettingsItem
            icon={<FileText className="w-5 h-5" />}
            title="Terms of Service"
            type="navigation"
          />
          <SettingsItem
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Privacy Policy"
            type="navigation"
          />
          <SettingsItem
            icon={<MessageSquare className="w-5 h-5" />}
            title="Support"
            type="navigation"
          />
        </SettingsSection>
      </div>
    </main>
  );
}
