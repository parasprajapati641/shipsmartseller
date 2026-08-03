-- ShipSmart Seller — Production Supabase Schema
-- Run this script in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/quldwrzfdxjopnzwjqrq/sql)

-- 1. Create user_subscriptions table (Ground Truth for User Credits & Subscriptions)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_email TEXT PRIMARY KEY,
  subscription_plan TEXT NOT NULL DEFAULT 'trial',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  is_trial BOOLEAN NOT NULL DEFAULT true,
  free_generations_used INTEGER NOT NULL DEFAULT 0,
  free_generations_limit INTEGER NOT NULL DEFAULT 999999,
  subscription_started_at BIGINT,
  subscription_expires_at BIGINT,
  trial_reminders_sent JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create optimization_history table (Ground Truth for User History)
CREATE TABLE IF NOT EXISTS public.optimization_history (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  filename TEXT,
  category TEXT,
  generation_type TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  thumb_url TEXT,
  original_url TEXT,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast queries isolated by user_email
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_email ON public.user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_optimization_history_user_email ON public.optimization_history(user_email);
CREATE INDEX IF NOT EXISTS idx_optimization_history_created_at ON public.optimization_history(created_at DESC);

-- Enable RLS & Configure Public Access Policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
DROP POLICY IF EXISTS "Allow all read user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow all read user_subscriptions" ON public.user_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all write user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow all write user_subscriptions" ON public.user_subscriptions FOR ALL USING (true);

-- RLS Policies for optimization_history
DROP POLICY IF EXISTS "Allow all read optimization_history" ON public.optimization_history;
CREATE POLICY "Allow all read optimization_history" ON public.optimization_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all write optimization_history" ON public.optimization_history;
CREATE POLICY "Allow all write optimization_history" ON public.optimization_history FOR ALL USING (true);

-- 3. Create Public Storage Bucket 'optimization-images'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('optimization-images', 'optimization-images', true, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies for optimization-images bucket
DROP POLICY IF EXISTS "Allow public select optimization-images" ON storage.objects;
CREATE POLICY "Allow public select optimization-images" ON storage.objects FOR SELECT USING (bucket_id = 'optimization-images');

DROP POLICY IF EXISTS "Allow public insert optimization-images" ON storage.objects;
CREATE POLICY "Allow public insert optimization-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'optimization-images');

DROP POLICY IF EXISTS "Allow public update optimization-images" ON storage.objects;
CREATE POLICY "Allow public update optimization-images" ON storage.objects FOR UPDATE USING (bucket_id = 'optimization-images');

DROP POLICY IF EXISTS "Allow public delete optimization-images" ON storage.objects;
CREATE POLICY "Allow public delete optimization-images" ON storage.objects FOR DELETE USING (bucket_id = 'optimization-images');
