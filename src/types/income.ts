export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  note?: string;
  reviewCount?: number;
}
