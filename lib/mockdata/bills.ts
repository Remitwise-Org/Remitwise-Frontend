import { computeDaysInfo, computeUrgency } from '@/lib/bills/urgency';

// Dates are relative to today so urgency stays accurate in dev/demo
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

const rawBills: Omit<Bill, 'status' | 'daysInfo'>[] = [
  {
    id: '1',
    title: 'School Tuition',
    category: 'Education',
    amount: 500,
    dueDate: daysFromNow(-5),
    isRecurring: false,
  },
  {
    id: '2',
    title: 'Rent Payment',
    category: 'Housing',
    amount: 800,
    dueDate: daysFromNow(2),
    isRecurring: true,
    recurrenceLabel: 'Monthly',
    nextOccurrence: daysFromNow(32),
  },
  {
    id: '3',
    title: 'Electricity Bill',
    category: 'Utilities',
    amount: 150,
    dueDate: daysFromNow(6),
    isRecurring: true,
    recurrenceLabel: 'Monthly',
    nextOccurrence: daysFromNow(36),
  },
  {
    id: '4',
    title: 'Internet Service',
    category: 'Utilities',
    amount: 60,
    dueDate: daysFromNow(11),
    isRecurring: true,
    recurrenceLabel: 'Monthly',
    nextOccurrence: daysFromNow(41),
  },
  {
    id: '5',
    title: 'Internet Service',
    category: 'Utilities',
    amount: 60,
    dueDate: daysFromNow(-3),
    isRecurring: true,
    recurrenceLabel: 'Monthly',
    nextOccurrence: daysFromNow(27),
  },
];

export const mockBills: Bill[] = rawBills.map((b) => ({
  ...b,
  status: computeUrgency(b.dueDate),
  daysInfo: computeDaysInfo(b.dueDate),
}));

/** Paid bills shown in Recent Payments — status is forced to 'paid' */
export const mockPaidBills: Bill[] = [
  {
    id: 'p1',
    title: 'Phone Bill',
    category: 'Utilities',
    amount: 35,
    dueDate: daysFromNow(-11),
    daysInfo: 'Paid',
    status: 'paid',
    isRecurring: true,
    recurrenceLabel: 'Monthly',
  },
  {
    id: 'p2',
    title: 'Water Bill',
    category: 'Utilities',
    amount: 45,
    dueDate: daysFromNow(-16),
    daysInfo: 'Paid',
    status: 'paid',
    isRecurring: false,
  },
  {
    id: 'p3',
    title: 'Insurance Premium',
    category: 'Insurance',
    amount: 200,
    dueDate: daysFromNow(-21),
    daysInfo: 'Paid',
    status: 'paid',
    isRecurring: true,
    recurrenceLabel: 'Monthly',
  },
];
