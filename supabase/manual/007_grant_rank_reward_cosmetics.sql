-- Rank reward cosmetics: SECURITY DEFINER RPC for weekly/monthly leaderboard grants.
-- Call from Supabase Edge Function (service_role) or admin dashboard (authenticated admin).

CREATE OR REPLACE FUNCTION public.grant_rank_reward_cosmetics(
  p_period text,
  p_ref timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
  v_ok boolean;
  v_start timestamptz;
  v_end timestamptz;
  r_item record;
  v_cond jsonb;
  v_winner uuid;
  v_pos int;
  v_grants int := 0;
  v_skipped int := 0;
  v_scope text;
  v_plat text;
  v_cid uuid;
  v_cat text;
  v_item_period text;
  v_inserted int;
  v_log jsonb := '[]'::jsonb;
BEGIN
  v_jwt_role := coalesce(auth.jwt()->>'role', '');
  v_ok := (v_jwt_role = 'service_role')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));
  IF NOT v_ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_period NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'invalid p_period (use weekly or monthly)';
  END IF;

  IF p_period = 'weekly' THEN
    v_end := date_trunc('week', p_ref);
    v_start := v_end - interval '7 days';
  ELSE
    v_end := date_trunc('month', p_ref);
    v_start := v_end - interval '1 month';
  END IF;

  FOR r_item IN
    SELECT *
    FROM public.cosmetic_items
    WHERE unlock_type = 'rank_reward' AND is_active = true
  LOOP
    v_cond := r_item.rank_reward_condition;
    IF v_cond IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_item_period := v_cond->>'period';
    IF v_item_period IS NULL OR v_item_period <> p_period THEN
      CONTINUE;
    END IF;

    BEGIN
      v_pos := (v_cond->>'position')::int;
    EXCEPTION WHEN others THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END;

    IF v_pos IS NULL OR v_pos < 1 OR v_pos > 3 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_scope := v_cond->>'scope';
    v_winner := NULL;

    IF v_scope = 'platform' THEN
      v_plat := lower(trim(coalesce(v_cond->>'platform', 'tiktok')));
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND s.platform = v_plat::public.social_platform
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;

    ELSIF v_scope = 'campaign' THEN
      IF nullif(trim(v_cond->>'campaign_id'), '') IS NULL THEN
        v_skipped := v_skipped + 1;
        CONTINUE;
      END IF;
      v_cid := (v_cond->>'campaign_id')::uuid;
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND s.campaign_id = v_cid
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;

    ELSIF v_scope = 'category' THEN
      v_cat := lower(trim(coalesce(v_cond->>'category', 'music')));
      WITH agg AS (
        SELECT
          s.creator_id,
          SUM(FLOOR(GREATEST(s.manual_views, 0)::numeric / 1000) + 50)::bigint AS pts,
          SUM(GREATEST(s.manual_views, 0))::bigint AS vws
        FROM public.submissions s
        INNER JOIN public.campaigns c ON c.id = s.campaign_id
        WHERE s.status = 'approved'
          AND s.created_at >= v_start
          AND s.created_at < v_end
          AND c.category = v_cat::public.campaign_category
        GROUP BY s.creator_id
      ),
      ranked AS (
        SELECT creator_id, ROW_NUMBER() OVER (ORDER BY pts DESC, vws DESC, creator_id) AS rnk
        FROM agg
      )
      SELECT creator_id INTO v_winner FROM ranked WHERE rnk = v_pos;
    ELSE
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_winner IS NULL THEN
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'result', 'no_qualifying_creator'
      ));
      CONTINUE;
    END IF;

    INSERT INTO public.creator_cosmetics (user_id, cosmetic_id, unlocked_reason)
    VALUES (v_winner, r_item.id, 'rank_reward')
    ON CONFLICT (user_id, cosmetic_id) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted > 0 THEN
      v_grants := v_grants + 1;
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'user_id', v_winner,
        'result', 'granted'
      ));
    ELSE
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'cosmetic_id', r_item.id,
        'name', r_item.name,
        'user_id', v_winner,
        'result', 'already_owned'
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'period', p_period,
    'window_start', v_start,
    'window_end', v_end,
    'grants_new', v_grants,
    'rules_skipped_bad_config', v_skipped,
    'details', v_log
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_rank_reward_cosmetics(text, timestamptz) TO authenticated;
