import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { useCurrency } from '@/hooks/use-currency';
import {
  FIN_GOAL_PRESET_CUSTOM,
  FIN_GOAL_PRESETS,
  getFinGoalPresetByKey,
} from '@/lib/finGoalPresets';

interface FinGoalAmountSelectProps {
  initialPresetKey?: string;
  onApply: (amountNtd: number, presetKey?: string) => void;
}

export default function FinGoalAmountSelect({
  initialPresetKey,
  onApply,
}: FinGoalAmountSelectProps) {
  const { t } = useI18n();
  const { convertToNTD, currency } = useCurrency();
  const [selectedKey, setSelectedKey] = useState(initialPresetKey ?? FIN_GOAL_PRESETS[3].key);
  const [customAmount, setCustomAmount] = useState('');

  const handleApply = () => {
    if (selectedKey === FIN_GOAL_PRESET_CUSTOM) {
      const parsed = parseFloat(customAmount);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      onApply(convertToNTD(parsed, currency), undefined);
      return;
    }

    const preset = getFinGoalPresetByKey(selectedKey);
    if (!preset) return;
    onApply(preset.amount, preset.key);
  };

  const isCustomValid =
    selectedKey !== FIN_GOAL_PRESET_CUSTOM ||
    (Number.isFinite(parseFloat(customAmount)) && parseFloat(customAmount) > 0);

  return (
    <div className="space-y-2">
      <Select value={selectedKey} onValueChange={setSelectedKey}>
        <SelectTrigger className="h-8 text-xs" data-testid="fin-goal-preset-select">
          <SelectValue placeholder={t('finGoal.selectTarget')} />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {FIN_GOAL_PRESETS.map((preset) => (
            <SelectItem key={preset.key} value={preset.key}>
              {t(preset.labelKey)}
            </SelectItem>
          ))}
          <SelectItem value={FIN_GOAL_PRESET_CUSTOM}>{t('finGoal.presets.custom')}</SelectItem>
        </SelectContent>
      </Select>

      {selectedKey === FIN_GOAL_PRESET_CUSTOM && (
        <Input
          type="number"
          min="0"
          step="any"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder={t('finGoal.customPlaceholder')}
          className="h-8 text-xs"
          data-testid="fin-goal-custom-amount"
        />
      )}

      <Button
        type="button"
        size="sm"
        className="h-8 w-full text-xs"
        onClick={handleApply}
        disabled={!isCustomValid}
        data-testid="fin-goal-apply"
      >
        {t('finGoal.setTarget')}
      </Button>
    </div>
  );
}