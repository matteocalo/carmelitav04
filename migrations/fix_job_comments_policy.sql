-- Fix for job_comments RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clients can insert job comments" ON public.job_comments;
DROP POLICY IF EXISTS "Anonymous users can insert job comments" ON public.job_comments;

-- Create new policy to allow clients to insert comments
CREATE POLICY "Clients can insert job comments" ON public.job_comments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.photo_jobs
        WHERE id = job_id
    )
);

-- Create policy to allow anonymous access for inserting comments
CREATE POLICY "Anonymous users can insert job comments" ON public.job_comments
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.photo_jobs
        WHERE id = job_id
    )
);

-- Grant necessary permissions to anon role
GRANT INSERT ON public.job_comments TO anon;