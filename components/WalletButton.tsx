'use client';

import { useRef, useState } from 'react';
import { Wallet, ChevronDown } from 'lucide-react';
import WalletDropdown from './WalletDropdown';
import { logout } from '@/lib/client/logout';
import { useWallet } from 'stellar-wallet-kit';
import { useToast } from '@/lib/context/ToastContext';

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const WalletButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { account, isConnected: connected, connect, disconnect, network } = useWallet();
  const address = account?.address ?? '';
  const { toast } = useToast();

  const closeDropdown = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
      setIsOpen(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={connected ? `Wallet ${truncateAddress(address || '')}` : 'Connect wallet'}
        className={`touch-target flex max-w-full items-center justify-center gap-2 rounded-full px-3 py-2 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:ring-offset-2 focus:ring-offset-transparent 375:px-4 ${
          connected
            ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
            : 'bg-gradient-to-r from-brand-red to-[#B01C1C] text-white shadow-[0_0_24px_rgba(215,35,35,0.24)] hover:opacity-95'
        }`}
      >
        <Wallet className="h-4 w-4 flex-shrink-0 text-current" />
        <span className="hidden max-w-[7rem] truncate font-medium text-sm 375:inline">
          {connected ? truncateAddress(address || '') : 'Connect Wallet'}
        </span>
        {connected && (
          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
            {network || 'Testnet'}
          </span>
        )}
        <ChevronDown
          className={`hidden h-4 w-4 flex-shrink-0 text-white transition-transform 375:block ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <WalletDropdown
        isOpen={isOpen}
        isConnected={connected}
        isConnecting={isConnecting}
        walletAddress={address || ''}
        network={network || 'Testnet'}
        buttonRef={buttonRef}
        onClose={closeDropdown}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default WalletButton;
