import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { markUserGuideSeen } from '@/lib/onboarding';
import { useI18n, type TranslationKey } from '@/i18n';

interface UserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTION_KEYS: { title: TranslationKey; body: TranslationKey }[] = [
  { title: 'userGuide.sections.timeNav.title', body: 'userGuide.sections.timeNav.body' },
  { title: 'userGuide.sections.income.title', body: 'userGuide.sections.income.body' },
  { title: 'userGuide.sections.goals.title', body: 'userGuide.sections.goals.body' },
  { title: 'userGuide.sections.currency.title', body: 'userGuide.sections.currency.body' },
  { title: 'userGuide.sections.backup.title', body: 'userGuide.sections.backup.body' },
  { title: 'userGuide.sections.monthlySummary.title', body: 'userGuide.sections.monthlySummary.body' },
  { title: 'userGuide.sections.sankey.title', body: 'userGuide.sections.sankey.body' },
  { title: 'userGuide.sections.fixedFreq.title', body: 'userGuide.sections.fixedFreq.body' },
];

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
  const { t } = useI18n();

  const handleClose = (next: boolean) => {
    if (!next) {
      markUserGuideSeen();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('userGuide.title')}</DialogTitle>
          <DialogDescription>{t('userGuide.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {SECTION_KEYS.map((section) => (
            <section key={section.title}>
              <h3 className="font-semibold text-foreground mb-1">{t(section.title)}</h3>
              <p className="text-muted-foreground leading-relaxed">{t(section.body)}</p>
            </section>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => handleClose(false)}>{t('userGuide.gotIt')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}