import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Search, Heart, Menu, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out successfully",
    });
    navigate("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const NavLinks = () => (
    <>
      <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
        Home
      </Link>
      <Link to="/shop" className="text-sm font-medium hover:text-primary transition-colors">
        Shop Sarees
      </Link>
      <Link to="/new-arrivals" className="text-sm font-medium hover:text-primary transition-colors">
        New Arrivals
      </Link>
      <Link to="/best-sellers" className="text-sm font-medium hover:text-primary transition-colors">
        Best Sellers
      </Link>
      <Link to="/about" className="text-sm font-medium hover:text-primary transition-colors">
        Our Story
      </Link>
      <Link to="/reviews" className="text-sm font-medium hover:text-primary transition-colors">
        Reviews
      </Link>
      <Link to="/contact" className="text-sm font-medium hover:text-primary transition-colors">
        Contact
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20 gap-2 md:gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-primary whitespace-nowrap">
              Handloom by Krishnkunj
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <NavLinks />
          </div>

          {/* Search and Icons */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search sarees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48 lg:w-64"
                />
              </div>
            </form>

            {/* Icons */}
            <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
              <Link to="/wishlist">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cart">
                <ShoppingCart className="h-5 w-5" />
              </Link>
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/wishlist" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="hidden md:inline-flex">
                <Link to="/auth">Login</Link>
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col space-y-6 mt-8">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search sarees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </form>

                  <div className="flex flex-col space-y-4">
                    <NavLinks />
                  </div>

                  {user ? (
                    <>
                      <Link to="/profile">
                        <Button variant="outline" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          My Profile
                        </Button>
                      </Link>
                      <Link to="/wishlist">
                        <Button variant="outline" className="w-full justify-start">
                          <Heart className="mr-2 h-4 w-4" />
                          Wishlist
                        </Button>
                      </Link>
                      <Button onClick={handleLogout} variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button asChild className="w-full">
                      <Link to="/auth">Login / Sign Up</Link>
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
