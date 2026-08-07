create or replace function public.public_trending_campaigns(p_limit int default 12)
returns table (
  id uuid,
  title text,
  category text,
  budget_total numeric,
  budget_remaining numeric,
  thumbnail_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.title, c.category::text, c.budget_total, c.budget_remaining, c.thumbnail_url
  from public.campaigns c
  where c.status = 'active'
  order by (c.budget_total - c.budget_remaining) desc, c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 24))
$$;

revoke all on function public.public_trending_campaigns(int) from public;
grant execute on function public.public_trending_campaigns(int) to anon, authenticated, service_role;
