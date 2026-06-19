"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Send, LayoutDashboard, FileText, Shield, Users, Settings, Wallet, X, Command } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "routes" | "actions";
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { t } = useClientTranslator();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Routes
    {
      id: "send",
      label: "Send Money",
      description: "Send money to recipients",
      icon: <Send className="w-4 h-4" />,
      action: () => router.push("/send"),
      category: "routes",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      description: "View your dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => router.push("/dashboard"),
      category: "routes",
    },
    {
      id: "bills",
      label: "Bills",
      description: "Manage your bills",
      icon: <FileText className="w-4 h-4" />,
      action: () => router.push("/bills"),
      category: "routes",
    },
    {
      id: "insurance",
      label: "Insurance",
      description: "View insurance policies",
      icon: <Shield className="w-4 h-4" />,
      action: () => router.push("/insurance"),
      category: "routes",
    },
    {
      id: "family",
      label: "Family",
      description: "Manage family members",
      icon: <Users className="w-4 h-4" />,
      action: () => router.push("/family"),
      category: "routes",
    },
    {
      id: "settings",
      label: "Settings",
      description: "Configure your settings",
      icon: <Settings className="w-4 h-4" />,
      action: () => router.push("/settings"),
      category: "routes",
    },
    // Quick Actions
    {
      id: "connect-wallet",
      label: "Connect Wallet",
      description: "Connect your wallet",
      icon: <Wallet className="w-4 h-4" />,
      action: () => {
        // Trigger wallet connection
        setIsOpen(false);
      },
      category: "actions",
    },
  ];

  const filteredCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const routes = filteredCommands.filter((c) => c.category === "routes");
  const actions = filteredCommands.filter((c) => c.category === "actions");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape to close
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
      // Arrow keys to navigate
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        }
        // Enter to execute
        if (e.key === "Enter" && filteredCommands[selectedIndex]) {
          e.preventDefault();
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleCommandClick = (command: CommandItem) => {
    command.action();
    setIsOpen(false);
    setSearchQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div
        ref={containerRef}
        className="relative w-full max-w-2xl mx-4 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Command List */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No commands found
            </div>
          ) : (
            <>
              {routes.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Routes
                  </div>
                  {routes.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={() => handleCommandClick(command)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="p-2 bg-white/5 rounded-lg">{command.icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{command.label}</div>
                        {command.description && (
                          <div className="text-xs text-gray-500">{command.description}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {actions.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quick Actions
                  </div>
                  {actions.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={() => handleCommandClick(command)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        routes.length + index === selectedIndex
                          ? "bg-white/10 text-white"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      <div className="p-2 bg-white/5 rounded-lg">{command.icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{command.label}</div>
                        {command.description && (
                          <div className="text-xs text-gray-500">{command.description}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↑↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↵</kbd>
              <span>to select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
              <Command className="w-3 h-3" />
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">K</kbd>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
