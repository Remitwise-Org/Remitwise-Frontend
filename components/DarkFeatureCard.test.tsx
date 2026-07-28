import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DarkFeatureCard from "@/components/DarkFeatureCard";

describe("DarkFeatureCard", () => {
	const props = {
		icon: <svg data-testid="feature-icon" />,
		title: "Instant Settlement",
		description: "Send money across borders in seconds.",
	};

	it("renders the icon, title, and description", () => {
		render(<DarkFeatureCard {...props} />);
		expect(screen.getByTestId("feature-icon")).toBeInTheDocument();
		expect(screen.getByText(props.title)).toBeInTheDocument();
		expect(screen.getByText(props.description)).toBeInTheDocument();
	});

	it("respects prefers-reduced-motion on the icon's hover scale", () => {
		render(<DarkFeatureCard {...props} />);
		const icon = screen.getByTestId("feature-icon").parentElement;
		expect(icon).toHaveClass("group-hover:scale-110");
		expect(icon).toHaveClass("motion-reduce:group-hover:scale-100");
	});
});
