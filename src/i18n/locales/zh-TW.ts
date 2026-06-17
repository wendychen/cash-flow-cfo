import type { Messages } from './en';

export const zhTW: Messages = {
  app: {
    title: 'Cash Flow CFO',
    subtitle: '個人現金流與目標規劃',
  },
  nav: {
    guide: '使用說明',
    exportJson: '匯出 JSON',
    importData: '匯入 JSON/CSV',
    reload: '重新載入',
    reset: '重置所有資料',
    displayCurrency: '顯示幣別',
  },
  summary: {
    totalIncome: '總收入',
    totalExpenses: '總支出',
    savings: '儲蓄',
    activeGoals: '進行中目標',
    totalTasks: '共 {count} 個任務',
  },
  tabs: {
    income: '收入',
    expenses: '支出',
    savings: '儲蓄',
    goals: '目標與任務',
  },
  charts: {
    visualizations: '現金流視覺化',
    visualizationsHint: '左側時間區間變更時，Sankey 與總覽圖表會自動更新',
    overview: '總覽圖表',
    simulator: '現金流模擬',
    simulatorHint: '依月平均金額進行 what-if 情境分析',
  },
  simulator: {
    incomeChange: '月收入變化',
    expenseChange: '月支出變化',
    horizon: '預測期間',
    months: '{count} 個月',
    endingSavings: '預估儲蓄',
    vsBaseline: '相較基準',
  },
  timeNav: {
    title: '時間導覽',
    expandAll: '全部展開',
    selected: '已選取：',
    clear: '清除選取',
    yearRange: '{start}–{end}',
  },
  goals: {
    export: '匯出目標',
    import: '匯入目標',
    importSuccess: '目標匯入成功。',
    importFailed: '匯入失敗：{error}',
  },
  language: {
    label: '語言',
    en: 'English',
    zh: '繁體中文',
    ja: '日本語',
  },
};