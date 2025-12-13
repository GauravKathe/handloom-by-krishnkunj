-- =====================================================
-- COMPLETE DATABASE EXPORT FOR KRISHN KUNJ HANDLOOM
-- Generated: 2025-12-13
-- =====================================================

-- =====================================================
-- STEP 1: CREATE ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT
);

-- Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price NUMERIC NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    available BOOLEAN NOT NULL DEFAULT true,
    is_new_arrival BOOLEAN NOT NULL DEFAULT false,
    is_best_seller BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    original_price NUMERIC NOT NULL DEFAULT 0,
    offer_price NUMERIC,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}'::text[],
    fabric TEXT,
    color TEXT,
    sku TEXT
);

-- Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL
);

-- User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Add-ons Table
CREATE TABLE public.add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    description TEXT
);

-- Cart Items Table
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    selected_add_ons UUID[] DEFAULT '{}'::uuid[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    total_amount NUMERIC NOT NULL,
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    discount_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    coupon_code TEXT
);

-- Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    selected_add_ons UUID[] DEFAULT '{}'::uuid[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    item_total NUMERIC,
    product_name TEXT,
    product_image TEXT,
    product_description TEXT,
    product_sku TEXT,
    product_color TEXT,
    product_fabric TEXT
);

-- Coupons Table
CREATE TABLE public.coupons (
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_percentage NUMERIC NOT NULL,
    minimum_purchase_amount NUMERIC NOT NULL DEFAULT 0,
    max_usage_limit INTEGER NOT NULL DEFAULT 1,
    current_usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active'::text,
    code TEXT NOT NULL
);

-- Reviews Table
CREATE TABLE public.reviews (
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id),
    rating INTEGER NOT NULL,
    verified_purchase BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment TEXT,
    images TEXT[] DEFAULT '{}'::text[]
);

-- Site Content Table
CREATE TABLE public.site_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    section TEXT NOT NULL
);

-- Login Attempts Table
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    email TEXT NOT NULL,
    ip_address TEXT
);

-- Auth Events Table
CREATE TABLE public.auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    email TEXT,
    event_type TEXT NOT NULL
);

-- Admin Activity Log Table
CREATE TABLE public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL
);

-- Processed Webhook Events Table
CREATE TABLE public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    event_type TEXT NOT NULL,
    payment_id TEXT NOT NULL UNIQUE
);

-- =====================================================
-- STEP 3: CREATE FUNCTIONS
-- =====================================================

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- handle_new_user function (for creating profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mobile_number, city, state)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'state', '')
  );
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES
-- =====================================================

-- Categories policies
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Products policies
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() IS NOT NULL) AND (auth.uid() = id));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() IS NOT NULL) AND (auth.uid() = id));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING ((auth.uid() IS NOT NULL) AND has_role(auth.uid(), 'admin'::app_role));

-- User Roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add-ons policies
CREATE POLICY "Anyone can view add-ons" ON public.add_ons FOR SELECT USING (true);
CREATE POLICY "Admins can insert add-ons" ON public.add_ons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update add-ons" ON public.add_ons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete add-ons" ON public.add_ons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Cart Items policies
CREATE POLICY "Users can view own cart" ON public.cart_items FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert into own cart" ON public.cart_items FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own cart" ON public.cart_items FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete from own cart" ON public.cart_items FOR DELETE USING ((auth.uid() = user_id));

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING ((auth.uid() = user_id));
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Order Items policies
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1 FROM orders WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM orders WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert order items" ON public.order_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update order items" ON public.order_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Coupons policies
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING ((status = 'active'::text) AND (expiry_date > now()));
CREATE POLICY "Admins can view all coupons" ON public.coupons FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING ((auth.uid() = user_id));
CREATE POLICY "Admins can delete reviews" ON public.reviews FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Site Content policies
CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete site content" ON public.site_content FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Auth Events policies
CREATE POLICY "Admins can view auth events" ON public.auth_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin Activity Log policies
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Login Attempts policies
CREATE POLICY "No direct access - use RPC functions only" ON public.login_attempts FOR ALL USING (false) WITH CHECK (false);

-- Processed Webhook Events policies
CREATE POLICY "No direct access - use RPC functions only" ON public.processed_webhook_events FOR ALL USING (false) WITH CHECK (false);

-- =====================================================
-- STEP 6: CREATE TRIGGERS
-- =====================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 7: INSERT DATA
-- =====================================================

-- Categories
INSERT INTO public.categories (id, created_at, name, description, image_url) VALUES
('489d386b-4bd8-4aa5-bc35-26a891acac30', '2025-11-29 14:32:18.340471+00', 'Double Pallu Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426737869.jpeg'),
('721ccb98-72dc-44b9-914f-2f135ca9e610', '2025-11-29 14:32:58.525503+00', 'Triple Muniya Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426777608.jpeg'),
('30900977-8141-4c72-873f-ff9f2c0793d2', '2025-11-29 14:33:22.893743+00', 'Single Muniya Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426802991.jpeg'),
('1d180310-5b85-496c-ae79-f9e639e4fa1f', '2025-11-29 14:33:47.35189+00', 'Hand Painted Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426827403.jpeg'),
('5e0c91c1-ce70-45a0-88b1-6820f9a7e569', '2025-11-29 14:34:31.683054+00', 'Kanjivaram Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426871745.jpeg'),
('65831b59-d14b-4b5e-b85a-2f8171e86992', '2025-11-29 14:35:02.897714+00', 'All Over Paithani', '', 'https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/category-1764426901325.jpg');

-- Add-ons
INSERT INTO public.add_ons (id, price, created_at, name, description) VALUES
('b1f717eb-69dd-4cc4-be7b-180499af93e0', 500.00, '2025-11-01 14:49:08.902448+00', 'Blouse Stitching', 'Professional blouse stitching service'),
('251600b4-2975-4c9d-bab8-9d3ca3f6f9a2', 300.00, '2025-11-01 14:49:08.902448+00', 'Saree Fall Beading', 'Traditional fall and pico beading');

-- Site Content
INSERT INTO public.site_content (id, content, created_at, updated_at, section) VALUES
('e2e897c5-72af-4b6f-91f6-2546acc56229', '{"content": "We are passionate about preserving the art of handloom weaving and bringing you the finest handmade sarees.", "title": "About Us"}', '2025-11-03 19:18:30.372648+00', '2025-11-03 19:18:30.372648+00', 'about_us'),
('ff6f63a2-d130-4bcb-aa02-21f46af70c10', '{"address": "Your Address Here", "description": "Get in touch with us for any queries", "email": "handloombykrishnkunj@gmail.com", "phone": "+91 1234567890"}', '2025-11-03 19:18:30.372648+00', '2025-11-03 19:18:30.372648+00', 'contact'),
('c01b7299-8e67-4061-8a8c-7c70e531d7c0', '{"delivery_charge": 0}', '2025-11-05 13:33:16.579141+00', '2025-11-05 13:33:16.579141+00', 'settings'),
('8be2b357-5c6e-44a2-9f24-78a46d2c52c0', '{"bannerSlides": [{"image": "https://lqhvsafeatkgaxxvyeje.supabase.co/storage/v1/object/public/site-content/banner-1765011952460.jpg", "subtitle": "Add your subtitle text", "title": "Your Headline Here"}]}', '2025-11-03 19:18:30.372648+00', '2025-12-09 10:53:29.634898+00', 'homepage_hero'),
('ed40705a-0418-4ed5-8ca6-038fad468d46', '{"enabled": true, "text": "<p>100% of today!!!</p>"}', '2025-11-26 19:02:31.398365+00', '2025-12-12 03:52:35.659527+00', 'marquee_banner');

-- Coupons
INSERT INTO public.coupons (expiry_date, id, discount_percentage, minimum_purchase_amount, max_usage_limit, current_usage_count, created_at, updated_at, status, code) VALUES
('2025-12-19 00:00:00+00', '79209ccd-2fc2-48ce-b438-e97897e2fbf2', 10, 15999, 2000, 0, '2025-12-09 10:47:20.541718+00', '2025-12-09 10:49:44.878836+00', 'active', 'KK2025');

-- =====================================================
-- NOTE: Products, Profiles, Orders, Order Items data
-- needs to be exported separately as they contain 
-- large text/JSON fields. Use the Lovable Cloud 
-- interface to export individual tables.
-- =====================================================

-- =====================================================
-- STEP 8: CREATE STORAGE BUCKETS
-- Run these in the Supabase Dashboard SQL editor
-- =====================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('site-content', 'site-content', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- =====================================================
-- END OF EXPORT
-- =====================================================
