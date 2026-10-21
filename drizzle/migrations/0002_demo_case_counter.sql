CREATE TABLE public.demo_case_counter (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), last int NOT NULL DEFAULT 0);
GRANT ALL ON public.demo_case_counter TO service_role;
ALTER TABLE public.demo_case_counter ENABLE ROW LEVEL SECURITY;
INSERT INTO public.demo_case_counter (id, last) VALUES (1, 0) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.next_demo_case_id(floor_n int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; saved int;
BEGIN
  SELECT coalesce(max((substring(id from '^case:CASE-(\d+)$'))::int), 0) INTO saved FROM public.demo_records WHERE kind = 'case';
  INSERT INTO public.demo_case_counter (id, last) VALUES (1, 0) ON CONFLICT DO NOTHING;
  UPDATE public.demo_case_counter SET last = greatest(last, floor_n, saved) + 1 WHERE id = 1 RETURNING last INTO n;
  RETURN n;
END $$;
CREATE OR REPLACE FUNCTION public.reset_demo_case_counter() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ UPDATE public.demo_case_counter SET last = 0 WHERE id = 1 $$;
REVOKE ALL ON FUNCTION public.next_demo_case_id(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_demo_case_counter() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_demo_case_id(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_demo_case_counter() TO service_role;