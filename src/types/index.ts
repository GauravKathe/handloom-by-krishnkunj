export interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  mobile_number?: string;
  city?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerProfile extends Profile {
  orders?: { count: number }[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_image?: string;
  product_sku?: string;
  product_color?: string;
  product_fabric?: string;
  quantity: number;
  price?: number;
  item_total?: number;
}

export interface OrderProfile {
  full_name?: string;
  email?: string;
  mobile_number?: string;
  city?: string;
  state?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  total_amount: number;
  discount_amount?: number;
  coupon_code?: string;
  shipping_address?: any;
  profiles?: OrderProfile;
  order_items?: OrderItem[];
  status: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  original_price?: number;
  offer_price?: number | null;
  images?: string[];
  category_id?: string;
  fabric?: string;
  color?: string;
  available?: boolean;
  created_at?: string;
  categories?: { name: string };
}

export interface Review {
  id: string;
  product_id: string;
  user_id?: string;
  rating: number;
  comment?: string;
  images?: string[];
  verified_purchase?: boolean;
  created_at?: string;
  profiles?: { full_name?: string };
  products?: { id?: string; name: string };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  expiry_date: string;
  minimum_purchase_amount: number;
  max_usage_limit: number;
  current_usage_count: number;
  status: string;
}
