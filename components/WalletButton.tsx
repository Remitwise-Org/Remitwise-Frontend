'use client';

import { useRef, useState } from 'react';
import { Wallet, ChevronDown } from 'lucide-react';
import WalletDropdown from './WalletDropdown';
import { logout } from '@/lib/client/logout';
import { useWallet } from 'stellar-wallet-kit';

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const WalletButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { account, isConnected: connected, connect, disconnect, network } = useWallet();
  const address = account?.address ?? '';

  const closeDropdown = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleConnect = async () => {
    await connect();
    setIsOpen(false);
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
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:ring-offset-2 focus:ring-offset-transparent ${
          connected
            ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
            : 'bg-gradient-to-r from-brand-red to-[#B01C1C] text-white shadow-[0_0_24px_rgba(215,35,35,0.24)] hover:opacity-95'
        }`}
      >
        <Wallet className="w-4 h-4 text-current" />
        <span className="font-medium text-sm whitespace-nowrap">
          {connected ? truncateAddress(address || '') : 'Connect Wallet'}
        </span>
        {connected && (
          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
            {network || 'Testnet'}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <WalletDropdown
        isOpen={isOpen}
        isConnected={connected}
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
