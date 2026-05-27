ALTER TABLE public.bay_taken_incidents
  ADD COLUMN IF NOT EXISTS fault_type TEXT;
