"use client";

import { useAsyncOperations } from "@/lib/context/AsyncOperationsContext";
import LiveRegion from "@/components/ui/LiveRegion";
import { ASYNC_STATUS_VISUALS, SUBMISSION_TO_ASYNC_TOKEN } from "@/lib/asyncStatusTokens";

interface AsyncSubmissionStatusProps {
        pending?: boolean; // Made optional
        error?: string;
        success?: string;
        idleTitle: string;
        idleDescription: string;
        pendingTitle: string;
        pendingDescription: string;
        successTitle?: string;
        successDescription?: string;
        errorTitle?: string;
}

// Labels here are distinct from the panel's queue badges (idle/pending/success/error
// describe *this* submission, not a queue position) but the color/icon per state
// is sourced from the same ASYNC_STATUS_VISUALS tokens as AsyncOperationsPanel so
// the two components read as one system across Split and Bills.
const statusStyles = {
        idle: {
                ...ASYNC_STATUS_VISUALS[SUBMISSION_TO_ASYNC_TOKEN.idle],
                label: "Ready",
        },
        pending: {
                ...ASYNC_STATUS_VISUALS[SUBMISSION_TO_ASYNC_TOKEN.pending],
                label: "In progress",
        },
        success: {
                ...ASYNC_STATUS_VISUALS[SUBMISSION_TO_ASYNC_TOKEN.success],
                label: "Complete",
        },
        error: {
                ...ASYNC_STATUS_VISUALS[SUBMISSION_TO_ASYNC_TOKEN.error],
                label: "Needs attention",
        },
} as const;

export default function AsyncSubmissionStatus({
        pending: propPending,
        error,
        success,
        idleTitle,
        idleDescription,
        pendingTitle,
        pendingDescription,
        successTitle,
        successDescription,
        errorTitle,
}: AsyncSubmissionStatusProps) {
        const { state } = useAsyncOperations();

        // Pending if an operation is active
        const isActive = state.operations.some(op => op.status !== 'confirmed' && op.status !== 'failed');
        const pending = propPending ?? isActive;

        const status = error ? "error" : success ? "success" : pending ? "pending" : "idle";
        const style = statusStyles[status];
        const Icon = style.Icon;

        const title =
                status === "error"
                        ? errorTitle ?? "Submission needs attention"
                        : status === "success"
                                ? successTitle ?? "Contract request is ready"
                                : status === "pending"
                                        ? pendingTitle
                                        : idleTitle;

        const description =
                status === "error"
                        ? error
                        : status === "success"
                                ? successDescription ?? success
                                : status === "pending"
                                        ? pendingDescription
                                        : idleDescription;

        return (
                <LiveRegion className={`rounded-2xl border p-4 ${style.cardClass}`}>
                        <div className='flex items-start gap-3'>
                                <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]'>
                                        <Icon
                                                className={`h-4 w-4 ${style.iconClass} ${
                                                        style.spin ? "animate-spin" : ""
                                                }`}
                                        />
                                </div>
                                <div className='min-w-0'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                                <h3 className='text-sm font-semibold text-white'>{title}</h3>
                                                <span className='rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400'>
                                                        {style.label}
                                                </span>
                                        </div>
                                        <p className='mt-2 text-sm leading-6 text-gray-300'>{description}</p>
                                </div>
                        </div>
                </LiveRegion>
        );
}
