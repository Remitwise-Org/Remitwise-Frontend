'use client';

import React, { useState } from 'react';
import { Copy, Check, User, Wallet, Zap, LogOut, ChevronRight } from 'lucide-react';

interface AccountSectionProps {
  isConnected?: boolean;
  stellarAddress?: string;
  onChangeWallet?: () => void;
  onDisconnect?: () => void;
}

export function AccountSection({
  isConnected = true,
  stellarAddress = 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  onChangeWallet,
  onDisconnect,
}: AccountSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(stellarAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleChangeWallet = () => {
    if (onChangeWallet) {
      onChangeWallet();
    } else {
      console.log('Change wallet - integrate with wallet SDK');
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    } else {
      console.log('Disconnect wallet - integrate with wallet SDK');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Account</h2>
          <p className="text-sm text-gray-500">Wallet and connection settings</p>
        </div>
      </div>

      {/* Card Container */}
      <div className="rounded-xl bg-[#0f0f0f] border border-gray-800/30 overflow-hidden">
        
        {/* Row 1: Stellar Address */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/30">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Wallet className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-sm font-medium text-white">Stellar Address</span>
                {isConnected && (
                  <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold text-red-500 bg-red-500/10 rounded border border-red-500/20 uppercase tracking-wide">
                    CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 font-mono truncate max-w-[180px] sm:max-w-none" title={stellarAddress}>
                {stellarAddress}
              </p>
            </div>
          </div>
          <button
            onClick={handleCopyAddress}
            className="flex-shrink-0 ml-2 sm:ml-3 p-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Copy address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* Row 2: Change Wallet */}
        <div 
          onClick={handleChangeWallet}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleChangeWallet();
            }
          }}
          className="flex items-center justify-between p-4 border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <Zap className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Change Wallet</p>
              <p className="text-xs text-gray-500">Connect a different Stellar wallet</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </div>
        </div>

        {/* Row 3: Disconnect Wallet */}
        <div 
          onClick={handleDisconnect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDisconnect();
            }
          }}
          className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-500">Disconnect Wallet</p>
              <p className="text-xs text-gray-500">Sign out from your account</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
