import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  AccessibleCalendarGrid,
  type CalendarDate,
} from "./AccessibleCalendarGrid";

const meta = {
  title: "Components/UI/AccessibleCalendarGrid",
  component: AccessibleCalendarGrid,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#0a0a0a" }],
    },
  },
  argTypes: {
    value: { control: false },
    onChange: { action: "dateSelected" },
    locale: {
      control: { type: "select" },
      options: ["en-US", "en-GB", "ar-SA", "he-IL", "fr-FR", "ja-JP"],
    },
    firstDayOfWeek: {
      control: { type: "radio" },
      options: [0, 1],
      description: "0 = Sunday, 1 = Monday",
    },
  },
} satisfies Meta<typeof AccessibleCalendarGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Default — uncontrolled, no selection
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    ariaLabel: "Remittance date picker",
  },
};

// ---------------------------------------------------------------------------
// With selected date
// ---------------------------------------------------------------------------

export const WithSelectedDate: Story = {
  args: {
    value: { year: 2026, month: 7, day: 15 },
    ariaLabel: "Remittance date picker — date selected",
  },
};

// ---------------------------------------------------------------------------
// Controlled (interactive selection)
// ---------------------------------------------------------------------------

function ControlledCalendar() {
  const [selected, setSelected] = useState<CalendarDate | null>(null);
  return (
    <div className="flex flex-col items-center gap-4">
      <AccessibleCalendarGrid
        value={selected}
        onChange={setSelected}
        ariaLabel="Remittance date picker"
      />
      <p className="text-sm text-white/60">
        {selected
          ? `Selected: ${selected.year}-${String(selected.month).padStart(2, "0")}-${String(selected.day).padStart(2, "0")}`
          : "No date selected"}
      </p>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledCalendar />,
};

// ---------------------------------------------------------------------------
// With min / max constraints
// ---------------------------------------------------------------------------

export const WithMinMax: Story = {
  args: {
    minDate: { year: 2026, month: 7, day: 10 },
    maxDate: { year: 2026, month: 7, day: 25 },
    ariaLabel: "Restricted date picker",
  },
};

// ---------------------------------------------------------------------------
// RTL — Arabic locale
// ---------------------------------------------------------------------------

export const RTLArabic: Story = {
  args: {
    locale: "ar-SA",
    firstDayOfWeek: 0,
    ariaLabel: "منتقي التاريخ",
  },
};

// ---------------------------------------------------------------------------
// RTL — Hebrew locale
// ---------------------------------------------------------------------------

export const RTLHebrew: Story = {
  args: {
    locale: "he-IL",
    firstDayOfWeek: 0,
    ariaLabel: "בורר תאריך",
  },
};

// ---------------------------------------------------------------------------
// ISO week — Monday first day
// ---------------------------------------------------------------------------

export const MondayFirstDay: Story = {
  args: {
    locale: "en-GB",
    firstDayOfWeek: 1,
    ariaLabel: "Date picker — ISO week",
  },
};

// ---------------------------------------------------------------------------
// French locale
// ---------------------------------------------------------------------------

export const FrenchLocale: Story = {
  args: {
    locale: "fr-FR",
    firstDayOfWeek: 1,
    ariaLabel: "Sélecteur de date",
  },
};

// ---------------------------------------------------------------------------
// Japanese locale
// ---------------------------------------------------------------------------

export const JapaneseLocale: Story = {
  args: {
    locale: "ja-JP",
    firstDayOfWeek: 0,
    ariaLabel: "日付選択",
  },
};
