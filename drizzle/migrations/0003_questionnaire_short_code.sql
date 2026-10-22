ALTER TABLE public.questionnaire_sessions ADD COLUMN short_code text;
CREATE UNIQUE INDEX questionnaire_sessions_short_code_key ON public.questionnaire_sessions (short_code);