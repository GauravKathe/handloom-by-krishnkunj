-- Reload PostgREST schema cache to recognize the new foreign key relationship
NOTIFY pgrst, 'reload schema';