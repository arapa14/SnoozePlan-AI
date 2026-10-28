-- =====================================================================
-- 000_reset.sql  |  SnoozePlan AI
-- Menghapus SEMUA tabel/objek aplikasi lama. DATA AKAN HILANG PERMANEN.
-- Tabel auth.users (akun login Supabase) TIDAK disentuh.
-- =====================================================================

-- Trigger pada auth.users (dibuat oleh skema sebelumnya, jika ada)
drop trigger if exists on_auth_user_created on auth.users;

-- Tabel (urutan dari anak ke induk; CASCADE membersihkan policy, index, FK)
drop table if exists public.reschedule_history cascade;
drop table if exists public.task_logs          cascade;
drop table if exists public.scheduled_blocks   cascade;
drop table if exists public.fixed_schedules    cascade;
drop table if exists public.schedules          cascade;  -- tabel lama dari README versi pertama
drop table if exists public.tasks              cascade;
drop table if exists public.profiles           cascade;

-- Fungsi
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at()  cascade;

-- Tipe enum
drop type if exists public.task_category     cascade;
drop type if exists public.task_status       cascade;
drop type if exists public.block_status      cascade;
drop type if exists public.reschedule_status cascade;

-- ---------------------------------------------------------------------
-- OPSIONAL: jika ada tabel lain yang tidak Anda kenali di schema public
-- dan ingin dibersihkan semuanya, hapus tanda komentar blok di bawah.
-- ---------------------------------------------------------------------
-- do $$
-- declare r record;
-- begin
--   for r in (select tablename from pg_tables where schemaname = 'public') loop
--     execute format('drop table if exists public.%I cascade', r.tablename);
--   end loop;
-- end $$;