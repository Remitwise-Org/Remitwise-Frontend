'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { Wallet, ChevronDown, Copy, Check } from 'lucide-react';
import WalletDropdown from './WalletDropdown';
import { logout } from '@/lib/client/logout';
import { useWallet } from 'stellar-wallet-kit';
import { cn } from '@/lib/utils';
import {
  networkDotClass,
  truncateAddress,
} from '@/lib/utils/walletAddress';

const COPY_FEEDBACK_MS = 2000;

const WalletButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const { account, isConnected: connected, connect, disconnect, network } =
    useWallet();
  const address = account?.address ?? '';
  const truncated = truncateAddress(address);
  const networkLabel = network || 'Testnet';

  useEffect(() => {
    return () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    // Focus return to trigger (design/wallet-dropdown-states.md §4)
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const announce = useCallback((message: string) => {
    setStatusMessage(message);
  }, []);

  const toggleOpen = () => setIsOpen((value) => !value);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
      setIsOpen(false);
      buttonRef.current?.focus();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setIsOpen(false);
    announce('Wallet disconnected');
    await logout();
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  };

  const handleCopyAddress = async (
    event?: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();
    event?.preventDefault();
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      announce('Wallet address copied to clipboard');
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopied(false);
        setStatusMessage('');
      }, COPY_FEEDBACK_MS);
    } catch {
      announce('Unable to copy wallet address');
    }
  };

  return (
    <div className="relative">
      {connected ? (
        <div
          className={cn(
            'wallet--connected inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/5 shadow-sm',
            'h-11 375:h-9',
          )}
          role="group"
          aria-label={`Connected wallet ${truncated}`}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleOpen}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls="wallet-dropdown-menu"
            aria-label={`Wallet options for ${truncated}`}
            className="wallet-trigger touch-target inline-flex h-full items-center gap-2 rounded-l-full py-0 pl-3 pr-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark"
          >
            <span
              className={cn(
                'h-2 w-2 flex-shrink-0 rounded-full',
                networkDotClass(networkLabel),
              )}
              title={networkLabel}
              aria-hidden="true"
            />
            <span className="hidden max-w-[8.5rem] truncate font-mono text-sm font-semibold tracking-tight 375:inline">
              {truncated}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 flex-shrink-0 text-white/80 transition-transform',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>

          <span className="h-4 w-px flex-shrink-0 bg-white/10" aria-hidden="true" />

          <button
            type="button"
            onClick={handleCopyAddress}
            title={copied ? 'Copied!' : 'Copy address'}
            aria-label={copied ? 'Address copied' : 'Copy full wallet address'}
            className="relative inline-flex h-full w-9 flex-shrink-0 items-center justify-center rounded-r-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            <span
              className={cn(
                'pointer-events-none absolute -bottom-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity',
                copied && 'opacity-100',
              )}
              aria-hidden="true"
            >
              Copied!
            </span>
          </button>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls="wallet-dropdown-menu"
          aria-label="Connect wallet"
          className={cn(
            'wallet--disconnected wallet-trigger touch-target inline-flex max-w-full items-center justify-center gap-2 rounded-full',
            'h-11 bg-gradient-to-r from-brand-red to-brand-redHover px-4 text-sm font-semibold text-white',
            'shadow-[0_0_24px_rgba(215,35,35,0.24)] transition-all duration-200 hover:opacity-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark',
            '375:h-9 375:px-4',
          )}
        >
          <Wallet className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="hidden 375:inline">Connect Wallet</span>
          <ChevronDown
            className={cn(
              'hidden h-4 w-4 flex-shrink-0 transition-transform 375:block',
              isOpen && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      )}

      <WalletDropdown
        isOpen={isOpen}
        isConnected={connected}
        isConnecting={isConnecting}
        walletAddress={address}
        network={networkLabel}
        buttonRef={buttonRef}
        onClose={closeDropdown}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onCopyAddress={() => {
          void handleCopyAddress();
        }}
        copied={copied}
        onAnnounce={announce}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
};

export default WalletButton;
