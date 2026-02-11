/*
  # Add Goal-Expense Sync and Categorization Fields

  ## Overview
  This migration enhances the bidirectional sync between goals and expenses, and adds categorization to goals.

  ## Changes Made

  ### 1. Goals Table (`goals`)
  - **New Column**: `category` (text)
    - Type: text with CHECK constraint
    - Valid values: 'food', 'lifestyle', 'family', 'misc'
    - Default: 'misc'
    - Description: Categorizes goals for better organization and expense alignment
    - Note: Uses ExpenseCategory type for consistency with expenses

  ### 2. Expenses Table (`expenses`)
  - **New Column**: `linked_goal_id` (uuid, optional)
    - Type: uuid
    - Description: References the goal this expense is linked to
    - Used for bidirectional sync between goals and expenses
  
  - **New Column**: `linked_task_id` (text, optional)
    - Type: text (stores the task/dream ID from jsonb)
    - Description: References the specific task or dream within a goal
    - Used to identify which pre-task, post-task, or post-dream created this expense
  
  - **New Column**: `linked_task_type` (text, optional)
    - Type: text with CHECK constraint
    - Valid values: 'pre', 'post', 'dream'
    - Description: Indicates whether the linked item is a pre-task, post-task, or post-dream
    - Works in conjunction with linked_task_id

  ## Important Notes
  - The jsonb fields (pre_tasks, post_tasks, post_dreams) in goals table will now include:
    - For pre_tasks and post_tasks: linkedExpenseId field
    - For post_dreams: cost, timeCost, and linkedExpenseId fields
  - These jsonb changes are handled at the application level
  - All existing records receive default values
  - Migration is safe and reversible

  ## Security
  - No changes to RLS policies required
  - Existing policies continue to apply to all columns including new fields

  ## Performance
  - Added indexes on linked fields for efficient join queries
  - Indexes support bidirectional lookups between goals and expenses
*/

-- Add category column to goals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'category'
  ) THEN
    ALTER TABLE goals ADD COLUMN category text DEFAULT 'misc' NOT NULL;
    
    ALTER TABLE goals ADD CONSTRAINT goals_category_check 
      CHECK (category IN ('food', 'lifestyle', 'family', 'misc'));
  END IF;
END $$;

-- Add linked goal and task fields to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'linked_goal_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN linked_goal_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'linked_task_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN linked_task_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'linked_task_type'
  ) THEN
    ALTER TABLE expenses ADD COLUMN linked_task_type text;
    
    ALTER TABLE expenses ADD CONSTRAINT expenses_task_type_check 
      CHECK (linked_task_type IN ('pre', 'post', 'dream') OR linked_task_type IS NULL);
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(user_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_linked_goal ON expenses(user_id, linked_goal_id);
CREATE INDEX IF NOT EXISTS idx_expenses_linked_task ON expenses(user_id, linked_task_id);
