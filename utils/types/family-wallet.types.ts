export type FamilyMemberRole = 'admin' | 'sender' | 'recipient';

export interface FamilyMember {
    id: string;
    address: string;
    role: FamilyMemberRole;
    spendingLimit: number;
    currentSpending?: number;
    addedAt?: string;
    updatedAt?: string;
}

export interface AddMemberRequest {
    address: string;
    role: FamilyMemberRole;
    spendingLimit: number;
}

export interface UpdateSpendingLimitRequest {
    limit: number;
}

export interface CheckSpendingLimitResponse {
    allowed: boolean;
    currentSpending: number;
    spendingLimit: number;
    remainingLimit: number;
}
