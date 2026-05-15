-- Allow users to SELECT their own prayer_requests regardless of status
-- (so they can see active, expired, and any other non-deleted statuses on "My Prayers" page)
create policy "prayers_select_own"
  on public.prayer_requests for select
  using (auth.uid() = user_id);
