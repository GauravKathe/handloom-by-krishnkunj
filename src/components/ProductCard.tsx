import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ProductCardProps {
  product: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images || ["/placeholder.svg"];

  return (
    <Link to={`/product/${product.id}`} className="group">
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full">
        <CardContent className="p-0">
          <div 
            className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary/10 to-primary/10"
            onMouseEnter={() => {
              if (images.length > 1) {
                setCurrentImageIndex(1);
              }
            }}
            onMouseLeave={() => setCurrentImageIndex(0)}
          >
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${product.name} - ${index + 1}`}
                className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-500 ${
                  currentImageIndex === index ? "opacity-100 group-hover:scale-105" : "opacity-0"
                }`}
                style={{ transitionProperty: 'opacity, transform' }}
              />
            ))}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              {product.is_new_arrival && (
                <Badge className="bg-secondary text-secondary-foreground shadow-md">
                  New
                </Badge>
              )}
              {product.is_best_seller && (
                <Badge className="bg-primary text-primary-foreground shadow-md">
                  Bestseller
                </Badge>
              )}
              {!product.available && (
                <Badge variant="destructive" className="shadow-md">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {product.name}
            </h3>
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {product.description}
            </p>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xl md:text-2xl font-bold text-primary">
                ₹{Number(product.price).toLocaleString()}
              </span>
              <Button size="sm" className="shadow-sm">
                View Details
              </Button>
            </div>
            {product.fabric && (
              <p className="text-xs text-muted-foreground mt-2">
                Fabric: {product.fabric}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
