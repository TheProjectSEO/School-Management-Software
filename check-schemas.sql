-- Check which schema has teacher profiles
SELECT 'public' as schema_name, COUNT(*) as count FROM public.teacher_profiles
UNION ALL
SELECT 'school software', COUNT(*) FROM "school software".teacher_profiles
UNION ALL  
SELECT 'n8n_content_creation', COUNT(*) FROM n8n_content_creation.teacher_profiles;

-- Check which schema has schools
SELECT 'public' as schema_name, COUNT(*) as count FROM public.schools
UNION ALL
SELECT 'school software', COUNT(*) FROM "school software".schools
UNION ALL
SELECT 'n8n_content_creation', COUNT(*) FROM n8n_content_creation.schools;
