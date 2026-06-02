"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Copy, Wallet, User, Settings, LogOut } from 'lucide-react';

interface WalletDropdownProps {
  isOpen: boolean;
  isConnected: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  walletAddress?: string;
  network?: string;
}

const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default function WalletDropdown({
  isOpen,
  isConnected,
  onClose,
  onConnect,
  onDisconnect,
  buttonRef,
  walletAddress = 'GDEMOXQ3D5AFX4K7IQ3XR5ZYQ2H7F4QO2N7F4R6STJHK2QMZ7CNC3',
  network = 'Testnet',
}: WalletDropdownProps) {
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef?.current && buttonRef.current.contains(target)) {
        return;
      }

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const focusableElements = dropdownRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setStatusMessage('Wallet address copied to clipboard.');
      window.setTimeout(() => {
        setCopied(false);
        setStatusMessage('');
      }, 2000);
    } catch (error) {
      setStatusMessage('Unable to copy wallet address.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-[22rem] sm:w-[24rem] bg-[#111111] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden z-50"
      role="menu"
      aria-label={isConnected ? 'Wallet account menu' : 'Connect wallet menu'}
    >
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/15 text-brand-red shadow-sm shadow-brand-red/20">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {isConnected ? 'Wallet connected' : 'Connect your wallet'}
            </p>
            <p className="mt-1 text-xs text-gray-400 leading-snug">
              {isConnected
                ? 'Your wallet is active. Tap a menu item to manage account settings.'
                : 'Connect a Stellar wallet to access remittance, savings, and account actions.'}
            </p>
          </div>
          {isConnected ? (
            <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
              {network}
            </span>
          ) : null}
        </div>

        {isConnected && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">
                  Wallet address
                </p>
                <p
                  className="mt-1 text-sm font-medium text-white truncate font-mono"
                  title={walletAddress}
                >
                  {formatAddress(walletAddress)}
                </p>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-gray-200 transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                aria-label="Copy full wallet address"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {copied ? 'Copied!' : 'Click copy to copy the full address to your clipboard.'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1 p-3">
        {isConnected ? (
          <>
            <button
              type="button"
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition-all hover:border-brand-red/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Account</span>
                <User className="h-4 w-4 text-gray-300" />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Manage wallet profile and connection details.
              </p>
            </button>

            <button
              type="button"
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white transition-all hover:border-brand-red/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-red/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Settings</span>
                <Settings className="h-4 w-4 text-gray-300" />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Update wallet preferences and network settings.
              </p>
            </button>

            <button
              type="button"
              onClick={onDisconnect}
              className="w-full rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-left text-sm text-rose-200 transition-all hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-100">Disconnect</span>
                <LogOut className="h-4 w-4 text-rose-200" />
              </div>
              <p className="mt-1 text-xs text-rose-200/80">
                Sign out and lock the wallet connection.
              </p>
            </button>
          </>
        ) : (
          <>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              <p className="font-medium text-white">No wallet connected</p>
              <p className="mt-1 text-gray-400">
                Connect a supported Stellar wallet before you can send money or view your dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={onConnect}
              className="w-full rounded-3xl bg-brand-red px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#d33a3a] focus:outline-none focus:ring-2 focus:ring-brand-red/50"
            >
              Connect Wallet
            </button>
          </>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3 text-xs text-gray-500">
        {isConnected
          ? 'Your wallet connection is managed locally by the browser wallet extension.'
          : 'Need help? Install a Stellar wallet like Freighter to connect safely.'}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
