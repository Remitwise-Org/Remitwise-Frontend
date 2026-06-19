export interface ValidationErrorItem {
  path: string;
  message: string;
}

export interface ActionState {
  error?: string;
  success?: string;
  validationErrors?: ValidationErrorItem[];
  [key: string]: unknown;
}
