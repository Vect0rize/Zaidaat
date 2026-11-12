-- Reorder Thekedars / Contractors before Carpenters in the Skilled Trade Directory
UPDATE professional_categories SET sort_order = 1 WHERE slug = 'thekedars-contractors';
UPDATE professional_categories SET sort_order = 2 WHERE slug = 'carpenters';
