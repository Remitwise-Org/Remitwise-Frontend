import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import Hero from "@/components/Hero";
import { CTA_TEST_IDS } from "@/lib/cta-testids";
import { ToastProvider } from "@/lib/context/ToastContext";

function renderHero() {
	return render(
		<ToastProvider>
			<Hero />
		</ToastProvider>
	);
}

describe("Hero", () => {
	it("renders a single top-level heading with the brand headline", () => {
		renderHero();
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent(/Global Payments\s*Without Borders/i);
	});

	it("renders a primary CTA linking to /send", () => {
		renderHero();
		const primary = screen.getByTestId(CTA_TEST_IDS.page.homePrimary);
		expect(primary).toHaveAttribute("href", "/send");
		expect(primary).toHaveTextContent(/Send Money Now/i);
	});

	it("renders a secondary CTA linking to /dashboard", () => {
		renderHero();
		const secondary = screen.getByRole("link", { name: /View Dashboard/i });
		expect(secondary).toHaveAttribute("href", "/dashboard");
	});

	it("respects prefers-reduced-motion on the primary CTA's hover scale", () => {
		renderHero();
		const primary = screen.getByTestId(CTA_TEST_IDS.page.homePrimary);
		expect(primary).toHaveClass("hover:scale-105");
		expect(primary).toHaveClass("motion-reduce:hover:scale-100");
	});

	it("has no accessibility violations", async () => {
		const { container } = renderHero();
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
