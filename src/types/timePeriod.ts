export type TimePeriod = {
  type: 'year' | 'quarter' | 'month' | 'week';
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  label: string;
  startDate: Date;
  endDate: Date;
};