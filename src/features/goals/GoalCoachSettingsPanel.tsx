import { Settings2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { getDefaultModelForProvider, GOAL_COACH_PROVIDER_OPTIONS } from '@/lib/goalCoachProviders';
import { isByokProvider } from '@/lib/goalCoachSettings';
import type { GoalCoachProvider, GoalCoachSettings } from '@/types/goalCoach';

interface GoalCoachSettingsPanelProps {
  settings: GoalCoachSettings;
  onChange: (next: Partial<GoalCoachSettings>) => void;
}

export default function GoalCoachSettingsPanel({
  settings,
  onChange,
}: GoalCoachSettingsPanelProps) {
  const { t } = useI18n();
  const showByok = isByokProvider(settings.provider);
  const defaultModel = getDefaultModelForProvider(settings.provider);

  const providerLabel = (provider: GoalCoachProvider) =>
    t(`goalReach.aiCoach.settings.providers.${provider}`);

  return (
    <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Settings2 className="h-4 w-4 text-muted-foreground" />
        {t('goalReach.aiCoach.settings.title')}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coach-provider">{t('goalReach.aiCoach.settings.providerLabel')}</Label>
          <Select
            value={settings.provider}
            onValueChange={(value) =>
              onChange({ provider: value as GoalCoachProvider, apiKey: settings.apiKey })
            }
          >
            <SelectTrigger id="coach-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_COACH_PROVIDER_OPTIONS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {providerLabel(provider)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coach-model">{t('goalReach.aiCoach.settings.modelLabel')}</Label>
          <Input
            id="coach-model"
            value={settings.model ?? ''}
            onChange={(e) => onChange({ model: e.target.value || undefined })}
            placeholder={defaultModel}
            className="text-sm"
          />
        </div>
      </div>

      {showByok && (
        <div className="space-y-2">
          <Label htmlFor="coach-api-key">{t('goalReach.aiCoach.settings.apiKeyLabel')}</Label>
          <Input
            id="coach-api-key"
            type="password"
            autoComplete="off"
            value={settings.apiKey ?? ''}
            onChange={(e) => onChange({ apiKey: e.target.value || undefined })}
            placeholder={t('goalReach.aiCoach.settings.apiKeyPlaceholder')}
            className="text-sm"
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {showByok
          ? t('goalReach.aiCoach.settings.byokHint')
          : t('goalReach.aiCoach.settings.serverHint')}
      </p>
    </div>
  );
}