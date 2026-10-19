import { z } from "zod";

// RFC 5321 practical max length; matches common email column limits.
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;

// Loose but real phone validation: optional leading '+', digits, spaces,
// hyphens, and parentheses. Intentionally permissive across locales rather
// than enforcing a single country format.
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

export const ProfileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "profile_name_required")
    .max(MAX_NAME_LENGTH, "profile_name_too_long"),
  email: z
    .string()
    .trim()
    .min(1, "profile_email_required")
    .max(MAX_EMAIL_LENGTH, "profile_email_too_long")
    .email("profile_email_invalid"),
  phone: z
    .string()
    .trim()
    .min(1, "profile_phone_required")
    .regex(PHONE_REGEX, "profile_phone_invalid"),
});

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export interface ProfileFormValidationResult {
  isValid: boolean;
  /** Field name -> translation key of the first error for that field. */
  errors: Partial<Record<keyof ProfileFormValues, string>>;
}

/**
 * Validates profile form values against {@link ProfileFormSchema}.
 * Never throws -- callers get a structured result to gate save/render
 * inline errors from, instead of a generic failure.
 */
export function validateProfileForm(values: {
  name: string;
  email: string;
  phone: string;
}): ProfileFormValidationResult {
  const result = ProfileFormSchema.safeParse(values);
  if (result.success) {
    return { isValid: true, errors: {} };
  }

  const errors: ProfileFormValidationResult["errors"] = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ProfileFormValues | undefined;
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { isValid: false, errors };
}
