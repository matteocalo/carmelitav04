
-- Aggiungi la colonna per la password del portale
ALTER TABLE public.photo_jobs
ADD COLUMN IF NOT EXISTS portal_password text;

-- Creare tabella per i commenti
CREATE TABLE IF NOT EXISTS public.job_comments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id uuid NOT NULL REFERENCES public.photo_jobs(id) ON DELETE CASCADE,
    text text NOT NULL,
    client_name text NOT NULL,
    photographer_response text,
    is_read boolean DEFAULT false NOT NULL,
    user_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Permessi RLS per la tabella dei commenti
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;

-- Aggiungere policy di sicurezza per i commenti
CREATE POLICY "Photographers can view job comments" ON public.job_comments
FOR SELECT
USING (
    job_id IN (
        SELECT id FROM public.photo_jobs
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Photographers can update job comments" ON public.job_comments
FOR UPDATE
USING (
    job_id IN (
        SELECT id FROM public.photo_jobs
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    job_id IN (
        SELECT id FROM public.photo_jobs
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Clients can insert job comments" ON public.job_comments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.photo_jobs
        WHERE id = job_id
    )
);

-- Policy to allow anonymous access for inserting comments
CREATE POLICY "Anonymous users can insert job comments" ON public.job_comments
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.photo_jobs
        WHERE id = job_id
    )
);

-- Creare indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_job_comments_job_id ON public.job_comments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_comments_is_read ON public.job_comments(is_read);
