-- Complete schema for photo_jobs table
CREATE TABLE IF NOT EXISTS public.photo_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  client_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('TBC', 'CONFIRMED', 'DOWNLOADED', 'IN_PROGRESS', 'READY_FOR_DOWNLOAD', 'READY_FOR_REVIEW', 'PENDING_PAYMENT', 'COMPLETED')) DEFAULT 'TBC',
  amount NUMERIC(10,2) DEFAULT 0,
  job_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  download_link TEXT,
  download_expiry TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_photo_jobs_user_id ON public.photo_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_client_id ON public.photo_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_job_date ON public.photo_jobs(job_date);
CREATE INDEX IF NOT EXISTS idx_photo_jobs_end_date ON public.photo_jobs(end_date);

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