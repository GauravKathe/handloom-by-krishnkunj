import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FloatingContactSupport } from "@/components/FloatingContactSupport";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Reviews from "./pages/Reviews";
import NewArrivals from "./pages/NewArrivals";
import BestSellers from "./pages/BestSellers";
import Profile from "./pages/Profile";
import Returns from "./pages/Returns";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import FAQ from "./pages/FAQ";

import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminReviews from "./pages/admin/Reviews";
import AdminSettings from "./pages/admin/Settings";
import AdminCoupons from "./pages/admin/Coupons";
import AdminContentManagement from "./pages/admin/ContentManagement";
import AdminAnalytics from "./pages/admin/Analytics";
import PaymentAnalytics from "./pages/admin/PaymentAnalytics";
import CouponAnalytics from "./pages/admin/CouponAnalytics";
import ActivityLog from "./pages/admin/ActivityLog";
import RoleManagement from "./pages/admin/RoleManagement";
import MarqueeBannerAdmin from "./pages/admin/MarqueeBanner";
import AuthEvents from "./pages/admin/AuthEvents";
import ConsentManager from './components/ConsentManager';

const queryClient = new QueryClient();

// Admin route protection wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: hasAdminRole } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!hasAdminRole);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Customer route protection wrapper
const CustomerRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: hasAdminRole } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'admin' });
      setIsAdmin(!!hasAdminRole);
    } else {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Ensure CSRF token cookie is present on initial load for double-submit protection
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/csrf-token`, { method: 'GET', credentials: 'include' });
      } catch (e) {
        console.warn('Unable to fetch CSRF token', e instanceof Error ? e.message : e);
      }
    };
    fetchCsrf();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FloatingContactSupport />
      <BrowserRouter>
        <ConsentManager />
        <Routes>
          <Route path="/" element={<CustomerRoute><Home /></CustomerRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/shop" element={<CustomerRoute><Shop /></CustomerRoute>} />
          <Route path="/product/:id" element={<CustomerRoute><ProductDetail /></CustomerRoute>} />
          <Route path="/about" element={<CustomerRoute><About /></CustomerRoute>} />
          <Route path="/contact" element={<CustomerRoute><Contact /></CustomerRoute>} />
          <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
          <Route path="/checkout" element={<CustomerRoute><Checkout /></CustomerRoute>} />
          <Route path="/reviews" element={<CustomerRoute><Reviews /></CustomerRoute>} />
          <Route path="/new-arrivals" element={<CustomerRoute><NewArrivals /></CustomerRoute>} />
          <Route path="/best-sellers" element={<CustomerRoute><BestSellers /></CustomerRoute>} />
          <Route path="/profile" element={<CustomerRoute><Profile /></CustomerRoute>} />
          <Route path="/returns" element={<CustomerRoute><Returns /></CustomerRoute>} />
          <Route path="/privacy" element={<CustomerRoute><PrivacyPolicy /></CustomerRoute>} />
          <Route path="/faq" element={<CustomerRoute><FAQ /></CustomerRoute>} />
          
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="coupon-analytics" element={<CouponAnalytics />} />
            <Route path="activity-log" element={<ActivityLog />} />
            <Route path="role-management" element={<RoleManagement />} />
            <Route path="content" element={<AdminContentManagement />} />
            <Route path="marquee-banner" element={<MarqueeBannerAdmin />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="payment-analytics" element={<PaymentAnalytics />} />
            <Route path="auth-events" element={<AuthEvents />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
