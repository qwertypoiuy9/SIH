-- Run this in your Supabase SQL Editor to fix the Operator Approvals

-- 1. Allow all authenticated users (including Government officers) to view profiles
-- This ensures the government dashboard can fetch the list of pending Mandi Operators
CREATE POLICY "profile_select_all" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow government users to update profiles
-- This ensures the government officer can click "Approve" and update the operator's designation
CREATE POLICY "profile_update_govt" ON public.profiles
  FOR UPDATE USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'government'
  );

-- 3. Add the rejection_reason column to the profiles table
-- This allows you to store the reason why an operator was rejected
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
