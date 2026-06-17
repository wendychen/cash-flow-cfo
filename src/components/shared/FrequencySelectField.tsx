import type { Frequency } from '@/types/fixedExpense';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { FREQUENCY_META, STANDARD_FREQUENCIES } from '@/lib/frequencyLabels';
import { cn } from '@/lib/utils';

interface FrequencySelectFieldProps {
  value: Frequency;
  onValueChange: (value: Frequency) => void;
  triggerClassName?: string;
  showHint?: boolean;
}

export function FrequencySelectField({
  value,
  onValueChange,
  triggerClassName,
  showHint = true,
}: FrequencySelectFieldProps) {
  const meta = FREQUENCY_META[value];

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Select value={value} onValueChange={(val) => onValueChange(val as Frequency)}>
          <SelectTrigger className={cn('w-28', triggerClassName)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STANDARD_FREQUENCIES.map((freq) => (
              <SelectItem key={freq} value={freq} title={FREQUENCY_META[freq].description}>
                <span>{FREQUENCY_META[freq].label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({FREQUENCY_META[freq].shortHint})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Frequency help"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p className="font-medium mb-1">Bi-weekly vs Bi-monthly</p>
              <p>{FREQUENCY_META['bi-weekly'].description}</p>
              <p className="mt-1">{FREQUENCY_META['bi-monthly'].description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {showHint && meta && (
        <p className="text-[10px] text-muted-foreground leading-tight max-w-[220px]">
          {meta.description}
        </p>
      )}
    </div>
  );
}