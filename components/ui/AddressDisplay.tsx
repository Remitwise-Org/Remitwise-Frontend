'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';
import { truncateMiddle } from '@/utils/text';
import { cn } from '@/lib/utils';

// Assuming Tooltip and Toast components exist, following shadcn/ui patterns.
// If not, they would need to be created.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';

interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The full address or string to display. */
  address: string;
  /** The number of characters to show at the start and end. Defaults to 6. */
  chars?: number;
  /** Whether the copy functionality is enabled. */
  copyable?: boolean;
}

export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => {
    const { copy, status } = useCopyToClipboard();
    const { toast } = useToast();

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      copy(address).then(() => {
        toast({
          title: 'Copied to clipboard',
          description: `Address: ${truncateMiddle(address, 12)}`,
        });
      });
    };

    const Icon = status === 'copied' ? Check : Copy;

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              className={cn(
                'inline-flex items-center gap-2 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-sm font-mono text-gray-700 dark:text-gray-300',
                copyable && 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700',
                className,
              )}
              {...props}
            >
              <span>{truncateMiddle(address, chars)}</span>
              {copyable && (
                <button onClick={handleCopy} aria-label="Copy address" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
                  <Icon className="h-4 w-4" />
                </button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{address}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

AddressDisplay.displayName = 'AddressDisplay';