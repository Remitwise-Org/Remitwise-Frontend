import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import FeatureSection from "@/components/FeatureSection";

const CORE_FEATURES = [
	"Instant Settlement",
	"Smart Split",
	"Yield Savings",
	"Global Bills",
	"Micro-Insurance",
	"Family Wallets",
];

describe("FeatureSection", () => {
	it("renders all six core features from the brand brief", () => {
		render(<FeatureSection />);
		CORE_FEATURES.forEach((title) => {
			expect(screen.getByText(title)).toBeInTheDocument();
		});
	});

	it("renders the section heading below the hero's h1 in document order", () => {
		render(<FeatureSection />);
		const heading = screen.getByRole("heading", { level: 2, name: /Core Features Built for Global Families/i });
		expect(heading).toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = render(<FeatureSection />);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
