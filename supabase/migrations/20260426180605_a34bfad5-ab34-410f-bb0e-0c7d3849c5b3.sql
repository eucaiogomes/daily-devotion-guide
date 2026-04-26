DROP POLICY IF EXISTS "Users can view their own mission completions" ON public.mission_completions;
DROP POLICY IF EXISTS "Users can create their own mission completions" ON public.mission_completions;
DROP POLICY IF EXISTS "Users can update their own mission completions" ON public.mission_completions;

CREATE POLICY "Authenticated users can view their own mission completions"
ON public.mission_completions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE POLICY "Authenticated users can create their own mission completions"
ON public.mission_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE POLICY "Authenticated users can update their own mission completions"
ON public.mission_completions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
WITH CHECK (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can create their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Authenticated users can view their own push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE POLICY "Authenticated users can create their own push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE POLICY "Authenticated users can update their own push subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false)
WITH CHECK (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

CREATE POLICY "Authenticated users can delete their own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);