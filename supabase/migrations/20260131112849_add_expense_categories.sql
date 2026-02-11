/*
  # Add Category Fields to Expenses Tables

  ## Overview
  This migration adds category classification to both one-time expenses and fixed expenses, enabling better expense tracking and visualization.

  ## Changes Made

  ### 1. Expenses Table (`expenses`)
  - **New Column**: `category` (text)
    - Type: text with CHECK constraint
    - Valid values: 'food', 'lifestyle', 'family', 'miscellaneous'
    - Default: 'miscellaneous'
    - Description: Categorizes one-time expenses into spending types
  
  ### 2. Fixed Expenses Table (`fixed_expenses`)
  - **New Column**: `category` (text)
    - Type: text with CHECK constraint
    - Valid values: 'housing', 'utilities', 'transportation', 'health', 'financial-obligations', 'taxes'
    - Default: 'housing'
    - Description: Categorizes recurring fixed expenses into spending types

  ## Security
  - No changes to RLS policies required
  - Existing policies continue to apply to all columns including the new category fields

  ## Performance
  - Added indexes on category columns for efficient filtering and grouping
  - Indexes support category-based queries and analytics

  ## Important Notes
  - All existing records receive default categories
  - Category values are constrained to prevent invalid data
  - Migration is safe and reversible
*/

-- Add category column to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'category'
  ) THEN
    ALTER TABLE expenses ADD COLUMN category text DEFAULT 'miscellaneous' NOT NULL;
    
    ALTER TABLE expenses ADD CONSTRAINT expenses_category_check 
      CHECK (category IN ('food', 'lifestyle', 'family', 'miscellaneous'));
  END IF;
END $$;

-- Add category column to fixed_expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_expenses' AND column_name = 'category'
  ) THEN
    ALTER TABLE fixed_expenses ADD COLUMN category text DEFAULT 'housing' NOT NULL;
    
    ALTER TABLE fixed_expenses ADD CONSTRAINT fixed_expenses_category_check 
      CHECK (category IN ('housing', 'utilities', 'transportation', 'health', 'financial-obligations', 'taxes'));
  END IF;
END $$;

-- Create indexes for efficient category-based queries
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_category ON fixed_expenses(user_id, category);
