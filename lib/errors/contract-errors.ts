export enum ContractErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  NOT_FOUND = 'NOT_FOUND',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
}

export class ContractError extends Error {
  constructor(
    public category: ContractErrorCategory,
    public code: string,
    message: string,
    public httpStatus: number = 400,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

// Support optional arguments and context blocks seamlessly
export const parseContractError = (err: any, context?: any) => {
  return new ContractError(ContractErrorCategory.EXECUTION_FAILED, 'CONTRACT_EXEC_ERROR', String(err?.message || err));
};

export const createSystemError = (msg: string, context?: any, isRetryable: boolean = false) => {
  return new ContractError(ContractErrorCategory.EXECUTION_FAILED, 'SYSTEM_ERROR', msg, 500, isRetryable);
};
