-- Run this once in Supabase SQL Editor.

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS edit_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS shift_id text,
    ADD COLUMN IF NOT EXISTS seat_id text;

ALTER TABLE public.library_seats
    ADD COLUMN IF NOT EXISTS shift_id text;

ALTER TABLE public.library_seats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
        AND policyname = 'Users can read their own bookings'
    ) THEN
        CREATE POLICY "Users can read their own bookings"
            ON public.bookings FOR SELECT
            TO authenticated USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
        AND policyname = 'Users can edit their own bookings once'
    ) THEN
        CREATE POLICY "Users can edit their own bookings once"
            ON public.bookings FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid() AND edit_count < 1)
            WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'library_seats'
        AND policyname = 'Anyone can read library seat availability'
    ) THEN
        CREATE POLICY "Anyone can read library seat availability"
            ON public.library_seats FOR SELECT
            TO anon, authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'library_seats'
        AND policyname = 'Admins can manage library seats'
    ) THEN
        CREATE POLICY "Admins can manage library seats"
            ON public.library_seats FOR ALL
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            ));
    END IF;
END
$$;

ALTER TABLE public.bookings
    DROP CONSTRAINT IF EXISTS bookings_edit_count_check;

ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_edit_count_check CHECK (edit_count >= 0 AND edit_count <= 1);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
        AND policyname = 'Admins can manage bookings'
    ) THEN
        CREATE POLICY "Admins can manage bookings"
            ON public.bookings FOR ALL
            TO authenticated
            USING (EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            ))
            WITH CHECK (EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            ));
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_by uuid REFERENCES auth.users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_settings'
        AND policyname = 'Authenticated users can read app settings'
    ) THEN
        CREATE POLICY "Authenticated users can read app settings"
            ON public.app_settings FOR SELECT
            TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_settings'
        AND policyname = 'Admins can manage app settings'
    ) THEN
        CREATE POLICY "Admins can manage app settings"
            ON public.app_settings FOR ALL
            TO authenticated
            USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
            ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'app_settings'
        AND policyname = 'Public users can read app settings'
    ) THEN
        CREATE POLICY "Public users can read app settings"
            ON public.app_settings FOR SELECT
            TO anon, authenticated USING (true);
    END IF;
END
$$;

INSERT INTO public.app_settings (key, value)
VALUES (
    'library_prices',
    '{"shift1":500,"shift2":600,"shift3":700,"shift4":800}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Role-based security hardening. Run after the statements above.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_name_format_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_name_format_check
            CHECK (
                name IS NULL OR name = '' OR (
                    name = btrim(name)
                    AND name ~ '^[[:alpha:]]+( [[:alpha:]]+)*$'
                )
            ) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_mobile_format_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_mobile_format_check
            CHECK (
                mobile IS NULL OR mobile = ''
                OR mobile ~ '^[6-9][0-9]{9}$'
            ) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_email_format_check'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_email_format_check
            CHECK (
                email IS NULL
                OR email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
            ) NOT VALID;
    END IF;
END
$$;

ALTER TABLE public.profiles
    ALTER COLUMN role SET DEFAULT 'user';

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'disabled'));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('profiles', 'bookings', 'rooms', 'library_seats', 'app_settings')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    END LOOP;
END
$$;

-- Profiles: a user can only see/edit their own profile. Admins can manage profiles.
CREATE POLICY "profiles_user_select_own"
    ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "profiles_user_insert_own"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() AND role = 'user');

CREATE POLICY "profiles_user_update_own"
    ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() AND role <> 'admin')
    WITH CHECK (id = auth.uid() AND role = 'user');

CREATE POLICY "profiles_admin_manage"
    ON public.profiles FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Bookings: users see/create/update only their own pending booking rows.
CREATE POLICY "bookings_user_select_own"
    ON public.bookings FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "bookings_user_insert_own"
    ON public.bookings FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "bookings_user_update_own"
    ON public.bookings FOR UPDATE TO authenticated
    USING (user_id = auth.uid() AND edit_count < 1)
    WITH CHECK (user_id = auth.uid() AND edit_count <= 1);

CREATE POLICY "bookings_admin_manage"
    ON public.bookings FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Prevent a normal user from changing booking ownership, type, resources, price, or approval.
CREATE OR REPLACE FUNCTION public.protect_user_booking_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.user_id := OLD.user_id;
        NEW.booking_type := OLD.booking_type;
        NEW.room_id := OLD.room_id;
        NEW.shift_id := OLD.shift_id;
        NEW.seat_id := OLD.seat_id;
        NEW.amount := OLD.amount;
        NEW.status := OLD.status;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_booking_fields_trigger ON public.bookings;

CREATE TRIGGER protect_user_booking_fields_trigger
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_booking_fields();

-- Validate booking contact details carried in booking notes from user booking forms.
CREATE OR REPLACE FUNCTION public.validate_user_booking_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    name_match text[];
    mobile_match text[];
    email_match text[];
BEGIN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
        name_match := regexp_match(
            COALESCE(NEW.notes, ''),
            E'(^|\\n)Name: ([^\\r\\n]+)'
        );
        mobile_match := regexp_match(
            COALESCE(NEW.notes, ''),
            E'(^|\\n)Mobile: ([^\\r\\n]+)'
        );
        email_match := regexp_match(
            COALESCE(NEW.notes, ''),
            E'(^|\\n)Email: ([^\\r\\n]+)'
        );

        IF TG_OP = 'INSERT'
           AND (
               name_match IS NULL
               OR name_match[2] !~ '^[[:alpha:]]+( [[:alpha:]]+)*$'
           ) THEN
            RAISE EXCEPTION 'Name can contain only letters and spaces.'
                USING ERRCODE = '23514';
        END IF;

        IF mobile_match IS NULL
           OR mobile_match[2] !~ '^[6-9][0-9]{9}$' THEN
            RAISE EXCEPTION 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
                USING ERRCODE = '23514';
        END IF;

        IF email_match IS NOT NULL
           AND email_match[2] !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$' THEN
            RAISE EXCEPTION 'Enter a valid email address.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_booking_contact_trigger ON public.bookings;

CREATE TRIGGER validate_user_booking_contact_trigger
    BEFORE INSERT OR UPDATE OF notes ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_booking_contact();

-- Rooms and seats are readable for availability pages, but writable only by admins.
CREATE POLICY "rooms_public_read"
    ON public.rooms FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "rooms_admin_manage"
    ON public.rooms FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "library_seats_public_read"
    ON public.library_seats FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "library_seats_admin_manage"
    ON public.library_seats FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Prices/settings are readable by the site, but only admins can change them.
CREATE POLICY "app_settings_public_read"
    ON public.app_settings FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "app_settings_admin_manage"
    ON public.app_settings FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- New Auth users get a profile with the safe role even if the frontend is modified.
CREATE OR REPLACE FUNCTION public.create_default_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_name text;
BEGIN
    profile_name := COALESCE(NEW.raw_user_meta_data ->> 'name', '');
    IF profile_name <> btrim(profile_name)
       OR profile_name !~ '^[[:alpha:]]+( [[:alpha:]]+)*$' THEN
        profile_name := 'User';
    END IF;

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        profile_name,
        'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_default_user_profile();

-- Enable Supabase Realtime for live dashboard and user booking updates.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END
$$;
