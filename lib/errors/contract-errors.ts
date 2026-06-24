export enum ContractErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  NOT_FOUND = 'NOT_FOUND',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
}

// Compatibility aliases
export type ErrorCategory = ContractErrorCategory;
export const ErrorCategory = ContractErrorCategory;

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

export enum ContractErrorCode {
  INVALID_INPUT = 1000,
  INVALID_AMOUNT = 1001,
  INVALID_RECIPIENT = 1002,
  UNAUTHORIZED = 2000,
  FORBIDDEN = 2001,
  NOT_FOUND = 3000,
  EXECUTION_FAILED = 4000,
  CONTRACT_EXEC_ERROR = 4001,
  SYSTEM_ERROR = 4002,
  LIMIT_EXCEEDED = 5000,
}

export const CONTRACT_ERROR_KEY_MAP: Record<ContractErrorCode, string> = {
  [ContractErrorCode.INVALID_INPUT]: 'contractErrors.invalidInput',
  [ContractErrorCode.INVALID_AMOUNT]: 'contractErrors.invalidAmount',
  [ContractErrorCode.INVALID_RECIPIENT]: 'contractErrors.invalidRecipient',
  [ContractErrorCode.UNAUTHORIZED]: 'contractErrors.unauthorized',
  [ContractErrorCode.FORBIDDEN]: 'contractErrors.forbidden',
  [ContractErrorCode.NOT_FOUND]: 'contractErrors.notFound',
  [ContractErrorCode.EXECUTION_FAILED]: 'contractErrors.executionFailed',
  [ContractErrorCode.CONTRACT_EXEC_ERROR]: 'contractErrors.contractExecError',
  [ContractErrorCode.SYSTEM_ERROR]: 'contractErrors.systemError',
  [ContractErrorCode.LIMIT_EXCEEDED]: 'contractErrors.limitExceeded',
};

export const getContractErrorMessageKey = (code: number | string): string => {
  if (typeof code === 'number') {
    if (code in CONTRACT_ERROR_KEY_MAP) {
      return CONTRACT_ERROR_KEY_MAP[code as ContractErrorCode];
    }
  } else if (typeof code === 'string') {
    const parsed = parseInt(code, 10);
    if (!isNaN(parsed) && parsed in CONTRACT_ERROR_KEY_MAP) {
      return CONTRACT_ERROR_KEY_MAP[parsed as ContractErrorCode];
    }
    const upper = code.toUpperCase();
    const matchedEnum = (ContractErrorCode as any)[upper];
    if (matchedEnum !== undefined && matchedEnum in CONTRACT_ERROR_KEY_MAP) {
      return CONTRACT_ERROR_KEY_MAP[matchedEnum as ContractErrorCode];
    }
  }
  return 'contractErrors.generic';
};

export const toUserMessage = (error: ContractError, t: (key: string) => string): string => {
  if (error.message.startsWith('contractErrors.') || error.message.startsWith('errors.')) {
    return t(error.message);
  }
  const key = getContractErrorMessageKey(error.code);
  return t(key);
};

export const mapNumericCodeToError = (code: number): ContractError => {
  const key = getContractErrorMessageKey(code);
  
  let category = ContractErrorCategory.EXECUTION_FAILED;
  let httpStatus = 400;
  let isRetryable = false;

  if (code >= 1000 && code < 2000) {
    category = ContractErrorCategory.VALIDATION;
    httpStatus = 400;
  } else if (code >= 2000 && code < 3000) {
    category = ContractErrorCategory.AUTHENTICATION;
    httpStatus = 401;
  } else if (code >= 3000 && code < 4000) {
    category = ContractErrorCategory.NOT_FOUND;
    httpStatus = 404;
  } else if (code >= 4000 && code < 5000) {
    category = ContractErrorCategory.EXECUTION_FAILED;
    httpStatus = 500;
    if (code === ContractErrorCode.SYSTEM_ERROR) {
      isRetryable = true;
    }
  } else if (code >= 5000 && code < 8000) {
    category = ContractErrorCategory.VALIDATION;
    httpStatus = 422;
  }

  return new ContractError(category, String(code), key, httpStatus, isRetryable);
};

export const mapStringCodeToError = (code: string): ContractError => {
  const parsed = parseInt(code, 10);
  if (!isNaN(parsed)) {
    return mapNumericCodeToError(parsed);
  }

  const key = getContractErrorMessageKey(code);
  
  let category = ContractErrorCategory.EXECUTION_FAILED;
  let httpStatus = 400;
  let isRetryable = false;

  const upper = code.toUpperCase();
  const matchedEnum = (ContractErrorCode as any)[upper];

  if (matchedEnum !== undefined) {
    return mapNumericCodeToError(matchedEnum);
  }

  return new ContractError(category, code, key, httpStatus, isRetryable);
};

export const parseContractError = (err: any, context?: any): ContractError => {
  if (err instanceof ContractError) {
    return err;
  }

  const rawMessage = String(err?.message || err || '');
  
  // Look for numeric code matching 1000-7999, e.g. "Contract error: 4002" or just "4002"
  const numericMatch = rawMessage.match(/(?:Contract error(?: code)?:?\s*)?\b(\d{4})\b/i);
  if (numericMatch) {
    const codeVal = parseInt(numericMatch[1], 10);
    if (codeVal >= 1000 && codeVal <= 7999) {
      return mapNumericCodeToError(codeVal);
    }
  }

  // Check if err has code property
  if (err?.code !== undefined) {
    const codeAsNum = Number(err.code);
    if (!isNaN(codeAsNum) && codeAsNum >= 1000 && codeAsNum <= 7999) {
      return mapNumericCodeToError(codeAsNum);
    }
    if (typeof err.code === 'string') {
      return mapStringCodeToError(err.code);
    }
  }

  // Look for string code, e.g. "Contract error: UNAUTHORIZED"
  const stringMatch = rawMessage.match(/(?:Contract error(?: code)?:?\s*)?\b([A-Za-z0-9_]+)\b/i);
  if (stringMatch) {
    const codeStr = stringMatch[1];
    const parsedNum = parseInt(codeStr, 10);
    if (isNaN(parsedNum)) {
      const errMapped = mapStringCodeToError(codeStr);
      if (errMapped.code !== codeStr || getContractErrorMessageKey(codeStr) !== 'contractErrors.generic') {
        return errMapped;
      }
    }
  }

  return new ContractError(
    ContractErrorCategory.EXECUTION_FAILED,
    'CONTRACT_EXEC_ERROR',
    'contractErrors.generic',
    400,
    false
  );
};

export const createSystemError = (msg: string, context?: any, isRetryable: boolean = false) => {
  return new ContractError(ContractErrorCategory.EXECUTION_FAILED, 'SYSTEM_ERROR', msg, 500, isRetryable);
};
