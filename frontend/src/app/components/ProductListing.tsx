import { useState } from 'react';
import { ArrowLeft, SlidersHorizontal, BadgeCheck, Package } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet';
import { products, categories } from '@/app/data/mock-data';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface ProductListingProps {
  onNavigate: (page: string, data?: any) => void;
  category?: string;
}

export function ProductListing({ onNavigate, category }: ProductListingProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(category ? [category] : []);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  const filteredProducts = products.filter((product) => {
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
      return false;
    }
    if (verifiedOnly && !product.sellerVerified) {
      return false;
    }
    if (priceRange === 'under-5000' && product.price >= 5000) {
      return false;
    }
    if (priceRange === '5000-15000' && (product.price < 5000 || product.price >= 15000)) {
      return false;
    }
    if (priceRange === 'above-15000' && product.price < 15000) {
      return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h4 className="mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.name)}
                onCheckedChange={() => toggleCategory(cat.name)}
              />
              <Label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer">
                {cat.name} ({cat.productCount})
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="mb-3">Price Range</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="price-all"
              checked={priceRange === 'all'}
              onCheckedChange={() => setPriceRange('all')}
            />
            <Label htmlFor="price-all" className="text-sm cursor-pointer">
              All Prices
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="price-under"
              checked={priceRange === 'under-5000'}
              onCheckedChange={() => setPriceRange('under-5000')}
            />
            <Label htmlFor="price-under" className="text-sm cursor-pointer">
              Under AFN 5,000
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="price-mid"
              checked={priceRange === '5000-15000'}
              onCheckedChange={() => setPriceRange('5000-15000')}
            />
            <Label htmlFor="price-mid" className="text-sm cursor-pointer">
              AFN 5,000 - 15,000
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="price-high"
              checked={priceRange === 'above-15000'}
              onCheckedChange={() => setPriceRange('above-15000')}
            />
            <Label htmlFor="price-high" className="text-sm cursor-pointer">
              Above AFN 15,000
            </Label>
          </div>
        </div>
      </div>

      {/* Verified Sellers */}
      <div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="verified"
            checked={verifiedOnly}
            onCheckedChange={(checked) => setVerifiedOnly(checked as boolean)}
          />
          <Label htmlFor="verified" className="text-sm cursor-pointer">
            Verified Sellers Only
          </Label>
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setSelectedCategories([]);
          setPriceRange('all');
          setVerifiedOnly(false);
        }}
      >
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onNavigate('home')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1>Products</h1>
            </div>
            
            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Filters */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card className="p-4 sticky top-20">
              <h3 className="mb-4">Filters</h3>
              <FilterContent />
            </Card>
          </aside>

          {/* Products */}
          <div className="flex-1">
            {/* Sort and Results */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                {sortedProducts.length} products found
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white"
                  onClick={() => onNavigate('product-detail', product)}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <ImageWithFallback
                      src={`https://source.unsplash.com/400x400/?${product.image}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.originalPrice && (
                      <Badge className="absolute top-2 left-2 bg-destructive">
                        {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{product.name}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-primary">AFN {product.price.toLocaleString()}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                          AFN {product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {product.sellerVerified && <BadgeCheck className="w-3 h-3 text-primary" />}
                      <span className="text-xs text-muted-foreground line-clamp-1">{product.seller}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        <Package className="w-3 h-3 mr-1" />
                        COD
                      </Badge>
                      <span className="text-xs text-muted-foreground">⭐ {product.rating}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {sortedProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
