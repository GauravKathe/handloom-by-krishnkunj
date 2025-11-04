import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
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

    // Set up realtime listeners for content and categories
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .limit(5);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("available", true)
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

    if (data?.content && typeof data.content === 'object' && 'bannerImages' in data.content) {
      setHeroContent(data.content as { bannerImages: string[] });
    }
  };

  const defaultHeroSlides = [
    { image: heroImage1, title: "Elegance Woven With Love", subtitle: "Discover the art of traditional handloom sarees" },
    { image: heroImage2, title: "Where Tradition Meets Soul", subtitle: "Premium Paithani sarees crafted by master artisans" },
    { image: heroImage3, title: "Heritage in Every Thread", subtitle: "Supporting women artisans across India" },
  ];

  // Map banner images to slides format
  const bannerImages = (heroContent && typeof heroContent === 'object' && 'bannerImages' in heroContent) 
    ? (heroContent as { bannerImages: string[] }).bannerImages 
    : [];
    
  const bannerSlides = bannerImages.map((img: string, idx: number) => ({
    image: img,
    title: defaultHeroSlides[idx]?.title || "Discover Beautiful Sarees",
    subtitle: defaultHeroSlides[idx]?.subtitle || "Handcrafted with love and tradition",
  }));

  const heroSlides = bannerSlides.length > 0 ? bannerSlides : defaultHeroSlides;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Carousel */}
        <section className="relative">
          <Carousel
            opts={{ loop: true }}
            plugins={[
              Autoplay({
                delay: 3000,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {heroSlides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="relative h-[400px] md:h-[600px] overflow-hidden">
                    <img 
                      src={slide.image} 
                      alt={slide.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center md:justify-start">
                      <div className="text-center md:text-left px-4 md:px-16 max-w-3xl">
                        <h2 className="text-3xl md:text-6xl font-bold text-background mb-4 animate-fade-in drop-shadow-lg">
                          {slide.title}
                        </h2>
                        <p className="text-base md:text-xl text-background/90 mb-8 animate-fade-in drop-shadow-md">
                          {slide.subtitle}
                        </p>
                        <Button size="lg" asChild className="animate-fade-in shadow-lg">
                          <Link to="/shop">Explore Collection</Link>
                        </Button>
                      </div>
                    </div>
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/shop?category=${category.id}`}
                className="group"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-0">
                    <div className="aspect-square rounded-full overflow-hidden m-4 bg-gradient-to-br from-secondary/20 to-primary/20">
                      <img
                        src={categoryImages[category.name] || category.image_url || "/placeholder.svg"}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((product) => (
                <Link key={product.id} to={`/product/${product.id}`} className="group">
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="aspect-square overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10">
                        <img
                          src={product.images?.[0] || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            ₹{product.price.toLocaleString()}
                          </span>
                          <Button size="sm">View Details</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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
