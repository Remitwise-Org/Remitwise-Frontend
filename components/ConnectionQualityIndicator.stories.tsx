import type { Meta, StoryObj } from '@storybook/react';
import ConnectionQualityIndicator from './ConnectionQualityIndicator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock QueryClient for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta: Meta<typeof ConnectionQualityIndicator> = {
  title: 'Components/ConnectionQualityIndicator',
  component: ConnectionQualityIndicator,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="p-8 bg-black flex justify-center items-center">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectionQualityIndicator>;

export const Default: Story = {
  parameters: {
    msw: {
      handlers: [],
    },
  },
};
