-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for site_content table
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;