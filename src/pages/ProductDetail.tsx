import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ZoomIn, ZoomOut, X, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState(1);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 });
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    // Scroll to top when product changes
    window.scrollTo(0, 0);
    loadProduct();
    loadAddOns();
    checkUser();
  }, [id]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const loadProduct = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .single();

    if (data) {
      setProduct(data);
      loadSimilarProducts(data.category_id);
    }
  };

  const loadAddOns = async () => {
    const { data } = await supabase.from("add_ons").select("*");
    setAddOns(data || []);
  };

  const loadSimilarProducts = async (categoryId: string) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("category_id", categoryId)
      .neq("id", id)
      .limit(4);

    setSimilarProducts(data || []);
  };

  const openZoom = (image: string) => {
    setZoomedImage(image);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeZoom = () => {
    setZoomedImage(null);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
    if (zoomLevel <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture
      const distance = getDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoomLevel(zoomLevel);
      setIsDragging(false);
    } else if (zoomLevel > 1 && e.touches.length === 1) {
      // Pan gesture
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch zoom
      e.preventDefault();
      const distance = getDistance(e.touches);
      const scale = distance / initialPinchDistance;
      const newZoomLevel = Math.min(Math.max(initialZoomLevel * scale, 1), 4);
      setZoomLevel(newZoomLevel);
      
      if (newZoomLevel <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      // Pan
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialPinchDistance(null);
  };

  const handleMagnifierMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const elem = e.currentTarget;
    const { left, top, width, height } = elem.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMagnifierPos({ x, y });
  };

  const handleMagnifierTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault(); // Prevent page scroll
      e.stopPropagation(); // Stop event bubbling
      const elem = e.currentTarget;
      const { left, top, width, height } = elem.getBoundingClientRect();
      const x = ((e.touches[0].clientX - left) / width) * 100;
      const y = ((e.touches[0].clientY - top) / height) * 100;
      setMagnifierPos({ x, y });
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to add items to cart",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check if item already exists in cart
    const { data: existingItem, error: fetchError } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking cart:", fetchError);
      toast({
        title: "Error",
        description: fetchError.message,
        variant: "destructive",
      });
      return;
    }

    if (existingItem) {
      // Update quantity
      const { error } = await supabase
        .from("cart_items")
        .update({
          quantity: existingItem.quantity + 1,
          selected_add_ons: selectedAddOns,
        })
        .eq("id", existingItem.id);

      if (error) {
        console.error("Error updating cart:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Updated cart!",
          description: "Item quantity has been updated in your cart",
        });
        // Trigger a custom event for real-time update
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } else {
      // Insert new item
      const { error } = await supabase
        .from("cart_items")
        .insert({
          user_id: user.id,
          product_id: id,
          quantity: 1,
          selected_add_ons: selectedAddOns,
        });

      if (error) {
        console.error("Error adding to cart:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Added to cart!",
          description: "Item has been added to your cart",
        });
        // Trigger a custom event for real-time update
        window.dispatchEvent(new Event('cartUpdated'));
      }
    }
  };


  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const totalPrice = Number(product.price) + 
    selectedAddOns.reduce((sum, addonId) => {
      const addon = addOns.find(a => a.id === addonId);
      return sum + (addon ? Number(addon.price) : 0);
    }, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Product Images */}
          <div>
            <Carousel className="w-full">
              <CarouselContent>
                {(product.images || ["/placeholder.svg"]).map((image: string, index: number) => (
                  <CarouselItem key={index}>
                    <div 
                      className="relative aspect-square rounded-lg overflow-visible bg-gradient-to-br from-secondary/10 to-primary/10 group cursor-pointer touch-none"
                      onMouseEnter={() => {
                        setShowMagnifier(true);
                        setCurrentImage(image);
                      }}
                      onMouseLeave={() => setShowMagnifier(false)}
                      onMouseMove={handleMagnifierMove}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMagnifier(true);
                        setCurrentImage(image);
                        handleMagnifierTouchMove(e);
                      }}
                      onTouchMove={handleMagnifierTouchMove}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setShowMagnifier(false);
                      }}
                    >
                      <img
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 rounded-lg"
                      />
                      
                      {/* Magnifier Lens - Works on all devices */}
                      {showMagnifier && currentImage === image && (
                        <div
                          className="absolute w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-primary rounded-full pointer-events-none z-50 shadow-2xl"
                          style={{
                            left: `${magnifierPos.x}%`,
                            top: `${magnifierPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            backgroundImage: `url(${image})`,
                            backgroundPosition: `${magnifierPos.x}% ${magnifierPos.y}%`,
                            backgroundSize: '250%',
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      )}

                      <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onClick={() => openZoom(image)}>
                        <Maximize2 className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 text-center text-background/80 text-xs sm:text-sm">
                        <p className="hidden md:block">Hover to magnify • Click icon for full view</p>
                        <p className="md:hidden">Touch & hold to magnify • Tap icon for zoom</p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>

            {/* Zoom Modal */}
            <Dialog open={!!zoomedImage} onOpenChange={closeZoom}>
              <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-black border-0">
                <div className="relative w-full h-full flex flex-col">
                  {/* Header with Controls */}
                  <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleZoomIn}
                          className="bg-background/20 hover:bg-background/30 text-white"
                          disabled={zoomLevel >= 4}
                        >
                          <ZoomIn className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleZoomOut}
                          className="bg-background/20 hover:bg-background/30 text-white"
                          disabled={zoomLevel <= 1}
                        >
                          <ZoomOut className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetZoom}
                          className="bg-background/20 hover:bg-background/30 text-white"
                          disabled={zoomLevel === 1}
                        >
                          Reset
                        </Button>
                        <span className="text-white text-sm ml-2">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeZoom}
                        className="bg-background/20 hover:bg-background/30 text-white"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Image Container */}
                  <div 
                    className="flex-1 flex items-center justify-center overflow-hidden p-16"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                      cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                  >
                    <img
                      src={zoomedImage || ""}
                      alt="Zoomed product"
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                      style={{
                        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                        transformOrigin: 'center center'
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Bottom Instructions */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="text-center text-white/80 text-sm">
                      <p className="hidden md:block">Use zoom controls to enlarge • Click and drag to pan when zoomed</p>
                      <p className="md:hidden">Pinch to zoom • Drag to pan • Use buttons to adjust</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3">
                {!product.available && (
                  <Badge variant="destructive" className="text-base px-3 py-1">
                    Currently Unavailable
                  </Badge>
                )}
                {product.is_new_arrival && (
                  <Badge className="bg-secondary">New Arrival</Badge>
                )}
                {product.is_best_seller && (
                  <Badge className="bg-primary">Bestseller</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {product.name}
              </h1>
              <p className="text-muted-foreground">
                Category: {product.categories?.name || "Handloom Saree"}
              </p>
            </div>

            <div className="text-4xl font-bold text-primary">
              ₹{totalPrice.toLocaleString()}
            </div>

            <div className="prose prose-sm max-w-none">
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Product Details */}
            <Card className="p-6 bg-card/50">
              <h3 className="font-semibold mb-4">Product Details</h3>
              <dl className="space-y-2 text-sm">
                {product.fabric && (
                  <>
                    <dt className="text-muted-foreground inline">Fabric:</dt>
                    <dd className="inline ml-2 font-medium">{product.fabric}</dd>
                    <br />
                  </>
                )}
                {product.color && (
                  <>
                    <dt className="text-muted-foreground inline">Color:</dt>
                    <dd className="inline ml-2 font-medium">{product.color}</dd>
                    <br />
                  </>
                )}
                <dt className="text-muted-foreground inline">Availability:</dt>
                <dd className="inline ml-2 font-medium">
                  {product.available ? "In Stock" : "Out of Stock"}
                </dd>
              </dl>
            </Card>

            {/* Add-ons */}
            {addOns.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Add-on Services</h3>
                <div className="space-y-3">
                  {addOns.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={addon.id}
                          checked={selectedAddOns.includes(addon.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAddOns(
                              checked
                                ? [...selectedAddOns, addon.id]
                                : selectedAddOns.filter((id) => id !== addon.id)
                            );
                          }}
                        />
                        <label htmlFor={addon.id} className="cursor-pointer">
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-sm text-muted-foreground">{addon.description}</p>
                        </label>
                      </div>
                      <span className="font-semibold">+₹{Number(addon.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!product.available && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                  <p className="text-destructive font-semibold mb-1">This product is currently unavailable</p>
                  <p className="text-sm text-muted-foreground">Please check back later or explore similar products below</p>
                </div>
              )}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={!product.available}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.available ? 'Add to Cart' : 'Out of Stock'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/submit-review')}
              >
                Write a Review
              </Button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section>
            <h2 className="text-2xl md:text-3xl font-bold text-primary mb-6">
              Similar Sarees
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {similarProducts.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <div className="aspect-square overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10">
                    <img
                      src={item.images?.[0] || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-1 mb-2">
                      {item.name}
                    </h3>
                    <p className="text-lg font-bold text-primary">
                      ₹{Number(item.price).toLocaleString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
