-- ============================================================
-- ChargeQ — Fix: site_managers RLS policy
-- Run this in Supabase SQL Editor if site manager registration
-- form submissions are failing silently.
--
-- The issue: the original migration only allowed INSERT via RPC
-- but self-service registration does a direct INSERT.
-- ============================================================

-- Allow anyone to submit a registration (status defaults to 'pending')
-- Managers cannot read or update their own records — only SA can via RPC
DROP POLICY IF EXISTS "managers_insert" ON public.site_managers;

CREATE POLICY "managers_insert_registration" ON public.site_managers
  FOR INSERT
  WITH CHECK (status = 'pending');

-- Confirm the policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'site_managers';
