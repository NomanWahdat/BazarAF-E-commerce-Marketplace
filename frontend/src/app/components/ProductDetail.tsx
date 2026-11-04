// File: frontend/src/components/ProductDetail.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ShoppingCart, Shield, Truck, Package, BadgeCheck, Phone, MessageCircle, Star, 
  Heart, Share2, Minus, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle, X
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { productsAPI, type Product } from '@/services/productsAPI';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getProductImageUrls } from '@/utils/imageUtils';
import { ReviewForm } from './ReviewForm';
import { toast } from 'sonner';

interface ProductDetailProps {
  product?: any;
  onAddToCart?: (product: any) => void;
  cartCount?: number;
}

export function ProductDetail({ product: initialProduct, onAddToCart, cartCount = 0 }: ProductDetailProps) {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  
  const [product, setProduct] = useState<Product | any>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch product details if not provided
  useEffect(() => {
    if (!initialProduct && productId) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          setError(null);
          // console.log('🔄 Fetching product with ID:', productId);
          const data = await productsAPI.getProduct(productId);
          // console.log('✅ Product fetched successfully:', data);
          // console.log('  - Images in product:', data.images);
          // console.log('  - Images length:', data.images?.length);
          setProduct(data);
          
          // Fetch reviews
          fetchReviews(productId);
        } catch (err: any) {
          console.error('❌ Error fetching product:', err);
          setError('Failed to load product');
          toast.error('Product not found');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    } else if (initialProduct) {
      fetchReviews(initialProduct.id);
    }
  }, [productId, initialProduct]);

  const fetchReviews = async (id: string) => {
    try {
      setLoadingReviews(true);
      const reviewsData = await productsAPI.getProductReviews(id);
      // console.log('Fetched reviews:', reviewsData);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  if (loading) {
    return (
      <Layout variant="customer" cartItemCount={cartCount} showFooter={true}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading product details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout variant="customer" cartItemCount={cartCount} showFooter={true}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-lg font-bold mb-2">Product Not Found</h2>
                <p className="text-gray-600 mb-4">{error || 'This product is no longer available'}</p>
                <Button 
                  onClick={() => navigate('/')}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // Get product images - handle relative and absolute URLs
  const productImages = getProductImageUrls(product.images || []);
  
  // Debug logging
  useEffect(() => {
    if (product.images && product.images.length > 0) {
      // console.log('🖼️ ProductDetail - Image Debug Info:');
      // console.log('  Raw images from API:', product.images);
      product.images.forEach((_img: any, _idx: number) => {
        // console.log(`  Image ${idx}:`, { image: img.image, image_url: img.image_url });
      });
      // console.log('  Processed image URLs:', productImages);
      // console.log('  Selected image URL:', productImages[selectedImage]);
      // console.log('  Images count:', productImages.length);
    }
  }, [product.images, selectedImage, productImages]);

  const handleAddToCart = () => {
    if (onAddToCart) {
      for (let i = 0; i < quantity; i++) {
        onAddToCart(product);
      }
    } else {
      // Fallback: store in localStorage
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existingItem = cart.find((item: any) => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          image: productImages[0],
          quantity,
          vendor: product.vendor
        });
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
    }
    toast.success(`${quantity} item(s) added to cart`);
    setQuantity(1);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => navigate('/checkout'), 500);
  };

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on BazaarAF`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleCallSeller = () => {
    const phone = product.vendor?.user?.phone || '+93';
    window.open(`tel:${phone}`, '_blank');
  };

  const handleWhatsAppSeller = () => {
    const phone = product.vendor?.user?.phone || '93700000000';
    const message = `Hi, I'm interested in ${product.name}`;
    window.open(
      `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  const handleNextImage = () => {
    setSelectedImage((prev) => (prev + 1) % productImages.length);
  };

  const handlePrevImage = () => {
    setSelectedImage((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const inStock = product.stock_quantity > 0;

  return (
    <Layout
      variant="customer"
      cartItemCount={cartCount}
      onCartClick={() => navigate('/cart')}
      onProfileClick={() => navigate('/profile')}
      showFooter={true}
    >
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-7xl mx-auto px-3 md:px-4">
          {/* Breadcrumb Navigation */}
          <div className="mb-6 text-sm text-gray-600 flex items-center gap-2">
            <button onClick={() => navigate('/')} className="hover:text-teal-600 font-medium transition-colors">
              Home
            </button>
            <span className="text-gray-400">/</span>
            <button 
              onClick={() => navigate('/products', { state: { category: product.category_name } })} 
              className="hover:text-teal-600 font-medium transition-colors"
            >
              {product.category_name}
            </button>
            <span className="text-gray-400">/</span> 
            <span className="text-gray-600 truncate">{product.name.substring(0, 30)}...</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 md:gap-8 mb-8">
            {/* Product Images - Left Side */}
            <div className="space-y-3 md:space-y-4">
              <Card className="overflow-hidden bg-white relative group border border-gray-200">
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
                  {productImages[selectedImage] ? (
                    <ImageWithFallback
                      src={productImages[selectedImage]}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                      <Package className="w-16 h-16 text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">No image available</p>
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <Badge className="absolute top-3 left-3 md:top-4 md:left-4 bg-red-500 hover:bg-red-600 text-white text-sm md:text-base shadow-lg">
                      -{discount}%
                    </Badge>
                  )}
                  
                  {/* Image Navigation */}
                  {productImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                        aria-label="Previous image"
                        title="Previous image"
                      >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                        aria-label="Next image"
                        title="Next image"
                      >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                      </button>

                      {/* Image Counter */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs md:text-sm font-medium">
                        {selectedImage + 1} / {productImages.length}
                      </div>
                    </>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full bg-white/95 hover:bg-white shadow-md hover:shadow-lg transition-all"
                      onClick={handleShare}
                      title="Share this product"
                    >
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className={`rounded-full shadow-md hover:shadow-lg transition-all ${
                        isWishlisted 
                          ? 'bg-red-100 hover:bg-red-200' 
                          : 'bg-white/95 hover:bg-white'
                      }`}
                      onClick={toggleWishlist}
                      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`w-4 h-4 md:w-5 md:h-5 transition-colors ${isWishlisted ? 'fill-red-600 text-red-600' : 'text-gray-600'}`} />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Image Thumbnails */}
              {productImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {productImages.map((img: string, index: number) => (
                    <Card
                      key={index}
                      className={`aspect-square cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-teal-400 border ${
                        selectedImage === index 
                          ? 'ring-2 ring-teal-600 border-teal-600' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedImage(index)}
                      title={`View image ${index + 1}`}
                    >
                      <ImageWithFallback
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Right Side */}
            <div className="space-y-4">
              <Card className="p-4 md:p-6 bg-white">
                {/* Vendor Info - Display at top */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {product.vendor?.shop_name?.[0]?.toUpperCase() || 'V'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm md:text-base text-gray-800">{product.vendor?.shop_name || 'Shop'}</p>
                        {product.vendor?.is_verified && (
                          <BadgeCheck className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                        )}
                      </div>
                      {product.vendor?.user?.phone && (
                        <p className="text-xs text-gray-500 mt-1">{product.vendor.user.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 line-clamp-2">{product.name}</h1>
                
                {/* Rating */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
                          i < Math.floor(product.average_rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 font-medium">
                    <span className="font-bold text-teal-600">{(product.average_rating || 0).toFixed(1)}</span> • {product.review_count || 0} {product.review_count === 1 ? 'review' : 'reviews'}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6 py-4 border-b border-gray-200">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl md:text-4xl font-bold text-teal-600">
                      AFN {parseFloat(product.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                    {product.original_price && (
                      <>
                        <span className="text-lg md:text-xl text-gray-500 line-through">
                          AFN {parseFloat(product.original_price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                        <Badge className="bg-red-100 text-red-700 border border-red-200">
                          Save {discount}%
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Price may vary by location</p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {inStock ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-200 text-sm font-medium py-1 px-3">
                      ✓ In Stock ({product.stock_quantity} available)
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border border-red-200 text-sm font-medium py-1 px-3">
                      Out of Stock
                    </Badge>
                  )}
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-sm font-medium py-1 px-3">
                    {product.category_name}
                  </Badge>
                </div>

                <Separator className="my-4" />

                {/* Quantity Selector */}
                <div className="mb-8">
                  <label className="text-sm font-bold mb-3 block text-gray-800">Quantity</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={!inStock}
                      className="h-9 w-9 bg-white hover:bg-gray-100 border-gray-200"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </Button>
                    <span className="w-12 text-center font-bold text-lg text-gray-900">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={!inStock}
                      className="h-9 w-9 bg-white hover:bg-gray-100 border-gray-200"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </Button>
                    <span className="text-sm text-gray-600 ml-auto font-bold bg-white px-3 py-1 rounded border border-gray-200">
                      Total: AFN {(parseFloat(product.price) * quantity).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 mb-6">
                  <Button 
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-3 md:py-4 text-base md:text-lg rounded-lg shadow-md hover:shadow-lg transition-all"
                    onClick={handleBuyNow}
                    disabled={!inStock}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy Now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-bold py-3 md:py-4 text-base md:text-lg rounded-lg transition-all"
                    onClick={handleAddToCart}
                    disabled={!inStock}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                </div>

                {/* Contact Seller */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="py-3 rounded-lg border-gray-300 hover:bg-blue-50 font-semibold transition-all"
                    onClick={handleCallSeller}
                  >
                    <Phone className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    <span className="text-sm md:text-base">Call Seller</span>
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 py-3 rounded-lg font-semibold transition-all"
                    onClick={handleWhatsAppSeller}
                  >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    <span className="text-sm md:text-base">WhatsApp</span>
                  </Button>
                </div>
              </Card>

              {/* Trust Features */}
              <Card className="p-4 md:p-6 bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-200 space-y-4">
                <h3 className="font-bold text-sm md:text-base text-gray-900 mb-2">Why Shop With Us</h3>
                <div className="flex items-start gap-3">
                  <Package className="w-6 h-6 md:w-7 md:h-7 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm md:text-base text-gray-900">Cash on Delivery</div>
                    <div className="text-xs md:text-sm text-gray-600">Pay only when you receive your order</div>
                  </div>
                </div>
                <Separator className="bg-gray-200" />
                <div className="flex items-start gap-3">
                  <Truck className="w-6 h-6 md:w-7 md:h-7 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm md:text-base text-gray-900">Fast Delivery</div>
                    <div className="text-xs md:text-sm text-gray-600">Usually delivered in 3-5 business days</div>
                  </div>
                </div>
                <Separator className="bg-gray-200" />
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 md:w-7 md:h-7 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm md:text-base text-gray-900">Secure Shopping</div>
                    <div className="text-xs md:text-sm text-gray-600">100% safe and protected transactions</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Description Section */}
          <Card className="p-4 md:p-8 bg-gradient-to-br from-white to-gray-50 mb-8 border border-gray-200">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600" />
              Product Description
            </h2>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
              {product.description || 'No description provided'}
            </p>
          </Card>

          {/* Reviews Section - Consolidated */}
          <Card className="p-4 md:p-8 bg-white mb-8 border border-gray-200">
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Customer Reviews</h3>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 md:w-6 md:h-6 ${
                              i < Math.floor(product.average_rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <div>
                        <p className="text-3xl md:text-4xl font-bold text-gray-900">
                          {(product.average_rating || 0).toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-600 font-medium">
                          {product.review_count || 0} {product.review_count === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 h-auto rounded-lg shadow-md hover:shadow-lg transition-all font-semibold"
                  onClick={() => setShowReviewForm(true)}
                >
                  <Star className="w-5 h-5 mr-2" />
                  <span>Write Review</span>
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Reviews List */}
            <div>
              <h4 className="font-bold text-lg mb-6">Recent Reviews</h4>
              {loadingReviews ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading reviews...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
                  {reviews.slice(0, 10).map((review: any, idx: number) => (
                    <div key={idx} className="pb-4 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{review.user_name || 'Anonymous'}</span>
                            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">✓ Verified</Badge>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (review.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-gray-700 text-sm mb-2 leading-relaxed">{review.comment}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-2">No reviews yet</p>
                  <p className="text-sm text-gray-500">Be the first to share your experience with this product</p>
                </div>
              )}
            </div>
          </Card>

          {/* Review Form Modal */}
          {showReviewForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-xl font-bold">Write a Review</h2>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <ReviewForm
                    product={product}
                    onReviewSubmitted={() => {
                      setShowReviewForm(false);
                      // Refresh reviews list
                      fetchReviews(product.id);
                      // Also refresh product data to update average_rating and review_count
                      setTimeout(async () => {
                        try {
                          if (productId) {
                            const updatedProduct = await productsAPI.getProduct(productId);
                            setProduct(updatedProduct);
                            // console.log('✅ Product data refreshed with new review stats');
                          }
                        } catch (err) {
                          console.error('Error refreshing product data:', err);
                        }
                      }, 500);
                    }}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </div>
              </Card>
            </div>
          )}

          {/* Related Products Notice */}
          <Card className="p-4 md:p-8 bg-gradient-to-r from-teal-50 via-blue-50 to-purple-50 border border-teal-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">More from this Seller</h3>
                <p className="text-gray-600 text-sm">Visit <span className="font-bold text-teal-600">{product.vendor?.shop_name}</span> store for more products</p>
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2"
                onClick={() => navigate('/products', { state: { vendor: product.vendor?.id } })}
              >
                Visit Store →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}