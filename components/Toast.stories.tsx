import type { Meta, StoryObj } from "@storybook/react";
import Toast from "./Toast";
import type { Toast as ToastType } from "@/lib/context/ToastContext";

const meta = {
  title: "Components/Toast",
  component: Toast,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    toast: {
      control: { type: "object" },
    },
    onDismiss: {
      action: "dismissed",
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

// Example toasts
const successToast: ToastType = {
  id: "success-1",
  variant: "success",
  title: "Transfer sent",
  description: "Funds are on their way to the recipient.",
  duration: 5000,
};

const errorToastBasic: ToastType = {
  id: "error-1",
  variant: "error",
  title: "Transfer failed",
  description: "Your account balance is too low.",
  duration: 0,
};

const errorToastWithDiagnostics: ToastType = {
  id: "error-2",
  variant: "error",
  title: "Transfer failed",
  description: "Your account balance is too low.",
  duration: 0,
  diagnostics: {
    requestId: "9d0f8c5d-1c7a-4d53-a74c-xxxxxxxx4",
    errorCode: "INSUFFICIENT_BALANCE",
    timestamp: new Date().toISOString(),
  },
};

const errorToastWithPartialDiagnostics: ToastType = {
  id: "error-3",
  variant: "error",
  title: "Payment processing failed",
  description: "Failed to process your payment. Please try again.",
  duration: 0,
  diagnostics: {
    requestId: "req-abc123-xyz789",
  },
};

const warningToast: ToastType = {
  id: "warning-1",
  variant: "warning",
  title: "Bill overdue",
  description: "Electricity bill is 3 days overdue.",
  duration: 5000,
};

const infoToast: ToastType = {
  id: "info-1",
  variant: "info",
  title: "Session refreshed",
  description: "Your session has been updated.",
  duration: 5000,
};

const toastWithAction: ToastType = {
  id: "warning-2",
  variant: "warning",
  title: "Low balance",
  description: "Your account balance is running low.",
  action: {
    label: "Add funds",
    onClick: () => alert("Opening funding modal..."),
  },
  duration: 0,
};

// Stories

/**
 * Success toast with auto-dismiss
 */
export const Success: Story = {
  args: {
    toast: successToast,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Basic error toast without diagnostic details
 */
export const Error: Story = {
  args: {
    toast: errorToastBasic,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Error toast with full diagnostic details disclosure
 * Click "What failed" to expand and see request ID, error code, message, and timestamp
 */
export const ErrorWithDiagnostics: Story = {
  args: {
    toast: errorToastWithDiagnostics,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Error toast with only request ID diagnostic (no error code or timestamp)
 * Demonstrates that diagnostic fields are optional and only available fields are displayed
 */
export const ErrorWithPartialDiagnostics: Story = {
  args: {
    toast: errorToastWithPartialDiagnostics,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Warning toast with auto-dismiss
 */
export const Warning: Story = {
  args: {
    toast: warningToast,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Info toast with auto-dismiss
 */
export const Info: Story = {
  args: {
    toast: infoToast,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Toast with action button
 */
export const WithAction: Story = {
  args: {
    toast: toastWithAction,
    onDismiss: () => console.log("dismissed"),
  },
};

/**
 * Long title and description to test text wrapping
 */
export const LongContent: Story = {
  args: {
    toast: {
      id: "long-1",
      variant: "error",
      title: "This is a very long error title that might wrap to multiple lines",
      description:
        "This is a detailed error message that explains what went wrong in comprehensive detail. The user can dismiss this or view more details.",
      duration: 0,
      diagnostics: {
        requestId: "req-very-long-id-12345-67890-abcdef",
        errorCode: "ERR_VALIDATION_FAILED",
      },
    },
    onDismiss: () => console.log("dismissed"),
  },
};
