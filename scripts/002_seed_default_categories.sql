-- Insert default expense categories (user_id NULL for defaults)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Food & Dining', 'expense', 'utensils', '#ef4444', TRUE),
  ('Transportation', 'expense', 'car', '#f97316', TRUE),
  ('Shopping', 'expense', 'shopping-bag', '#eab308', TRUE),
  ('Entertainment', 'expense', 'gamepad-2', '#a855f7', TRUE),
  ('Bills & Utilities', 'expense', 'receipt', '#3b82f6', TRUE),
  ('Healthcare', 'expense', 'heart-pulse', '#ec4899', TRUE),
  ('Education', 'expense', 'graduation-cap', '#6366f1', TRUE),
  ('Travel', 'expense', 'plane', '#14b8a6', TRUE),
  ('Groceries', 'expense', 'shopping-cart', '#22c55e', TRUE),
  ('Other Expense', 'expense', 'circle-ellipsis', '#71717a', TRUE);

-- Insert default income categories
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Salary', 'income', 'briefcase', '#22c55e', TRUE),
  ('Freelance', 'income', 'laptop', '#3b82f6', TRUE),
  ('Investments', 'income', 'trending-up', '#14b8a6', TRUE),
  ('Rental Income', 'income', 'home', '#f97316', TRUE),
  ('Gifts', 'income', 'gift', '#ec4899', TRUE),
  ('Refunds', 'income', 'rotate-ccw', '#8b5cf6', TRUE),
  ('Other Income', 'income', 'circle-ellipsis', '#71717a', TRUE);
