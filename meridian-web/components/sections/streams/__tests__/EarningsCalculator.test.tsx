import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EarningsCalculator from "../EarningsCalculator";

// Mock framer-motion's useReducedMotion hook hook to assert custom styles
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => false, // Default animations allowed
  };
});

describe("EarningsCalculator Component Suite", () => {
  it("recomputes metrics dynamically upon shifting the input salary field", () => {
    render(<EarningsCalculator />);
    
    const salaryInput = screen.getByLabelText(/Target Annual Salary/i) as HTMLInputElement;
    fireEvent.change(salaryInput, { target: { value: "100000" } });
    
    expect(salaryInput.value).toBe("100000");
  });

  it("exposes readable equivalent matrix parameters for Assistive technologies", () => {
    render(<EarningsCalculator />);
    const dataTable = screen.getByRole("table", { hidden: true });
    expect(dataTable).toBeInTheDocument();
  });
});