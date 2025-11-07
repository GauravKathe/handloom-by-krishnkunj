import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-accent text-accent-foreground mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4">Handloom by Krishnkunj</h3>
            <p className="text-sm opacity-90">
              Preserving Indian heritage through exquisite handmade sarees crafted by local artisans.
              Every thread tells a story of tradition and love.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="hover:text-secondary transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-secondary transition-colors">
                  Shop Sarees
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-secondary transition-colors">
                  Customer Reviews
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-secondary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shipping" className="hover:text-secondary transition-colors">
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-secondary transition-colors">
                  Returns & Exchange
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-secondary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-secondary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Balaji Krupa, Kanadi Lane, DG Road, Yeola, Dist. Nashik - 423401</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+91 9730142172</span>
              </li>
              <li className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>contact@handloombykrishnkunj.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 opacity-0" />
                  <span>handloombykrishnkunj@gmail.com</span>
                </div>
              </li>
            </ul>

            {/* Social Media */}
            <div className="flex space-x-4 mt-6">
              <a 
                href="https://www.facebook.com/handloombykrishnkunj" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-secondary transition-colors"
                aria-label="Visit our Facebook page"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/handloom_by_krishnkunj?igsh=MXYzOXNkMXl2OXU5eQ==" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-secondary transition-colors"
                aria-label="Visit our Instagram page"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="mailto:contact@handloombykrishnkunj.com" 
                className="hover:text-secondary transition-colors"
                aria-label="Send us an email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-accent-foreground/20 mt-8 pt-8 text-center text-sm opacity-75">
          <p>&copy; 2025 Handloom by Krishnkunj. All rights reserved. Made with love for tradition.</p>
        </div>
      </div>
    </footer>
  );
};
