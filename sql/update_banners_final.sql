-- Final update for banner filenames
-- Correcting the SQL to match the exact filenames found in the public directory (from file list).

UPDATE public.site_content
SET content = jsonb_build_object(
  'bannerSlides', jsonb_build_array(
    jsonb_build_object(
      'image', '/banner-new.webp',
      'title', 'New Arrivals',
      'subtitle', 'Explore our latest Paithani collection'
    ),
    jsonb_build_object(
      'image', '/banner-1762278118356.webp',
      'title', 'Exquisite Craftsmanship',
      'subtitle', 'Handwoven with passion and tradition'
    ),
    jsonb_build_object(
      'image', '/banner-1764892968523.webp',
      'title', 'Timeless Elegance',
      'subtitle', 'Perfect for weddings and special occasions'
    )
  ),
  'showTextOverlay', true,
  'bannerBgColor', '#f7f3ec'
)
WHERE section = 'homepage_hero';
