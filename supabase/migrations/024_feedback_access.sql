-- Allow anon to insert feedback (RLS policy exists but table privilege was missing)
GRANT INSERT ON public.feedback TO anon;

-- Add role column to distinguish who submitted (driver vs manager vs superadmin)
ALTER TABLE public.feedback ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'driver';
