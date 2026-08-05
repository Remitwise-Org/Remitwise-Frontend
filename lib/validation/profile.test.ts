import { describe, it, expect } from "vitest";
import { ProfileFormSchema, validateProfileForm } from "./profile";

const VALID = { name: "Amara Osei", email: "amara@example.com", phone: "+234 801 234 5678" };

describe("ProfileFormSchema", () => {
  it("accepts a valid profile", () => {
    expect(ProfileFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = ProfileFormSchema.safeParse({ ...VALID, name: "  " });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = ProfileFormSchema.safeParse({ ...VALID, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone with letters", () => {
    const result = ProfileFormSchema.safeParse({ ...VALID, phone: "call-me-maybe" });
    expect(result.success).toBe(false);
  });

  it("rejects a name over the max length", () => {
    const result = ProfileFormSchema.safeParse({ ...VALID, name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("validateProfileForm", () => {
  it("returns isValid: true and no errors for a valid profile", () => {
    expect(validateProfileForm(VALID)).toEqual({ isValid: true, errors: {} });
  });

  it("returns a structured error per invalid field, never throwing", () => {
    const result = validateProfileForm({ name: "", email: "bad", phone: "x" });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("profile_name_required");
    expect(result.errors.email).toBe("profile_email_invalid");
    expect(result.errors.phone).toBe("profile_phone_invalid");
  });

  it("trims whitespace before validating", () => {
    expect(validateProfileForm({ ...VALID, name: "  Amara Osei  " }).isValid).toBe(true);
  });
});
