import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarqueeBanner } from "@/components/MarqueeBanner";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroImage1 from "@/assets/saree-hero-1.jpg";
import heroImage2 from "@/assets/saree-hero-2.jpg";
import heroImage3 from "@/assets/saree-hero-3.jpg";
import categoryBanarasi from "@/assets/category-banarasi.jpg";
import categoryCotton from "@/assets/category-cotton.jpg";
import categoryKanjivaram from "@/assets/category-kanjivaram.jpg";
import categoryPaithani from "@/assets/category-paithani.jpg";
import categorySilk from "@/assets/category-silk.jpg";

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const categoryImages: Record<string, string> = {
    "Banarasi Sarees": categoryBanarasi,
    "Cotton Sarees": categoryCotton,
    "Kanjivaram Sarees": categoryKanjivaram,
    "Paithani Sarees": categoryPaithani,
    "Silk Sarees": categorySilk,
  };

  useEffect(() => {
    loadData();
    loadHeroContent();

    // Set up realtime listeners for content, categories, and products
    const channel = supabase
      .channel('homepage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: 'section=eq.homepage_hero'
        },
        () => {
          loadHeroContent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .limit(6);

    setCategories(categoriesData || []);
    setFeaturedProducts(productsData || []);
  };

  const loadHeroContent = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "homepage_hero")
      .single();

    if (data?.content && typeof data.content === 'object') {
      setHeroContent(data.content as { 
        bannerImages?: string[]; 
        bannerSlides?: { image: string; title: string; subtitle: string }[];
        showTextOverlay?: boolean;
        bannerBgColor?: string;
      });
    }
  };

  const defaultHeroSlides = [
    { image: heroImage1, title: "Elegance Woven With Love", subtitle: "Discover the art of traditional handloom sarees" },
    { image: heroImage2, title: "Where Tradition Meets Soul", subtitle: "Premium Paithani sarees crafted by master artisans" },
    { image: heroImage3, title: "Heritage in Every Thread", subtitle: "Supporting women artisans across India" },
  ];

  // Get slides from new format or convert from legacy format
  const getHeroSlides = () => {
    if (!heroContent) return defaultHeroSlides;
    
    const content = heroContent as { 
      bannerImages?: string[]; 
      bannerSlides?: { image: string; title: string; subtitle: string }[];
      showTextOverlay?: boolean;
      bannerBgColor?: string;
    };
    
    // New format with full slide objects
    if (content.bannerSlides && content.bannerSlides.length > 0) {
      return content.bannerSlides;
    }
    
    // Legacy format with just image URLs
    if (content.bannerImages && content.bannerImages.length > 0) {
      return content.bannerImages.map((img, idx) => ({
        image: img,
        title: defaultHeroSlides[idx % defaultHeroSlides.length]?.title || "Discover Beautiful Sarees",
        subtitle: defaultHeroSlides[idx % defaultHeroSlides.length]?.subtitle || "Handcrafted with love and tradition",
      }));
    }
    
    return defaultHeroSlides;
  };

  const heroSlides = getHeroSlides();


  // Calculate items per page based on screen size
  const getItemsPerPage = () => {
    if (typeof window === 'undefined') return 5;
    if (window.innerWidth < 768) return 2; // mobile
    if (window.innerWidth < 1024) return 3; // tablet
    return 5; // desktop
  };

  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(categories.length / itemsPerPage);

  const scrollToPage = (page: number) => {
    if (!categoryScrollRef.current) return;
    const scrollAmount = categoryScrollRef.current.scrollWidth / totalPages;
    categoryScrollRef.current.scrollTo({
      left: scrollAmount * page,
      behavior: 'smooth'
    });
    setCurrentPage(page);
  };

  const handleScroll = () => {
    if (!categoryScrollRef.current) return;
    const scrollLeft = categoryScrollRef.current.scrollLeft;
    const scrollWidth = categoryScrollRef.current.scrollWidth;
    const clientWidth = categoryScrollRef.current.clientWidth;
    const page = Math.round((scrollLeft / (scrollWidth - clientWidth)) * (totalPages - 1));
    setCurrentPage(page);
  };

  const scrollLeft = () => {
    if (currentPage > 0) scrollToPage(currentPage - 1);
  };

  const scrollRight = () => {
    if (currentPage < totalPages - 1) scrollToPage(currentPage + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <MarqueeBanner />
      <Navbar />

      <main className="flex-1">
        {/* Hero Carousel */}
        <section className="relative w-full">
          <Carousel
            opts={{ 
              loop: true,
              align: "start"
            }}
            plugins={[
              Autoplay({
                delay: 3000,
                stopOnInteraction: false,
                stopOnMouseEnter: true
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {heroSlides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="relative w-full h-[70vh]">
                    <img 
                      src={slide.image} 
                      alt={slide.title}
                      className="w-full h-[70vh] object-cover object-center"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </section>

        {/* Categories Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Explore Our Collections
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each saree is a masterpiece, handcrafted with love and tradition by skilled artisans
            </p>
          </div>

          <div className="relative overflow-hidden px-12">
            {/* Navigation Arrows */}
            {categories.length > itemsPerPage && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-[40%] -translate-y-1/2 z-10 bg-background hover:bg-primary hover:text-primary-foreground shadow-xl border-2"
                  onClick={scrollLeft}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-[40%] -translate-y-1/2 z-10 bg-background hover:bg-primary hover:text-primary-foreground shadow-xl border-2"
                  onClick={scrollRight}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            <div 
              ref={categoryScrollRef}
              onScroll={handleScroll}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide"
            >
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/shop?category=${category.id}`}
                  className="group flex-shrink-0 snap-start w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(20%-19.2px)]"
                >
                  <div className="flex flex-col items-center">
                    <div className="aspect-square w-full rounded-full overflow-hidden bg-gradient-to-br from-secondary/20 to-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <img
                        src={categoryImages[category.name] || category.image_url || "/placeholder.svg"}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Scroll Indicators (Dots) */}
            {categories.length > itemsPerPage && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToPage(index)}
                    className={`h-3 rounded-full transition-all duration-300 ${
                      currentPage === index 
                        ? 'w-10 bg-primary shadow-md' 
                        : 'w-3 bg-muted-foreground/40 hover:bg-muted-foreground/70'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section className="bg-card py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Featured Sarees
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Handpicked selections that celebrate the beauty of Indian craftsmanship
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="text-center mt-12">
              <Button size="lg" variant="outline" asChild>
                <Link to="/shop">View All Sarees</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="text-secondary text-xl">★</span>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    "The saree quality is exceptional and the craftsmanship is visible in every detail. 
                    Truly a piece of art!"
                  </p>
                  <p className="font-semibold">- Happy Customer</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="link" asChild>
              <Link to="/reviews">Read More Reviews →</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
