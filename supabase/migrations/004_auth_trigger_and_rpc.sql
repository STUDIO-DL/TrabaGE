-- =============================================
-- 004_auth_trigger_and_rpc.sql
-- =============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'candidate'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION get_application_cv_url(app_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cv_url TEXT;
  v_job_company UUID;
BEGIN
  SELECT a.cv_url, j.company_id
  INTO v_cv_url, v_job_company
  FROM applications a JOIN jobs j ON a.job_id = j.id
  WHERE a.id = app_id;

  IF v_job_company != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN v_cv_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
