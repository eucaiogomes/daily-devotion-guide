CREATE TABLE public.mission_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 365),
  completed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  xp INTEGER NOT NULL DEFAULT 30 CHECK (xp >= 0),
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'offline-sync')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, completed_on)
);

ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mission completions"
ON public.mission_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mission completions"
ON public.mission_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mission completions"
ON public.mission_completions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_mission_completions_user_day ON public.mission_completions(user_id, day);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_mission_completions_updated_at
BEFORE UPDATE ON public.mission_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();