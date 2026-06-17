import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { markUserGuideSeen } from '@/lib/onboarding';

interface UserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SECTIONS = [
  {
    title: 'Time Navigator',
    body: 'Pick a year, quarter, month, or week on the left. Summary cards, tabs, and charts filter to that period. Goals always stay visible regardless of deadline.',
  },
  {
    title: 'Income, Expenses & Savings',
    body: 'Record cash flow in each tab. Duplicate any entry with the copy button. Expenses can link to goals; shadow expenses sync when you check off goal tasks.',
  },
  {
    title: 'Goals & Tasks',
    body: 'Set budgets, pre/post tasks, and ideations. Use Goal Budget Allocator to split savings across goals. Print a goals report from the Goals tab.',
  },
  {
    title: 'Currency',
    body: 'Amounts display in USD by default (switch in the header). If you enter NTD or CAD, the original amount appears as a badge on each entry card.',
  },
  {
    title: 'Backup & Export',
    body: 'Export JSON for a portable backup. Auto-backup keeps the last 5 snapshots locally. Print a backup report or restore the latest snapshot from the bottom panel.',
  },
  {
    title: 'Sankey Diagram',
    body: 'Click Income, Savings, Goals, or Expenses to drill down. Use the timeline breadcrumb to jump back. Category views show fixed vs one-time spending side by side.',
  },
  {
    title: 'Fixed Expense Frequencies',
    body: 'Bi-weekly = every 2 weeks. Bi-monthly = twice per month (~15 days), not every 2 months. Monthly equivalents are shown next to each fixed expense.',
  },
];

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
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
          <DialogTitle>Welcome to Cash Flow CFO</DialogTitle>
          <DialogDescription>
            A quick guide to tracking cash flow, goals, and backups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="font-semibold text-foreground mb-1">{section.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => handleClose(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}