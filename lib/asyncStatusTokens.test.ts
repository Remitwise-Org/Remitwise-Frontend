import { describe, it, expect } from "vitest";
import {
	ASYNC_STATUS_VISUALS,
	SUBMISSION_TO_ASYNC_TOKEN,
	type AsyncStatusToken,
} from "@/lib/asyncStatusTokens";

const TOKENS: AsyncStatusToken[] = ["active", "queued", "complete", "failed"];

describe("asyncStatusTokens", () => {
	it("defines a complete visual entry for every status token", () => {
		TOKENS.forEach((token) => {
			const visual = ASYNC_STATUS_VISUALS[token];
			expect(visual.token).toBe(token);
			expect(visual.badge).toBeTruthy();
			expect(visual.cardClass).toBeTruthy();
			expect(visual.iconWrapClass).toBeTruthy();
			expect(visual.iconClass).toBeTruthy();
			expect(visual.dotClass).toBeTruthy();
			expect(typeof visual.Icon).toBe("object");
			expect(typeof visual.spin).toBe("boolean");
		});
	});

	it("only spins the active token's icon", () => {
		expect(ASYNC_STATUS_VISUALS.active.spin).toBe(true);
		expect(ASYNC_STATUS_VISUALS.queued.spin).toBe(false);
		expect(ASYNC_STATUS_VISUALS.complete.spin).toBe(false);
		expect(ASYNC_STATUS_VISUALS.failed.spin).toBe(false);
	});

	it("gives failed a distinct icon from queued", () => {
		expect(ASYNC_STATUS_VISUALS.failed.Icon).not.toBe(ASYNC_STATUS_VISUALS.queued.Icon);
	});

	it("maps AsyncSubmissionStatus's states onto the queue's status tokens", () => {
		expect(SUBMISSION_TO_ASYNC_TOKEN).toEqual({
			idle: "queued",
			pending: "active",
			success: "complete",
			error: "failed",
		});
	});

	it("resolves every submission state to a defined visual", () => {
		(Object.keys(SUBMISSION_TO_ASYNC_TOKEN) as Array<keyof typeof SUBMISSION_TO_ASYNC_TOKEN>).forEach(
			(submissionState) => {
				const token = SUBMISSION_TO_ASYNC_TOKEN[submissionState];
				expect(ASYNC_STATUS_VISUALS[token]).toBeDefined();
			}
		);
	});
});
