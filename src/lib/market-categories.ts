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

const CONDITION: DynamicField = {
  id: "condition",
  label: "Condition",
  type: "select",
  options: ["New", "Used", "Refurbished", "Reconditioned", "For parts", "Not applicable"],
  required: true,
};

const VEHICLE_COMMON: DynamicField[] = [
  { id: "make", label: "Make", type: "text", required: true, placeholder: "e.g. Toyota" },
  { id: "model", label: "Model", type: "text", required: true, placeholder: "e.g. Camry" },
  { id: "year", label: "Year", type: "number", placeholder: "e.g. 2018" },
  { id: "color", label: "Color", type: "text", required: true },
  CONDITION,
  {
    id: "transmission",
    label: "Transmission",
    type: "select",
    options: ["Manual", "Automatic", "CVT"],
  },
  {
    id: "fuel",
    label: "Fuel Type",
    type: "select",
    options: ["Petrol", "Diesel", "Hybrid", "Electric"],
  },
  { id: "mileage", label: "Mileage", type: "number", suffix: "km" },
  { id: "engine-size", label: "Engine Size", type: "text", placeholder: "e.g. 2.0L" },
  { id: "horsepower", label: "Horsepower", type: "text" },
  { id: "seats", label: "Seats", type: "number" },
  { id: "cylinders", label: "Number of Cylinders", type: "number" },
  {
    id: "drivetrain",
    label: "Drivetrain",
    type: "select",
    options: ["FWD", "RWD", "AWD", "4WD"],
  },
  { id: "registered", label: "Registered", type: "boolean" },
  { id: "exchange-possible", label: "Exchange Possible", type: "boolean" },
];

const AGRICULTURE_COMMON: DynamicField[] = [
  { id: "quantity", label: "Quantity", type: "number", required: true },
  {
    id: "unit",
    label: "Unit",
    type: "select",
    options: ["kg", "bag", "tonne", "basket", "crate", "piece", "animal", "litre", "acre"],
    required: true,
  },
  { id: "crop-livestock-type", label: "Crop / Livestock Type", type: "text" },
  { id: "variety-breed", label: "Variety / Breed", type: "text" },
  { id: "harvest-date", label: "Harvest Date", type: "text", placeholder: "e.g. Oct 2026" },
  {
    id: "grade-quality",
    label: "Grade / Quality",
    type: "select",
    options: ["Premium", "Grade A", "Grade B", "Standard", "Mixed"],
  },
  { id: "packaging", label: "Packaging", type: "text", placeholder: "e.g. 50kg bag" },
];

const PROPERTY_COMMON: DynamicField[] = [
  {
    id: "purpose",
    label: "Purpose",
    type: "select",
    options: ["For Sale", "For Rent", "For Lease"],
    required: true,
  },
  { id: "bedrooms", label: "Bedrooms", type: "number" },
  { id: "bathrooms", label: "Bathrooms", type: "number" },
  { id: "land-size", label: "Land Size", type: "text", placeholder: "e.g. 500sqm or 1 plot" },
  { id: "furnished", label: "Furnished", type: "select", options: ["Yes", "No", "Semi-furnished"] },
  {
    id: "parking",
    label: "Parking",
    type: "select",
    options: ["None", "1 car", "2 cars", "3+ cars"],
  },
  {
    id: "document-status",
    label: "Title / Document",
    type: "select",
    options: [
      "C of O",
      "Governor's Consent",
      "Deed of Assignment",
      "Survey Plan",
      "Receipt",
      "Pending",
    ],
  },
  CONDITION,
];

const JOB_COMMON: DynamicField[] = [
  {
    id: "job-type",
    label: "Job Type",
    type: "select",
    options: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
  },
  { id: "salary", label: "Salary", type: "text", placeholder: "e.g. ₦250,000 per month" },
  { id: "experience", label: "Experience", type: "text", placeholder: "e.g. 2 years" },
  { id: "education", label: "Education", type: "text" },
  { id: "deadline", label: "Deadline", type: "text", placeholder: "e.g. 30 Sep 2026" },
];

const SERVICE_COMMON: DynamicField[] = [
  { id: "experience", label: "Experience", type: "text", placeholder: "e.g. 5 years" },
  {
    id: "availability",
    label: "Availability",
    type: "select",
    options: ["Available now", "Weekdays", "Weekends", "Appointment only"],
  },
  {
    id: "service-area",
    label: "Service Area",
    type: "text",
    placeholder: "e.g. Kano and nearby LGAs",
  },
  {
    id: "pricing-model",
    label: "Pricing Model",
    type: "select",
    options: ["Per service", "Per hour", "Per day", "Per month", "Request quote"],
  },
];

export const UNIVERSAL_CATEGORIES: MainCategory[] = [
  {
    id: "agriculture-food",
    name: "Agriculture & Food",
    icon: "🌾",
    commonFields: AGRICULTURE_COMMON,
    subcategories: [
      { id: "farm-equipment", name: "Farm Equipment" },
      { id: "livestock", name: "Livestock" },
      { id: "poultry", name: "Poultry" },
      { id: "fish-aquaculture", name: "Fish & Aquaculture" },
      { id: "seeds-seedlings", name: "Seeds & Seedlings" },
      { id: "fertilizers-agro-chemicals", name: "Fertilizers & Agro Chemicals" },
      { id: "farm-services", name: "Farm Services" },
      { id: "other-agri", name: "Other Agriculture" },
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: "🚗",
    commonFields: VEHICLE_COMMON,
    subcategories: [
      { id: "cars", name: "Cars" },
      { id: "buses-minibuses", name: "Buses & Minibuses" },
      { id: "trucks", name: "Trucks" },
      { id: "motorcycles", name: "Motorcycles" },
      { id: "tricycles", name: "Tricycles" },
      { id: "auto-parts", name: "Auto Parts & Accessories" },
    ],
  },
  {
    id: "property",
    name: "Property",
    icon: "🏠",
    commonFields: PROPERTY_COMMON,
    subcategories: [
      { id: "houses", name: "Houses" },
      { id: "land-plots", name: "Land & Plots" },
      { id: "shops-offices", name: "Shops & Offices" },
    ],
  },
  {
    id: "electronics",
    name: "Electronics",
    icon: "📺",
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "model", label: "Model", type: "text" },
    ],
    subcategories: [
      { id: "phones-tablets", name: "Phones & Tablets" },
      { id: "computers", name: "Computers" },
      { id: "solar-power", name: "Solar & Power" },
      { id: "home-furniture", name: "Home & Furniture" },
    ],
  },
  {
    id: "fashion",
    name: "Fashion",
    icon: "👕",
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "color", label: "Color", type: "text" },
    ],
    subcategories: [
      { id: "shoes", name: "Shoes" },
      { id: "bags", name: "Bags" },
      { id: "watches-accessories", name: "Watches & Accessories" },
    ],
  },
  {
    id: "services",
    name: "Services",
    icon: "🛠️",
    commonFields: SERVICE_COMMON,
    subcategories: [
      { id: "education-courses", name: "Education & Courses" },
      { id: "construction-building", name: "Construction & Building Materials" },
      { id: "industrial-equipment", name: "Industrial Equipment" },
      { id: "business-commercial", name: "Business & Commercial" },
      { id: "beauty-care", name: "Beauty & Personal Care" },
      { id: "sports-fitness", name: "Sports & Fitness" },
      { id: "baby-kids", name: "Baby & Kids" },
    ],
  },
  {
    id: "other",
    name: "Other",
    icon: "📦",
    subcategories: [{ id: "general", name: "General" }],
  },
];

export function getCategory(id: string) {
  return UNIVERSAL_CATEGORIES.find((c) => c.id === id);
}

export function getSubcategory(catId: string, subId: string) {
  const cat = getCategory(catId);
  return cat?.subcategories.find((s) => s.id === subId);
}
