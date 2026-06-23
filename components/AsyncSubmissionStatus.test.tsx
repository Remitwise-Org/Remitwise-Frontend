import React from "react";
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import AsyncSubmissionStatus from "./AsyncSubmissionStatus";
import { useAsyncOperations } from "@/lib/context/AsyncOperationsContext";

expect.extend(toHaveNoViolations);

vi.mock("@/lib/context/AsyncOperationsContext", () => ({
	useAsyncOperations: vi.fn(),
}));

describe("AsyncSubmissionStatus", () => {
	const defaultProps = {
		idleTitle: "Ready to Submit",
		idleDescription: "Click the button to start the transaction.",
		pendingTitle: "Submitting Transaction",
		pendingDescription: "Please wait while we process your request.",
		successTitle: "Submission Successful",
		successDescription: "Your transaction has been confirmed on-chain.",
		errorTitle: "Submission Failed",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock implementation returning no active operations
		(useAsyncOperations as Mock).mockReturnValue({
			state: { operations: [] },
			dispatch: vi.fn(),
		});
	});

	describe("State Rendering", () => {
		it("should render the idle state when not pending, success, or error", () => {
			render(<AsyncSubmissionStatus {...defaultProps} />);

			expect(screen.getByText(defaultProps.idleTitle)).toBeInTheDocument();
			expect(screen.getByText(defaultProps.idleDescription)).toBeInTheDocument();
			expect(screen.getByText("Ready")).toBeInTheDocument();
		});

		it("should render the pending state when pending prop is true", () => {
			render(<AsyncSubmissionStatus {...defaultProps} pending={true} />);

			expect(screen.getByText(defaultProps.pendingTitle)).toBeInTheDocument();
			expect(screen.getByText(defaultProps.pendingDescription)).toBeInTheDocument();
			expect(screen.getByText("In progress")).toBeInTheDocument();
		});

		it("should render the success state when success prop is provided", () => {
			render(<AsyncSubmissionStatus {...defaultProps} success="Tx Success Details" />);

			expect(screen.getByText(defaultProps.successTitle)).toBeInTheDocument();
			expect(screen.getByText(defaultProps.successDescription)).toBeInTheDocument();
			expect(screen.getByText("Complete")).toBeInTheDocument();
		});

		it("should fall back to success prop value for description if successDescription is omitted", () => {
			const { successDescription, ...propsWithoutSuccessDesc } = defaultProps;
			render(<AsyncSubmissionStatus {...propsWithoutSuccessDesc} success="Direct Success Msg" />);

			expect(screen.getByText("Direct Success Msg")).toBeInTheDocument();
		});

		it("should render the error state when error prop is provided", () => {
			render(<AsyncSubmissionStatus {...defaultProps} error="Transaction failed due to timeout" />);

			expect(screen.getByText(defaultProps.errorTitle)).toBeInTheDocument();
			expect(screen.getByText("Transaction failed due to timeout")).toBeInTheDocument();
			expect(screen.getByText("Needs attention")).toBeInTheDocument();
		});

		it("should fall back to default error title when errorTitle is omitted", () => {
			const { errorTitle, ...propsWithoutErrorTitle } = defaultProps;
			render(<AsyncSubmissionStatus {...propsWithoutErrorTitle} error="Timeout error" />);

			expect(screen.getByText("Submission needs attention")).toBeInTheDocument();
		});
	});

	describe("Spinner Behavior", () => {
		it("should show the spinner in the pending state", () => {
			const { container } = render(<AsyncSubmissionStatus {...defaultProps} pending={true} />);
			const svgIcon = container.querySelector("svg");
			expect(svgIcon).toBeInTheDocument();
			expect(svgIcon).toHaveClass("animate-spin");
		});

		it("should not show the spinner in the idle state", () => {
			const { container } = render(<AsyncSubmissionStatus {...defaultProps} />);
			const svgIcon = container.querySelector("svg");
			expect(svgIcon).toBeInTheDocument();
			expect(svgIcon).not.toHaveClass("animate-spin");
		});

		it("should not show the spinner in the success state", () => {
			const { container } = render(<AsyncSubmissionStatus {...defaultProps} success="Success" />);
			const svgIcon = container.querySelector("svg");
			expect(svgIcon).toBeInTheDocument();
			expect(svgIcon).not.toHaveClass("animate-spin");
		});

		it("should not show the spinner in the error state", () => {
			const { container } = render(<AsyncSubmissionStatus {...defaultProps} error="Error" />);
			const svgIcon = container.querySelector("svg");
			expect(svgIcon).toBeInTheDocument();
			expect(svgIcon).not.toHaveClass("animate-spin");
		});
	});

	describe("Accessibility (a11y)", () => {
		it("should expose the correct outer live region semantics", () => {
			render(<AsyncSubmissionStatus {...defaultProps} />);
			const statusContainer = screen.getByRole("status");
			expect(statusContainer).toBeInTheDocument();
			expect(statusContainer).toHaveAttribute("aria-live", "polite");
			expect(statusContainer).toHaveAttribute("aria-atomic", "true");
		});

		it("should have no accessibility violations in any state", async () => {
			const states = [
				{ props: {} },
				{ props: { pending: true } },
				{ props: { success: "Success message" } },
				{ props: { error: "Error message" } },
			];

			for (const state of states) {
				const { container, unmount } = render(
					<AsyncSubmissionStatus {...defaultProps} {...state.props} />
				);
				const results = await axe(container);
				expect(results).toHaveNoViolations();
				unmount();
			}
		});
	});

	describe("Precedence & Edge Cases", () => {
		it("should prioritize error over all other states (error > success > pending > idle)", () => {
			render(
				<AsyncSubmissionStatus
					{...defaultProps}
					pending={true}
					success="Success message"
					error="Error message"
				/>
			);

			// Should render error state
			expect(screen.getByText(defaultProps.errorTitle)).toBeInTheDocument();
			expect(screen.getByText("Error message")).toBeInTheDocument();
			expect(screen.queryByText(defaultProps.pendingTitle)).not.toBeInTheDocument();
			expect(screen.queryByText(defaultProps.successTitle)).not.toBeInTheDocument();
		});

		it("should prioritize success over pending (success > pending)", () => {
			render(
				<AsyncSubmissionStatus
					{...defaultProps}
					pending={true}
					success="Success message"
				/>
			);

			// Should render success state
			expect(screen.getByText(defaultProps.successTitle)).toBeInTheDocument();
			expect(screen.queryByText(defaultProps.pendingTitle)).not.toBeInTheDocument();
		});

		it("should render successfully when description or title is an empty string", () => {
			render(
				<AsyncSubmissionStatus
					{...defaultProps}
					idleTitle=""
					idleDescription=""
				/>
			);

			const statusContainer = screen.getByRole("status");
			expect(statusContainer).toBeInTheDocument();
			const pTag = statusContainer.querySelector("p");
			expect(pTag).toHaveTextContent("");
			const h3Tag = statusContainer.querySelector("h3");
			expect(h3Tag).toHaveTextContent("");
		});

		it("should handle error with falsy/empty values by falling back to other statuses", () => {
			// If error is an empty string, it's falsy, so it should not render error state.
			render(
				<AsyncSubmissionStatus
					{...defaultProps}
					error=""
					pending={true}
				/>
			);

			expect(screen.getByText(defaultProps.pendingTitle)).toBeInTheDocument();
			expect(screen.queryByText(defaultProps.errorTitle)).not.toBeInTheDocument();
		});
	});

	describe("Prop Transitions", () => {
		it("should transition states dynamically when props change", () => {
			const { rerender } = render(<AsyncSubmissionStatus {...defaultProps} />);
			expect(screen.getByText(defaultProps.idleTitle)).toBeInTheDocument();

			// Transition to pending
			rerender(<AsyncSubmissionStatus {...defaultProps} pending={true} />);
			expect(screen.getByText(defaultProps.pendingTitle)).toBeInTheDocument();

			// Transition to success
			rerender(<AsyncSubmissionStatus {...defaultProps} success="Success!" />);
			expect(screen.getByText(defaultProps.successTitle)).toBeInTheDocument();

			// Transition to error
			rerender(<AsyncSubmissionStatus {...defaultProps} error="Error!" />);
			expect(screen.getByText(defaultProps.errorTitle)).toBeInTheDocument();
		});
	});

	describe("Integration with AsyncOperationsContext", () => {
		it("should automatically show pending state if an operation is active in context and pending is not explicitly passed", () => {
			(useAsyncOperations as Mock).mockReturnValue({
				state: {
					operations: [
						{
							id: "op-1",
							title: "Transfer",
							detail: "Processing transfer",
							status: "building",
							createdAt: Date.now(),
						},
					],
				},
				dispatch: vi.fn(),
			});

			render(<AsyncSubmissionStatus {...defaultProps} />);

			// Should render pending state because 'building' is an active state
			expect(screen.getByText(defaultProps.pendingTitle)).toBeInTheDocument();
			expect(screen.getByText("In progress")).toBeInTheDocument();
		});

		it("should NOT show pending state if operation is confirmed or failed", () => {
			(useAsyncOperations as Mock).mockReturnValue({
				state: {
					operations: [
						{
							id: "op-1",
							title: "Transfer",
							detail: "Confirmed transfer",
							status: "confirmed",
							createdAt: Date.now(),
						},
					],
				},
				dispatch: vi.fn(),
			});

			render(<AsyncSubmissionStatus {...defaultProps} />);

			// Should render idle state because 'confirmed' is not active
			expect(screen.getByText(defaultProps.idleTitle)).toBeInTheDocument();
			expect(screen.getByText("Ready")).toBeInTheDocument();
		});

		it("should prioritize explicit pending prop over context state", () => {
			(useAsyncOperations as Mock).mockReturnValue({
				state: {
					operations: [
						{
							id: "op-1",
							title: "Transfer",
							detail: "Processing transfer",
							status: "building",
							createdAt: Date.now(),
						},
					],
				},
				dispatch: vi.fn(),
			});

			// Pass pending={false} explicitly to override the active operation
			render(<AsyncSubmissionStatus {...defaultProps} pending={false} />);

			// Should render idle state
			expect(screen.getByText(defaultProps.idleTitle)).toBeInTheDocument();
			expect(screen.getByText("Ready")).toBeInTheDocument();
		});
	});
});
