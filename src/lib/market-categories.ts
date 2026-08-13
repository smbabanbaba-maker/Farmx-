export type FieldType = "text" | "number" | "select" | "multiselect" | "textarea" | "boolean";

export type DynamicField = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  suffix?: string;
};

export type Subcategory = {
  id: string;
  name: string;
  fields?: DynamicField[];
};

export type MainCategory = {
  id: string;
  name: string;
  icon: string;
  subcategories: Subcategory[];
  commonFields?: DynamicField[];
};

const COMMON_CONDITION: DynamicField = { id: "condition", label: "Condition", type: "select", options: ["New", "Used", "Refurbished", "For parts", "Not applicable"], required: true };

export const UNIVERSAL_CATEGORIES: MainCategory[] = [
  {
    id: "agriculture-food",
    name: "Agriculture & Food",
    icon: "🌾",
    subcategories: [
      { id: "grains", name: "Grains" },
      { id: "vegetables", name: "Vegetables" },
      { id: "fruits", name: "Fruits" },
      { id: "seeds", name: "Seeds" },
      { id: "fertilizer", name: "Fertilizer" },
      { id: "livestock", name: "Livestock" },
      { id: "poultry", name: "Poultry" },
      { id: "fish", name: "Fish" },
      { id: "farm-produce", name: "Farm Produce" },
      { id: "food-products", name: "Food Products" },
      { id: "agri-services", name: "Agricultural Services" },
      { id: "other-agri", name: "Other" },
    ],
    commonFields: [
      { id: "quantity", label: "Quantity", type: "number", required: true },
      { id: "unit", label: "Unit", type: "select", options: ["kg", "bag", "tonne", "basket", "crate", "piece", "animal", "litre", "acre"], required: true },
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: "🚗",
    subcategories: [
      { id: "cars", name: "Cars", fields: [
        { id: "make", label: "Make", type: "text", required: true },
        { id: "model", label: "Model", type: "text", required: true },
        { id: "year", label: "Year", type: "number", required: true },
        { id: "transmission", label: "Transmission", type: "select", options: ["Manual", "Automatic"] },
        { id: "fuel", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "Hybrid", "Electric"] },
        { id: "mileage", label: "Mileage", type: "number", suffix: "km" },
      ]},
      { id: "motorcycles", name: "Motorcycles" },
      { id: "trucks", name: "Trucks" },
      { id: "heavy-equipment", name: "Heavy Equipment" },
      { id: "parts", name: "Vehicle Parts" },
      { id: "other-vehicles", name: "Other" },
    ],
    commonFields: [COMMON_CONDITION],
  },
  {
    id: "property",
    name: "Property",
    icon: "🏠",
    subcategories: [
      { id: "houses", name: "Houses", fields: [
        { id: "bedrooms", label: "Bedrooms", type: "number" },
        { id: "bathrooms", label: "Bathrooms", type: "number" },
        { id: "furnished", label: "Furnished", type: "select", options: ["Yes", "No", "Semi-furnished"] },
      ]},
      { id: "apartments", name: "Apartments" },
      { id: "land", name: "Land", fields: [
        { id: "size", label: "Size", type: "text", placeholder: "e.g. 500sqm or 1 plot", required: true },
      ]},
      { id: "farms-property", name: "Farms" },
      { id: "commercial-property", name: "Commercial Property" },
      { id: "short-let", name: "Short-let" },
    ],
    commonFields: [
      { id: "listing-type", label: "Listing Type", type: "select", options: ["For Sale", "For Rent", "For Lease"], required: true },
    ],
  },
  {
    id: "electronics",
    name: "Electronics",
    icon: "📺",
    subcategories: [
      { id: "tvs", name: "TVs" },
      { id: "cameras", name: "Cameras" },
      { id: "audio", name: "Audio" },
      { id: "gaming", name: "Gaming" },
      { id: "home-electronics", name: "Home Electronics" },
    ],
    commonFields: [COMMON_CONDITION, { id: "brand", label: "Brand", type: "text" }],
  },
  {
    id: "phones-tablets",
    name: "Phones & Tablets",
    icon: "📱",
    subcategories: [
      { id: "smartphones", name: "Smartphones", fields: [
        { id: "storage", label: "Storage", type: "select", options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] },
        { id: "ram", label: "RAM", type: "select", options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] },
      ]},
      { id: "tablets", name: "Tablets" },
      { id: "smartwatches", name: "Smartwatches" },
      { id: "phone-accessories", name: "Accessories" },
    ],
    commonFields: [COMMON_CONDITION, { id: "brand", label: "Brand", type: "text", required: true }],
  },
  { id: "computers", name: "Computers & Accessories", icon: "💻", subcategories: [{ id: "laptops", name: "Laptops" }, { id: "desktops", name: "Desktops" }, { id: "comp-parts", name: "Parts & Accessories" }], commonFields: [COMMON_CONDITION, { id: "brand", label: "Brand", type: "text" }] },
  { id: "fashion", name: "Fashion & Clothing", icon: "👕", subcategories: [{ id: "mens-clothing", name: "Men's Clothing" }, { id: "womens-clothing", name: "Women's Clothing" }, { id: "childrens-clothing", name: "Children's Clothing" }, { id: "shoes", name: "Shoes" }, { id: "bags", name: "Bags" }, { id: "watches", name: "Watches" }, { id: "jewelry", name: "Jewelry" }], commonFields: [COMMON_CONDITION, { id: "size", label: "Size", type: "text" }] },
  { id: "home-furniture", name: "Home & Furniture", icon: "🛋️", subcategories: [{ id: "furniture", name: "Furniture" }, { id: "decor", name: "Home Decor" }, { id: "kitchen", name: "Kitchenware" }, { id: "bedding", name: "Bedding" }], commonFields: [COMMON_CONDITION] },
  { id: "appliances", name: "Appliances", icon: "🔌", subcategories: [{ id: "fridges", name: "Fridges & Freezers" }, { id: "washers", name: "Washers & Dryers" }, { id: "microwaves", name: "Microwaves" }, { id: "generators", name: "Generators" }], commonFields: [COMMON_CONDITION] },
  { id: "beauty-health", name: "Beauty & Health", icon: "💄", subcategories: [{ id: "makeup", name: "Makeup" }, { id: "skincare", name: "Skincare" }, { id: "fragrances", name: "Fragrances" }, { id: "vitamins", name: "Health & Wellness" }] },
  { id: "baby-kids", name: "Baby & Kids", icon: "👶", subcategories: [{ id: "baby-clothing", name: "Baby Clothing" }, { id: "toys", name: "Toys" }, { id: "baby-gear", name: "Baby Gear" }] },
  { id: "animals-pets", name: "Animals & Pets", icon: "🐾", subcategories: [{ id: "dogs", name: "Dogs" }, { id: "cats", name: "Cats" }, { id: "birds", name: "Birds" }, { id: "pet-food", name: "Pet Food" }] },
  { id: "farm-equipment", name: "Farm Equipment", icon: "🚜", subcategories: [{ id: "tractors-equip", name: "Tractors" }, { id: "harvesters", name: "Harvesters" }, { id: "irrigation-equip", name: "Irrigation" }, { id: "poultry-equip", name: "Poultry Equipment" }], commonFields: [COMMON_CONDITION] },
  { id: "industrial-equip", name: "Industrial Equipment", icon: "🏗️", subcategories: [{ id: "manufacturing", name: "Manufacturing" }, { id: "construction-equip", name: "Construction" }, { id: "medical-equip", name: "Medical Equipment" }], commonFields: [COMMON_CONDITION] },
  { id: "tools-machinery", name: "Tools & Machinery", icon: "🛠️", subcategories: [{ id: "power-tools", name: "Power Tools" }, { id: "hand-tools", name: "Hand Tools" }, { id: "machinery", name: "Machinery" }], commonFields: [COMMON_CONDITION] },
  { id: "solar-energy", name: "Solar & Energy", icon: "☀️", subcategories: [{ id: "solar-panels", name: "Solar Panels" }, { id: "inverters", name: "Inverters" }, { id: "batteries", name: "Batteries" }, { id: "solar-pumps", name: "Solar Pumps" }], commonFields: [COMMON_CONDITION] },
  { id: "services", name: "Services", icon: "🤝", subcategories: [{ id: "repairs", name: "Repairs" }, { id: "cleaning", name: "Cleaning" }, { id: "transport-serv", name: "Transportation" }, { id: "construction-serv", name: "Construction" }, { id: "design-serv", name: "Design" }, { id: "software-serv", name: "Software" }, { id: "photo-serv", name: "Photography" }, { id: "education-serv", name: "Education" }, { id: "agri-serv", name: "Agriculture Services" }], commonFields: [{ id: "experience", label: "Experience", type: "text", placeholder: "e.g. 5 years" }] },
  { id: "jobs", name: "Jobs & Employment", icon: "💼", subcategories: [{ id: "full-time", name: "Full-time" }, { id: "part-time", name: "Part-time" }, { id: "contract", name: "Contract" }, { id: "internship", name: "Internship" }, { id: "freelance", name: "Freelance" }, { id: "remote", name: "Remote" }], commonFields: [{ id: "company", label: "Company", type: "text" }, { id: "salary", label: "Salary", type: "text" }, { id: "deadline", label: "Deadline", type: "text" }] },
  { id: "business-commercial", name: "Business & Commercial", icon: "🏢", subcategories: [{ id: "business-for-sale", name: "Businesses for Sale" }, { id: "office-equip", name: "Office Equipment" }, { id: "wholesale-stock", name: "Wholesale" }] },
  { id: "building-construction", name: "Building & Construction", icon: "🧱", subcategories: [{ id: "building-materials", name: "Building Materials" }, { id: "plumbing", name: "Plumbing" }, { id: "electrical", name: "Electrical" }] },
  { id: "logistics-transport", name: "Logistics & Transportation", icon: "🚚", subcategories: [{ id: "haulage", name: "Haulage" }, { id: "delivery-serv", name: "Delivery Services" }, { id: "warehousing", name: "Warehousing" }] },
  { id: "other", name: "Other", icon: "🌿", subcategories: [{ id: "misc", name: "Miscellaneous" }] },
];

export function getCategory(id: string) {
  return UNIVERSAL_CATEGORIES.find(c => c.id === id);
}

export function getSubcategory(categoryId: string, subId: string) {
  return getCategory(categoryId)?.subcategories.find(s => s.id === subId);
}
