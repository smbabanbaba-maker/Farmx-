const CATEGORY_IMAGES: Record<string, string> = {
  "agriculture-food": "/category-images/agriculture-food.webp",
  vehicles: "/category-images/vehicles.webp",
  property: "/category-images/property.webp",
  electronics: "/category-images/electronics.webp",
  fashion: "/category-images/fashion.webp",
  services: "/category-images/services.webp",
  other: "/category-images/other.webp",
};

export function getCategoryImage(categoryId: string) {
  return CATEGORY_IMAGES[categoryId] ?? CATEGORY_IMAGES.other;
}
