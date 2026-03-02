"use client";

import { useState, useEffect } from 'react';
import TransactionHistoryItem from '@/components/Dashboard/TransactionHistoryItem';
import TransactionHistoryHeader from "./components/transaction-history-header";
import TransactionHistorySearchInput from "./components/transaction-history-search-input";
import Button from "./components/transaction-history-button";
import { Download, FilterIcon, Loader2 } from "lucide-react";
import { TransactionItem } from '@/lib/remittance/horizon';

const TransactionHistoryPage = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('limit', '10');
      if (cursor && !reset) {
        params.append('cursor', cursor);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/v1/remittance/history?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      
      if (reset) {
        setTransactions(data.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(data.transactions || [])]);
      }
      
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
  }, [statusFilter]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchTransactions(false);
    }
  };

  const handleFilterClick = () => {
    // TODO: Implement filter modal/dropdown
    alert("Filter functionality coming soon!");
  };

  const handleExportClick = () => {
    // TODO: Implement export functionality
    alert("Export functionality coming soon!");
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.memo && tx.memo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Convert API transaction format to component format
  const convertToComponentTransaction = (tx: TransactionItem): import('@/components/Dashboard/TransactionHistoryItem').Transaction => ({
    id: tx.hash.slice(0, 8), // Short hash for display
    hash: tx.hash, // Full hash for explorer link
    type: (tx.sender === tx.recipient ? 'Received' : 'Send Money') as 'Send Money' | 'Received',
    amount: parseFloat(tx.amount),
    currency: tx.currency,
    counterpartyName: tx.sender === tx.recipient ? tx.sender : tx.recipient,
    counterpartyLabel: tx.sender === tx.recipient ? 'From' : 'To',
    date: new Date(tx.date).toLocaleString(),
    fee: 0.01, // Default fee - should come from API if available
    status: (tx.status === 'completed' ? 'Completed' : 
            tx.status === 'failed' ? 'Failed' : 'Pending') as 'Completed' | 'Failed' | 'Pending',
  });

  return (
    <main className="w-full min-h-screen bg-[#010101] font-inter">
      <TransactionHistoryHeader transactions={filteredTransactions.length} />
      
      <div className="mx-4 md:mx-20 mt-10">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-center gap-0 sm:gap-4 items-center border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] rounded-2xl py-6 px-4">
          <TransactionHistorySearchInput 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by transaction hash, address, or memo..."
          />
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
            <Button
              icon={<FilterIcon size={17} className="text-white" />}
              text="Filters"
              onclick={handleFilterClick}
            />
            <Button
              icon={<Download size={17} className="text-white" />}
              text="Export"
              onclick={handleExportClick}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCursor(undefined);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-[#FF4B26] text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && transactions.length === 0 && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-8 h-8 text-[#FF4B26] animate-spin" />
          </div>
        )}

        {/* Transactions List */}
        {!loading && filteredTransactions.length === 0 && !error && (
          <div className="mt-8 text-center">
            <p className="text-gray-400">No transactions found</p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {filteredTransactions.map((tx) => (
            <TransactionHistoryItem 
              key={tx.id} 
              transaction={convertToComponentTransaction(tx)} 
            />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && !loading && filteredTransactions.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleLoadMore}
              className="px-6 py-3 bg-[#FF4B26] text-white rounded-lg hover:bg-[#FF4B26]/80 transition-colors"
            >
              Load More
            </button>
          </div>
        )}

        {/* Loading More Indicator */}
        {loading && transactions.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#FF4B26] animate-spin" />
          </div>
        )}
      </div>
    </main>
  );
};

export default TransactionHistoryPage;
