/*
  # Create Financial Tracking Tables

  ## Overview
  This migration creates a comprehensive financial tracking system with tables for incomes, expenses, savings, goals, fixed expenses, and financial targets.

  ## New Tables

  ### 1. `incomes`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this income
  - `date` (date) - Date of income
  - `source` (text) - Source of income
  - `amount` (decimal) - Amount in NTD
  - `income_type` (text) - Type: 'cash' or 'accrued'
  - `note` (text, optional) - Additional notes
  - `review_count` (integer) - Number of times reviewed
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `expenses`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this expense
  - `date` (date) - Date of expense
  - `description` (text) - Expense description
  - `amount` (decimal) - Amount in NTD
  - `needs_check` (boolean) - Whether expense needs review
  - `review_count` (integer) - Number of times reviewed
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. `savings`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this saving
  - `date` (date) - Date of savings record
  - `amount` (decimal) - Savings amount in NTD
  - `saving_type` (text) - Type: 'balance' or 'goal'
  - `note` (text, optional) - Additional notes
  - `review_count` (integer) - Number of times reviewed
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `goals`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this goal
  - `title` (text) - Goal title
  - `deadline` (date, optional) - Goal deadline
  - `completed` (boolean) - Completion status
  - `is_magic_wand` (boolean) - Magic wand flag
  - `linked_expense_id` (uuid, optional) - Reference to linked expense
  - `pre_tasks` (jsonb) - Array of pre-tasks
  - `post_tasks` (jsonb) - Array of post-tasks
  - `post_dreams` (jsonb) - Array of post-dreams
  - `ideations` (jsonb) - Array of ideations
  - `goal_constraint` (text) - Constraint description
  - `url_pack` (jsonb) - Array of URLs
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. `fixed_expenses`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this expense
  - `description` (text) - Expense description
  - `amount` (decimal) - Amount in NTD
  - `frequency` (text) - Frequency: 'weekly', 'monthly', 'quarterly', 'yearly'
  - `is_active` (boolean) - Whether expense is active
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. `financial_targets`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, references auth.users) - User who owns this target
  - `type` (text) - Target type: 'income', 'expense', 'savings'
  - `amount` (decimal) - Target amount in NTD
  - `period` (text) - Period: 'weekly', 'monthly', 'quarterly', 'yearly'
  - `currency` (text) - Currency: 'NTD', 'USD', 'CAD'
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
*/

-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  source text NOT NULL,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  income_type text NOT NULL DEFAULT 'cash',
  note text,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incomes"
  ON incomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incomes"
  ON incomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomes"
  ON incomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own incomes"
  ON incomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  needs_check boolean DEFAULT false,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create savings table
CREATE TABLE IF NOT EXISTS savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  saving_type text NOT NULL DEFAULT 'balance',
  note text,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE savings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings"
  ON savings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings"
  ON savings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings"
  ON savings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings"
  ON savings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  deadline date,
  completed boolean DEFAULT false,
  is_magic_wand boolean DEFAULT false,
  linked_expense_id uuid,
  pre_tasks jsonb DEFAULT '[]'::jsonb,
  post_tasks jsonb DEFAULT '[]'::jsonb,
  post_dreams jsonb DEFAULT '[]'::jsonb,
  ideations jsonb DEFAULT '[]'::jsonb,
  goal_constraint text DEFAULT '',
  url_pack jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create fixed_expenses table
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'monthly',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed expenses"
  ON fixed_expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed expenses"
  ON fixed_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed expenses"
  ON fixed_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed expenses"
  ON fixed_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create financial_targets table
CREATE TABLE IF NOT EXISTS financial_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  amount decimal(15,2) NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'monthly',
  currency text NOT NULL DEFAULT 'NTD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial targets"
  ON financial_targets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial targets"
  ON financial_targets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial targets"
  ON financial_targets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial targets"
  ON financial_targets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON incomes(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON savings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user ON fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_targets_user ON financial_targets(user_id, type, period);
