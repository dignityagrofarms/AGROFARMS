-- Permanently purge unassigned legacy dummy egg collection records from broiler farm
DELETE FROM public.farm_activities
WHERE id = '300f32af-f824-40bf-b005-e42b47e8383b'
   OR (batch_id IS NULL AND activity_type = 'Egg Collection' AND notes ILIKE '%jumbo eggs%');

