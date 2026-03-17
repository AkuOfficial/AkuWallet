-- Remove old catch-all defaults
DELETE FROM categories WHERE is_default = TRUE AND name IN ('Other Expense', 'Other Income');

-- Expense categories
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Food & Dining',    'expense', 'utensils',       '#ef4444', TRUE),
  ('Groceries',        'expense', 'shopping-cart',  '#f97316', TRUE),
  ('Transport',        'expense', 'car',             '#f59e0b', TRUE),
  ('Shopping',         'expense', 'shopping-bag',   '#a855f7', TRUE),
  ('Bills & Utilities','expense', 'receipt',         '#3b82f6', TRUE),
  ('Health',           'expense', 'heart-pulse',    '#ec4899', TRUE),
  ('Entertainment',    'expense', 'film',            '#06b6d4', TRUE),
  ('Education',        'expense', 'graduation-cap', '#6366f1', TRUE),
  ('Travel',           'expense', 'plane',           '#14b8a6', TRUE),
  ('Personal Care',    'expense', 'sparkles',        '#f472b6', TRUE),
  ('Home',             'expense', 'home',            '#84cc16', TRUE),
  ('Subscriptions',    'expense', 'refresh-cw',     '#8b5cf6', TRUE)
ON CONFLICT DO NOTHING;

-- Income categories
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Salary',        'income', 'briefcase',   '#22c55e', TRUE),
  ('Freelance',     'income', 'laptop',      '#3b82f6', TRUE),
  ('Business',      'income', 'building-2',  '#f97316', TRUE),
  ('Investments',   'income', 'trending-up', '#14b8a6', TRUE),
  ('Rental Income', 'income', 'home',        '#84cc16', TRUE),
  ('Bonus',         'income', 'star',        '#eab308', TRUE),
  ('Gifts',         'income', 'gift',        '#ec4899', TRUE),
  ('Refunds',       'income', 'rotate-ccw',  '#8b5cf6', TRUE)
ON CONFLICT DO NOTHING;
