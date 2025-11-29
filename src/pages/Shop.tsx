import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function Shop() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "all");
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();

    // Real-time subscription for product changes
    const channel = supabase
      .channel('shop-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCategory, priceRange, selectedColors, availableOnly, searchParams]);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    setCategories(data || []);
  };

  const loadProducts = async () => {
    let query = supabase.from("products").select("*, categories(name)");

    if (selectedCategory !== "all") {
      query = query.eq("category_id", selectedCategory);
    }

    if (availableOnly) {
      query = query.eq("available", true);
    }

    query = query.gte("price", priceRange[0]).lte("price", priceRange[1]);

    if (selectedColors.length > 0) {
      query = query.in("color", selectedColors);
    }

    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query;
    setProducts(data || []);
  };

  const colors = ["Red", "Blue", "Green", "Gold", "Maroon", "Pink", "Yellow", "Purple"];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-8">Shop Sarees</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="font-semibold text-lg mb-4">Filters</h3>

              {/* Category Filter */}
              <div className="mb-6">
                <Label className="mb-2 block">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <Label className="mb-2 block">
                  Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                </Label>
                <Slider
                  min={0}
                  max={500000}
                  step={5000}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="mt-2"
                />
              </div>

              {/* Color Filter */}
              <div className="mb-6">
                <Label className="mb-3 block">Colors</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {colors.map((color) => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={color}
                        checked={selectedColors.includes(color)}
                        onCheckedChange={(checked) => {
                          setSelectedColors(
                            checked
                              ? [...selectedColors, color]
                              : selectedColors.filter((c) => c !== color)
                          );
                        }}
                      />
                      <label
                        htmlFor={color}
                        className="text-sm cursor-pointer select-none"
                      >
                        {color}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="available"
                  checked={availableOnly}
                  onCheckedChange={(checked) => setAvailableOnly(checked as boolean)}
                />
                <label htmlFor="available" className="text-sm cursor-pointer">
                  In Stock Only
                </label>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {products.length} saree{products.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">No sarees found matching your filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
