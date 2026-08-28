'use client';

import { motion } from 'framer-motion';
import { Award, BadgeCheck, RefreshCw, ShieldCheck, Trophy } from 'lucide-react';
import { containerVariants, itemVariantsLeft } from '@/lib/animations/variants';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cardReveal, containerVariants, itemVariantsLeft, sectionViewport } from '@/lib/animations/variants';
import { verifyProof } from '@/lib/merkle-proof';

// ---------------------------------------------------------------------------
// Sub-components — loading, empty, error
// ---------------------------------------------------------------------------

function LeaderboardSkeleton() {
  return (
    <div role="status" aria-label="Loading leaderboard…" className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg border border-border"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LeaderboardEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <Empty className="border border-dashed border-border rounded-xl py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No entries yet</EmptyTitle>
        <EmptyDescription>
          The leaderboard will populate once the first focus sessions are recorded on-chain.
        </EmptyDescription>
      </EmptyHeader>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Refresh
      </button>
    </Empty>
  );
}

function LeaderboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3"
    >
      <p className="text-sm text-destructive font-medium">Unable to load leaderboard</p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rank badge — gold / silver / bronze for top 3, plain otherwise
// ---------------------------------------------------------------------------

const RANK_STYLES: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-slate-400',
  3: 'text-amber-600',
};

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`font-bold text-lg w-6 tabular-nums ${RANK_STYLES[rank] ?? 'text-primary'}`}
    >
      #{rank}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------


interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  yield: string;
  proof?: { leaf: string; proof: string[]; root: string; verified: boolean; leafIndex: number } | null;
}

const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Alex Chen', xp: 15420, yield: '$1,250', proof: { leaf: 'a1b2c3', proof: ['d4e5f6'], root: 'root-hash', verified: true, leafIndex: 0 } },
  { rank: 2, name: 'Sarah Williams', xp: 14890, yield: '$1,180', proof: { leaf: 'b2c3d4', proof: ['e5f6a1'], root: 'root-hash', verified: true, leafIndex: 1 } },
  { rank: 3, name: 'Marcus Johnson', xp: 13650, yield: '$1,095', proof: null },
  { rank: 4, name: 'Emma Davis', xp: 12340, yield: '$987', proof: null },
  { rank: 5, name: 'James Wilson', xp: 11890, yield: '$945', proof: null },
];

/**
 * LeaderboardCard — displays the weekly XP leaderboard fetched live from
 * /api/pool/leaderboard via the useLeaderboard hook.
 *
 * States handled:
 * - Loading   → skeleton rows while data is in-flight
 * - Error     → message + retry button
 * - Empty     → friendly empty state with refresh
 * - Success   → ranked rows with verified badge and on-chain proof indicator
 */
export function LeaderboardCard() {
  const { entries, isLoading, isError, error, refetch } = useLeaderboard({ limit: 5 });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      role="presentation"
      aria-hidden="true"
      variants={cardReveal}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="bg-card border border-border rounded-2xl p-8"
    >
      <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Award size={20} className="text-primary" aria-hidden="true" />
        Weekly Leaderboard
      </h3>

      {/* ── State rendering ───────────────────────────────────────────────── */}
      {isLoading && <LeaderboardSkeleton />}

      {isError && (
        <LeaderboardError message={error ?? 'An unexpected error occurred.'} onRetry={refetch} />
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <LeaderboardEmpty onRetry={refetch} />
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <motion.ol
          aria-label="Weekly XP leaderboard"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-3 list-none"
        >
          {entries.map((entry) => (
            <motion.li
              key={entry.rank}
              variants={itemVariantsLeft}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                entry.rank === 1
                  ? 'bg-primary/10 border border-primary/20'
                  : 'border border-border hover:border-primary/20'
              }`}
            >
              {/* Left — rank + name + XP */}
              <div className="flex items-center gap-4 min-w-0">
                <RankBadge rank={entry.rank} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{entry.name}</p>

                    {/* Verified badge — sourced from identity contract */}
                    {entry.verified && (
                      <BadgeCheck
                        className="h-4 w-4 text-sky-500 flex-shrink-0"
                        aria-label="Identity verified"
                      />
                    )}

                    {/* On-chain proof indicator — appears when Merkle hash is present */}
                    {entry.onChainProof && (
                      <span
                        title={`On-chain proof: ${entry.onChainProof}`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                        aria-label="On-chain proof available"
                      >
                        <ShieldCheck
                          className="h-3 w-3 text-emerald-500 flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          {entry.onChainProof.slice(0, 6)}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entry.xp.toLocaleString()} XP
                  </p>
                </div>
              </div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="space-y-3"
      >
        {leaderboard.map((entry) => {
          const isVerified = entry.proof
            ? verifyProof(entry.proof.leaf, entry.proof.proof, entry.proof.root)
            : false;
          return (
          <motion.div
            key={entry.rank}
            variants={itemVariantsLeft}
            className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
              entry.rank === 1
                ? 'bg-primary/10 border border-primary/20 dark:bg-primary/20 dark:border-primary/30'
                : 'border border-border hover:border-primary/20 dark:hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="font-bold text-primary text-lg w-6"># {entry.rank}</div>
              <div>
                <p className="font-semibold text-foreground">{entry.name}</p>
                <p className="text-sm text-muted-foreground">{entry.xp} XP</p>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="text-right">
              <p className="font-semibold text-primary">{entry.yield}</p>
              <p className="text-xs text-muted-foreground">{isVerified ? 'Verified proof' : 'Missing proof'}</p>
            </div>
          </motion.div>
          );
        })}
      </motion.div>

              {/* Right — yield */}
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-semibold text-primary">{entry.yieldAmount}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      )}

      {/* View full leaderboard — always present for discoverability */}
      <button
        className="w-full mt-6 px-4 py-3 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={refetch}
      >
        View Full Leaderboard
      </button>
    </motion.div>
  );
}
