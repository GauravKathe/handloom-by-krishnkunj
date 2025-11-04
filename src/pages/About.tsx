import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import artisanImage from "@/assets/artisan-weaving.jpg";

export default function About() {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    loadContent();

    // Set up realtime listener for site_content changes
    const channel = supabase
      .channel('about-content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_content',
          filter: 'section=eq.about_us'
        },
        () => {
          // Reload content when it changes
          loadContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadContent = async () => {
    const { data } = await supabase
      .from("site_content")
      .select("*")
      .eq("section", "about_us")
      .single();

    if (data) {
      setContent(data.content);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[300px] md:h-[400px] overflow-hidden">
          <img
            src={artisanImage}
            alt="Artisan weaving saree"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/70 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4">
              <h1 className="text-4xl md:text-6xl font-bold text-background max-w-2xl drop-shadow-lg">
                {content?.title || "Our Story"}
              </h1>
              <p className="text-xl md:text-2xl text-background/90 mt-4 max-w-xl drop-shadow-md">
                {content?.subtitle || "Where tradition meets soul, and every thread tells a story"}
              </p>
            </div>
          </div>
        </section>

        {/* Story Content */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                A Legacy of Love and Craftsmanship
              </h2>
              
              <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                In the heart of India, where ancient looms still sing their timeless songs, 
                Handloom by Krishnkunj was born from a simple yet profound dream – to preserve 
                the dying art of traditional handloom weaving and empower the women artisans 
                who breathe life into every thread.
              </p>

              <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                Our journey began in a small village in Maharashtra, where we met Savitri, 
                a master weaver whose weathered hands had created magic on her loom for over 
                four decades. Her eyes sparkled with pride as she showed us a Paithani saree 
                that had taken her three months to complete. "This is not just fabric," she said, 
                "this is my soul woven into art."
              </p>

              <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                That moment changed everything. We realized that behind every exquisite saree 
                lies countless hours of dedication, generations of inherited skill, and the 
                indomitable spirit of women who refuse to let their craft fade into history.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
              <Card className="bg-card/50">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</div>
                  <p className="text-muted-foreground">Women Artisans</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">50+</div>
                  <p className="text-muted-foreground">Villages Supported</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">10,000+</div>
                  <p className="text-muted-foreground">Sarees Crafted</p>
                </CardContent>
              </Card>
            </div>

            <div className="prose prose-lg max-w-none">
              <h3 className="text-2xl md:text-3xl font-bold text-primary mb-4">
                Our Mission
              </h3>
              
              <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                At Handloom by Krishnkunj, we don't just sell sarees – we share stories, 
                preserve heritage, and create sustainable livelihoods. Every purchase you make 
                directly supports a woman artisan, helping her send her children to school, 
                access better healthcare, and live with dignity.
              </p>

              <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                We work directly with weaver cooperatives across India, ensuring fair wages, 
                safe working conditions, and respect for traditional techniques. We believe 
                that the hands that create such beauty deserve nothing less than our deepest 
                gratitude and unwavering support.
              </p>

              <h3 className="text-2xl md:text-3xl font-bold text-primary mb-4 mt-8">
                Our Promise
              </h3>
              
              <ul className="space-y-3 text-foreground/80 text-base md:text-lg">
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>100% authentic handloom sarees with no machine intervention</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Fair trade practices that ensure artisans receive fair compensation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Sustainable and eco-friendly production methods</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Preservation of traditional weaving techniques</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">✓</span>
                  <span>Transparent sourcing and production process</span>
                </li>
              </ul>

              <p className="text-foreground/80 leading-relaxed text-base md:text-lg mt-6">
                When you wear a saree from Handloom by Krishnkunj, you're not just wearing 
                a garment – you're wrapping yourself in centuries of tradition, the dreams 
                of countless artisans, and the promise of a brighter future for handloom weaving.
              </p>

              <p className="text-lg md:text-xl font-semibold text-primary mt-8 text-center italic">
                "Every thread tells a story. Every saree changes a life."
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
