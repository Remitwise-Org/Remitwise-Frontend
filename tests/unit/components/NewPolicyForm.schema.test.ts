import { describe, it, expect } from "vitest";
import { validatePolicyForm } from "@/components/forms/NewPolicyForm";

function fd(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

const valid = {
  policyName: "Health Insurance",
  coverageType: "Health",
  monthlyPremium: "20",
  coverageAmount: "1000",
  nextPayment: "2026-09-01",
};

describe("NewPolicyForm validatePolicyForm", () => {
  it("returns no errors for valid input", () => {
    expect(validatePolicyForm(fd(valid))).toEqual({});
  });

  it("flags a short policy name", () => {
    const errors = validatePolicyForm(fd({ ...valid, policyName: "Hi" }));
    expect(errors.policyName).toBe("form_err_policy_name");
  });

  it("flags an invalid coverage type", () => {
    const errors = validatePolicyForm(fd({ ...valid, coverageType: "Dental" }));
    expect(errors.coverageType).toBe("form_err_coverage_type");
  });

  it("flags a non-positive monthly premium", () => {
    expect(validatePolicyForm(fd({ ...valid, monthlyPremium: "0" })).monthlyPremium).toBe(
      "form_err_monthly_premium"
    );
    expect(validatePolicyForm(fd({ ...valid, monthlyPremium: "-5" })).monthlyPremium).toBe(
      "form_err_monthly_premium"
    );
  });

  it("flags a non-positive coverage amount", () => {
    expect(validatePolicyForm(fd({ ...valid, coverageAmount: "0" })).coverageAmount).toBe(
      "form_err_coverage_amount"
    );
  });

  it("flags a missing next payment date", () => {
    expect(validatePolicyForm(fd({ ...valid, nextPayment: "" })).nextPayment).toBe(
      "form_err_next_payment"
    );
  });
});
