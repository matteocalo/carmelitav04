-- Create photo_jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.photo_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('TBC', 'CONFIRMED', 'DOWNLOADED', 'IN_PROGRESS', 'READY_FOR_DOWNLOAD', 'READY_FOR_REVIEW', 'PENDING_PAYMENT', 'COMPLETED')) DEFAULT 'TBC',
  amount NUMERIC(10,2) DEFAULT 0,
  job_date TIMESTAMP WITH TIME ZONE,
  download_link TEXT,
  download_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add the end_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'photo_jobs' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.photo_jobs ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Enable Row Level Security for photo_jobs
ALTER TABLE public.photo_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for photo_jobs
CREATE POLICY IF NOT EXISTS "Users can CRUD their own photo_jobs"
  ON public.photo_jobs FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photo_jobs_user_id ON public.photo_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_client_id ON public.photo_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_job_date ON public.photo_jobs(job_date);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo_jobs
DROP TRIGGER IF EXISTS set_updated_at_photo_jobs ON public.photo_jobs;
CREATE TRIGGER set_updated_at_photo_jobs
  BEFORE UPDATE ON public.photo_jobs
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();