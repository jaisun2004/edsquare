CREATE TABLE public.demo_records (
  id text PRIMARY KEY,
  kind text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_records TO service_role;
ALTER TABLE public.demo_records ENABLE ROW LEVEL SECURITY;