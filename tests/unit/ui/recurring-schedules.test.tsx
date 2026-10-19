import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurringSchedulesPage from "../../../app/send/recurring/page";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  CalendarClock: () => <span data-testid="icon-calendar-clock" />,
  Copy: () => <span data-testid="icon-copy" />,
  Check: () => <span data-testid="icon-check" />,
  Edit2: () => <span data-testid="icon-edit" />,
  Trash2: () => <span data-testid="icon-trash" />,
  Play: () => <span data-testid="icon-play" />,
  Pause: () => <span data-testid="icon-pause" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  X: () => <span data-testid="icon-x" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Plus: () => <span data-testid="icon-plus" />,
  Hash: () => <span data-testid="icon-hash" />,
  Link: () => <span data-testid="icon-link" />,
}));

// Mock next/navigation
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

// Mock useToast hook
const mockToast = vi.fn();
vi.mock("@/lib/context/ToastContext", () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: vi.fn(),
  }),
}));

// Mock apiClient wrapper
const mockGetJson = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: {
    getJson: (...args: any[]) => mockGetJson(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

// Mock window.navigator.clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

const VALID_KEY = "GD6EAN3FULNVU5QMVLAXANHMIPPAIWLIPFZYBCMJ4LPH5VME4H477EYQ";
const TRUNCATED_KEY = "GD6EAN...7EYQ";

describe("RecurringSchedulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders loading state on initial mount", async () => {
    // Keep it pending
    mockGetJson.mockReturnValue(new Promise(() => {}));
    render(<RecurringSchedulesPage />);
    expect(screen.getByText("Recurring Schedules")).toBeInTheDocument();
    expect(screen.getByText("Manage recurring remittance transfers")).toBeInTheDocument();
  });

  it("renders empty state when there are no schedules", async () => {
    mockGetJson.mockResolvedValue([]);
    render(<RecurringSchedulesPage />);

    await waitFor(() => {
      expect(screen.queryByText("No recurring schedules")).toBeInTheDocument();
    });
    expect(screen.getByText("Create a new schedule to automate your remittance transfers.")).toBeInTheDocument();
  });

  it("opens create form, validates inputs, and submits successfully", async () => {
    const user = userEvent.setup();
    mockGetJson.mockResolvedValue([]);
    render(<RecurringSchedulesPage />);

    // Click CTA to open create form
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Create Schedule" })[0]).toBeInTheDocument();
    });
    await user.click(screen.getAllByRole("button", { name: "Create Schedule" })[0]);

    // Form should render with empty input fields
    expect(screen.getByLabelText(/Recipient Stellar Address/i)).toBeInTheDocument();
    const amountInput = screen.getByLabelText(/Transfer Amount/i);
    expect(amountInput).toBeInTheDocument();

    // Click save with empty fields to trigger validation
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    expect(await screen.findByText("Recipient address is required")).toBeInTheDocument();

    // Fill invalid recipient
    await user.type(screen.getByLabelText(/Recipient Stellar Address/i), "invalid-stellar-key");
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    expect(await screen.findByText("Invalid Stellar recipient address")).toBeInTheDocument();

    // Clear and fill valid recipient
    await user.clear(screen.getByLabelText(/Recipient Stellar Address/i));
    await user.type(screen.getByLabelText(/Recipient Stellar Address/i), VALID_KEY);

    // Fill invalid amount
    await user.type(amountInput, "-5");
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    expect(await screen.findByText("Amount must be a positive number")).toBeInTheDocument();

    // Clear and fill valid amount
    await user.clear(amountInput);
    await user.type(amountInput, "120");

    // Dynamic preview check for next run date
    const monthlyPreview = screen.getByText(/Subsequent runs will continue automatically every monthly/i);
    expect(monthlyPreview).toBeInTheDocument();

    // Switch frequency to Weekly
    await user.click(screen.getByRole("radio", { name: "weekly" }));
    expect(screen.getByText(/Subsequent runs will continue automatically every weekly/i)).toBeInTheDocument();

    // Mock API post response
    const mockCreatedSchedule = {
      id: "schedule-1",
      userAddress: "GSOURCE...",
      recipientAddress: VALID_KEY,
      amount: 120,
      currency: "USDC",
      frequency: "weekly",
      nextRunAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCreatedSchedule),
    });

    await user.click(screen.getByRole("button", { name: "Save Schedule" }));

    // Form should close, list should display new card, and toast should fire
    await waitFor(() => {
      expect(screen.queryByLabelText(/Recipient Stellar Address/i)).not.toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Schedule created",
      description: "New recurring remittance schedule setup successfully.",
    });
    expect(screen.getByText(TRUNCATED_KEY)).toBeInTheDocument();
    expect(screen.getByText("120.00")).toBeInTheDocument();
  });

  it("opens edit form, pre-fills data, and updates successfully", async () => {
    const user = userEvent.setup();
    const existingSchedule = {
      id: "schedule-1",
      userAddress: "GSOURCE...",
      recipientAddress: VALID_KEY,
      amount: 75,
      currency: "XLM",
      frequency: "biweekly",
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockGetJson.mockResolvedValue([existingSchedule]);
    render(<RecurringSchedulesPage />);

    // Wait for list to load and click edit button
    await waitFor(() => {
      expect(screen.getByText(TRUNCATED_KEY)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Edit schedule" }));

    // Verify fields pre-filled
    const recipientInput = screen.getByLabelText(/Recipient Stellar Address/i);
    const amountInput = screen.getByLabelText(/Transfer Amount/i);
    expect(recipientInput).toHaveValue(existingSchedule.recipientAddress);
    expect(amountInput).toHaveValue(existingSchedule.amount);

    // Modify amount
    await user.clear(amountInput);
    await user.type(amountInput, "90");

    // Mock patch endpoint response
    const mockUpdatedSchedule = {
      ...existingSchedule,
      amount: 90,
    };
    mockPatch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUpdatedSchedule),
    });

    await user.click(screen.getByRole("button", { name: "Update Schedule" }));

    // Verify update success and close form
    await waitFor(() => {
      expect(screen.queryByLabelText(/Recipient Stellar Address/i)).not.toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Schedule updated",
      description: "The recurring remittance schedule was updated successfully.",
    });
    expect(screen.getByText("90.00")).toBeInTheDocument();
  });

  it("toggles pause and resume states locally via localStorage", async () => {
    const user = userEvent.setup();
    const existingSchedule = {
      id: "schedule-1",
      userAddress: "GSOURCE...",
      recipientAddress: VALID_KEY,
      amount: 75,
      currency: "USDC",
      frequency: "monthly",
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockGetJson.mockResolvedValue([existingSchedule]);
    render(<RecurringSchedulesPage />);

    // Wait for list to render
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    // Pause schedule
    await user.click(screen.getByRole("button", { name: "Pause schedule" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Schedule paused",
      description: "The remittance schedule has been paused.",
    });
    expect(localStorage.getItem("paused_remittances")).toContain("schedule-1");

    // Resume schedule
    await user.click(screen.getByRole("button", { name: "Resume schedule" }));
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Schedule resumed",
      description: "The remittance schedule has been resumed.",
    });
  });

  it("supports copying recipient address to clipboard", async () => {
    const user = userEvent.setup();
    // Overwrite the clipboard mock instantiated by userEvent setup
    navigator.clipboard.writeText = mockWriteText;

    const existingSchedule = {
      id: "schedule-1",
      userAddress: "GSOURCE...",
      recipientAddress: VALID_KEY,
      amount: 50,
      currency: "USDC",
      frequency: "monthly",
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockGetJson.mockResolvedValue([existingSchedule]);
    render(<RecurringSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy recipient address" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Copy recipient address" }));

    expect(mockWriteText).toHaveBeenCalledWith(existingSchedule.recipientAddress);
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Address copied",
      description: "Recipient address has been copied to clipboard.",
    });
  });

  it("shows delete confirmation dialog and deletes successfully", async () => {
    const user = userEvent.setup();
    const existingSchedule = {
      id: "schedule-1",
      userAddress: "GSOURCE...",
      recipientAddress: VALID_KEY,
      amount: 75,
      currency: "USDC",
      frequency: "monthly",
      nextRunAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockGetJson.mockResolvedValue([existingSchedule]);
    render(<RecurringSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete schedule" })).toBeInTheDocument();
    });

    // Click delete, dialog modal should open
    await user.click(screen.getByRole("button", { name: "Delete schedule" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete Schedule?")).toBeInTheDocument();

    // Click Cancel, dialog should close
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click Delete again
    await user.click(screen.getByRole("button", { name: "Delete schedule" }));
    mockDelete.mockResolvedValue({ ok: true });

    // Click Delete in modal to confirm
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    // Verify deletion succeeds, card removed, and toast fired
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockToast).toHaveBeenCalledWith({
      variant: "success",
      title: "Schedule deleted",
      description: "The recurring remittance schedule was successfully deleted.",
    });
    expect(screen.queryByText(TRUNCATED_KEY)).not.toBeInTheDocument();
  });
});
