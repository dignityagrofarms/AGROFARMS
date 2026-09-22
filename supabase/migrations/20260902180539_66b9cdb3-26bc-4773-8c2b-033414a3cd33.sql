CREATE POLICY "Trusted server access to orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Trusted server access to discount vouchers" ON public.discount_vouchers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Trusted server access to app settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Trusted server access to newsletter subscribers" ON public.newsletter_subscribers FOR ALL TO service_role USING (true) WITH CHECK (true);