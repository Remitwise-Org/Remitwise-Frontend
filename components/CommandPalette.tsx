"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Send, LayoutDashboard, FileText, Shield, Users, Settings, Wallet, X, Command, SearchCheck, Clock } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { useRecentItems } from "@/lib/hooks/useRecentItems";
import { RECENT_COMMANDS_STORAGE_KEY } from "@/lib/config/recent";

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
  
  const { items: recentCommandIds, addItem: addRecentCommandId } = useRecentItems<string>(
    RECENT_COMMANDS_STORAGE_KEY,
    5
  );

  const commands: CommandItem[] = useMemo(() => [
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
    {
      id: "search-results",
      label: "Global Search",
      description: "Search invoices, addresses, and settings",
      icon: <SearchCheck className="w-4 h-4" />,
      action: () => router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`),
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
  ], [router, searchQuery]);

  const filteredCommands = useMemo(() => commands.filter((command) =>
    command.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    command.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (command.id === "search-results" && searchQuery.trim().length > 0)
  ), [commands, searchQuery]);

  const displayedCommands = useMemo(() => {
    let recentList: CommandItem[] = [];
    let routeList = filteredCommands.filter((c) => c.category === "routes");
    let actionList = filteredCommands.filter((c) => c.category === "actions");

    if (searchQuery === "") {
      recentList = recentCommandIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is CommandItem => c !== undefined);

      const recentIds = new Set(recentList.map((c) => c.id));
      routeList = routeList.filter((c) => !recentIds.has(c.id));
      actionList = actionList.filter((c) => !recentIds.has(c.id));
    }

    return [...recentList, ...routeList, ...actionList];
  }, [filteredCommands, searchQuery, recentCommandIds, commands]);

  const handleCommandClick = useCallback((command: CommandItem) => {
    addRecentCommandId(command.id);
    command.action();
    setIsOpen(false);
    setSearchQuery("");
  }, [addRecentCommandId]);

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
          setSelectedIndex((prev) => (prev + 1) % displayedCommands.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + displayedCommands.length) % displayedCommands.length);
        }
        // Enter to execute
        if (e.key === "Enter" && displayedCommands[selectedIndex]) {
          e.preventDefault();
          handleCommandClick(displayedCommands[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, displayedCommands, selectedIndex, handleCommandClick]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        data-testid="command-palette-backdrop"
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
          {displayedCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No commands found
            </div>
          ) : (
            <>
              {recentList.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Recently Opened
                  </div>
                  {recentList.map((command, index) => (
                    <button
                      key={command.id}
                      data-testid="command-item"
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

              {routeList.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Routes
                  </div>
                  {routeList.map((command, index) => (
                    <button
                      key={command.id}
                      data-testid="command-item"
                      onClick={() => handleCommandClick(command)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        recentList.length + index === selectedIndex
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

              {actionList.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quick Actions
                  </div>
                  {actionList.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={() => handleCommandClick(command)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                        recentList.length + routeList.length + index === selectedIndex
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
