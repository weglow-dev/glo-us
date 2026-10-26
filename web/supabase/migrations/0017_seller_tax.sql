-- ============================================================
-- 0017 — 셀러 정산 구분 (프리랜서 원천징수 / 사업자 세금계산서)
--
-- 프리랜서(개인) 셀러의 수수료는 사업소득이라 지급 시 3.3%
-- (소득세 3% + 지방소득세 0.3%)를 원천징수한 금액을 입금한다.
-- 사업자 셀러는 세금계산서 기준으로 수수료 전액을 지급한다.
--
-- settled_amount(수수료)는 그대로 두고, 확정 시점의 구분·원천징수·
-- 실지급액을 별도 스냅샷으로 남긴다. 이전에 확정된 회차(스냅샷 없음)는
-- 화면에서 셀러의 현재 구분으로 계산해 보여준다.
-- Run in Supabase Dashboard → SQL Editor (after 0016).
-- ============================================================

alter table public.sellers
  add column if not exists tax_type text not null default 'freelancer'
    check (tax_type in ('freelancer', 'business'));
-- 사업자등록번호 (사업자만, 세금계산서 발행용)
alter table public.sellers add column if not exists business_no text;

alter table public.groupbuy_rounds
  add column if not exists settled_tax_type text
    check (settled_tax_type in ('freelancer', 'business'));
alter table public.groupbuy_rounds add column if not exists settled_withholding integer;
alter table public.groupbuy_rounds add column if not exists settled_net integer;
