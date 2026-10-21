CREATE TABLE public.questionnaire_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  header jsonb NOT NULL DEFAULT '{}'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);
GRANT ALL ON public.questionnaire_sessions TO service_role;
ALTER TABLE public.questionnaire_sessions ENABLE ROW LEVEL SECURITY;