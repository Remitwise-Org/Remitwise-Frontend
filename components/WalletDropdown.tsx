'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Copy,
  User,
  Settings,
  LogOut,
  Loader2,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useOnClickOutside } from '../lib/hooks/useOnClickOutside';
import { cn } from '@/lib/utils';
import {
  getExplorerAccountUrl,
  networkDotClass,
  truncateAddress,
} from '@/lib/utils/walletAddress';

interface WalletDropdownProps {
  isOpen: boolean;
  isConnected: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCopyAddress: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  walletAddress?: string;
  network?: string;
  isConnecting?: boolean;
  copied?: boolean;
  onAnnounce?: (message: string) => void;
}

/**
 * Selector for all focusable menu items (buttons/links with role="menuitem").
 * Used for arrow-key navigation within the dropdown.
 */
const MENUITEM_SELECTOR = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';

const menuItemClass =
  'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40';

export default function WalletDropdown({
  isOpen,
  isConnected,
  onClose,
  onConnect,
  onDisconnect,
  onCopyAddress,
  buttonRef,
  walletAddress = '',
  network = 'Testnet',
  isConnecting = false,
  copied = false,
  onAnnounce,
}: WalletDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Soft dismiss: outside click (no hard focus trap — Tab may leave the menu).
  useOnClickOutside(dropdownRef, onClose, {
    enabled: isOpen,
    ignoreRef: buttonRef as React.RefObject<HTMLElement>,
  });

  const getMenuItems = useCallback(() => {
    if (!dropdownRef.current) return [];
    return Array.from(
      dropdownRef.current.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR),
    );
  }, []);

  // Escape + arrow keys + Tab edge close (design §4)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      const items = getMenuItems();
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (event.key === 'Tab') {
        if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
          event.preventDefault();
          onClose();
          return;
        }
        if (!event.shiftKey && currentIndex === items.length - 1) {
          event.preventDefault();
          onClose();
          return;
        }
        return;
      }

      if (
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'Home' &&
        event.key !== 'End' &&
        event.key !== 'PageDown' &&
        event.key !== 'PageUp'
      ) {
        return;
      }

      let nextIndex: number;
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          break;
        case 'Home':
        case 'PageUp':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
        case 'PageDown':
          event.preventDefault();
          nextIndex = items.length - 1;
          break;
        default:
          return;
      }

      items[nextIndex]?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, getMenuItems]);

  // Initial focus on first menuitem
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const delay = prefersReducedMotion ? 0 : 50;
    const timer = window.setTimeout(() => {
      getMenuItems()[0]?.focus();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isOpen, prefersReducedMotion, getMenuItems]);

  if (!isOpen) return null;

  const motionClass = prefersReducedMotion ? '' : 'transition-all duration-200';
  const truncated = truncateAddress(walletAddress);
  const explorerUrl = getExplorerAccountUrl(walletAddress, network);

  const handleDisconnect = () => {
    onAnnounce?.('Wallet disconnected');
    onDisconnect();
  };

  return (
    <>
      {/* Mobile backdrop for bottom-sheet presentation */}
      <div
        className="fixed inset-0 z-40 bg-black/50 sm:hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        ref={dropdownRef}
        id="wallet-dropdown-menu"
        className={cn(
          'z-50 overflow-hidden border border-white/10 bg-[#111111] shadow-[0_20px_60px_rgba(0,0,0,0.35)]',
          // Mobile: full-width bottom sheet · Desktop: 240px anchored panel
          'fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl',
          'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-60 sm:max-h-none sm:rounded-2xl',
          motionClass,
        )}
        role="menu"
        aria-label={isConnected ? 'Wallet account menu' : 'Connect wallet menu'}
        aria-orientation="vertical"
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-red/15">
              <Image
                src="/logo-icon.svg"
                width={24}
                height={24}
                alt=""
                className="h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white" id="wallet-dropdown-title">
                {isConnected ? 'Wallet connected' : 'Connect your wallet'}
              </p>
              <p className="mt-1 text-xs leading-snug text-gray-400">
                {isConnected
                  ? 'Manage your account, copy your address, or disconnect.'
                  : 'Connect a Stellar wallet to send money and access your dashboard.'}
              </p>
            </div>
          </div>

          {isConnected && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
              <span
                className={cn(
                  'h-2.5 w-2.5 flex-shrink-0 rounded-full',
                  networkDotClass(network),
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-mono text-sm font-semibold text-white"
                  title={walletAddress}
                >
                  {truncated}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  {network}
                </p>
              </div>
              <button
                type="button"
                onClick={onCopyAddress}
                className={cn(
                  'inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50',
                  motionClass,
                )}
                aria-label={copied ? 'Address copied' : 'Copy full wallet address'}
                title={copied ? 'Copied!' : 'Copy address'}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-0.5 p-2">
          {isConnected ? (
            <>
              {/* 1. Account */}
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={onClose}
                className={cn(menuItemClass, motionClass)}
              >
                <User className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />
                <span className="font-medium">Account</span>
              </Link>

              {/* 2. Settings */}
              <Link
                href="/settings"
                role="menuitem"
                onClick={onClose}
                className={cn(menuItemClass, motionClass)}
              >
                <Settings className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />
                <span className="font-medium">Wallet settings</span>
              </Link>

              {/* 3. Copy address */}
              <button
                type="button"
                role="menuitem"
                onClick={onCopyAddress}
                className={cn(menuItemClass, motionClass)}
              >
                <Copy className="h-5 w-5 flex-shrink-0 text-gray-300" aria-hidden="true" />
                <span className="font-medium">
                  {copied ? 'Copied!' : 'Copy address'}
                </span>
              </button>

              {/* 4. View on explorer */}
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={onClose}
                  className={cn(menuItemClass, motionClass)}
                >
                  <ExternalLink
                    className="h-5 w-5 flex-shrink-0 text-gray-300"
                    aria-hidden="true"
                  />
                  <span className="font-medium">View on explorer</span>
                </a>
              ) : null}

              <div className="my-1 border-t border-white/10" role="separator" />

              {/* 5. Disconnect */}
              <button
                type="button"
                role="menuitem"
                onClick={handleDisconnect}
                className={cn(
                  menuItemClass,
                  'text-rose-200 hover:bg-rose-500/15 focus-visible:ring-rose-400',
                  motionClass,
                )}
              >
                <LogOut className="h-5 w-5 flex-shrink-0 text-rose-200" aria-hidden="true" />
                <span className="font-semibold text-rose-100">Disconnect</span>
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                <p className="font-medium text-white">No wallet connected</p>
                <p className="mt-1 text-xs text-gray-400">
                  Connect a supported Stellar wallet before you can send money or
                  view your dashboard.
                </p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={onConnect}
                disabled={isConnecting}
                aria-busy={isConnecting}
                className={cn(
                  'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red px-4 py-3 text-sm font-semibold text-white hover:bg-brand-redHover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 disabled:cursor-not-allowed disabled:opacity-60',
                  motionClass,
                )}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </>
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-3 text-xs text-gray-500">
          {isConnected
            ? 'Connection is managed by your browser wallet extension.'
            : 'Need help? Install Freighter or another Stellar wallet to connect safely.'}
        </div>
      </div>
    </>
  );
}
