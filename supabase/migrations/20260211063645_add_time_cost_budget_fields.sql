/*
  # Add Time Cost and Budget Fields

  ## Overview
  This migration adds time cost tracking to expenses and goals, and adds budget tracking to goals for comprehensive financial planning.

  ## Changes Made

  ### 1. Goals Table (`goals`)
  - **New Column**: `time_cost` (text)
    - Type: text
    - Default: empty string
    - Description: Time investment for the goal (e.g., "2h 30m", "3 days")
    - Used for tracking both financial cost and time investment
  
  - **New Column**: `budget` (decimal)
    - Type: decimal(15,2)
    - Default: 0
    - Description: Allocated budget for the goal in NTD
    - Used for budget allocation and tracking

  ### 2. Expenses Table (`expenses`)
  - **New Column**: `time_cost` (text)
    - Type: text
    - Default: empty string
    - Description: Time investment for the expense (e.g., "2h 30m", "3 days")
    - Used for tracking both financial cost and time investment
    - Syncs with task timeCost or goal timeCost when linked

  ## Sync Behavior
  - When a goal is created, its linked expense receives the same time_cost and budget values
  - When a task is created, its linked expense receives the task's timeCost value
  - When editing a goal's time_cost or budget, the linked expense is automatically updated
  - When editing an expense's time_cost linked to a goal, the goal is automatically updated
  - When editing an expense's time_cost linked to a task, the task is automatically updated

  ## Important Notes
  - All existing records receive default values (empty string for time_cost, 0 for budget)
  - Migration is safe and non-destructive
  - No data loss occurs
  - Bidirectional sync is handled at the application level

  ## Security
  - No changes to RLS policies required
  - Existing policies continue to apply to all columns including new fields

  ## Performance
  - No new indexes needed
  - Columns use efficient data types (text for time_cost, decimal for budget)
*/

-- Add time_cost and budget columns to goals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'time_cost'
  ) THEN
    ALTER TABLE goals ADD COLUMN time_cost text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'budget'
  ) THEN
    ALTER TABLE goals ADD COLUMN budget decimal(15,2) DEFAULT 0;
  END IF;
END $$;

-- Add time_cost column to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'time_cost'
  ) THEN
    ALTER TABLE expenses ADD COLUMN time_cost text DEFAULT '';
  END IF;
END $$;
