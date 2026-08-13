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

const OPTIONAL_CONDITION: DynamicField = { ...CONDITION, required: false };

const VEHICLE_COMMON: DynamicField[] = [
  { id: "make", label: "Make", type: "text", required: true, placeholder: "e.g. Toyota" },
  { id: "model", label: "Model", type: "text", required: true, placeholder: "e.g. Camry" },
  { id: "year", label: "Year", type: "number", placeholder: "e.g. 2018" },
  { id: "color", label: "Color", type: "text", required: true },
  CONDITION,
  {
    id: "registration-status",
    label: "Registration Status",
    type: "select",
    options: ["Registered", "Foreign used", "Unregistered", "First owner"],
  },
  { id: "exchange-possible", label: "Exchange Possible", type: "boolean" },
];

const PHONE_COMMON: DynamicField[] = [
  { id: "brand", label: "Brand", type: "text", required: true, placeholder: "e.g. Samsung" },
  { id: "model", label: "Model", type: "text", required: true, placeholder: "e.g. Galaxy S24" },
  { id: "color", label: "Color", type: "text" },
  CONDITION,
  { id: "battery-health", label: "Battery Health", type: "text", placeholder: "e.g. 92%" },
  {
    id: "network",
    label: "Network",
    type: "select",
    options: ["Unlocked", "MTN", "Airtel", "Glo", "9mobile"],
  },
  {
    id: "sim-type",
    label: "SIM Type",
    type: "select",
    options: ["Single SIM", "Dual SIM", "eSIM"],
  },
  { id: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 6 months" },
];

const AGRICULTURE_COMMON: DynamicField[] = [
  {
    id: "product-type",
    label: "Product Type",
    type: "select",
    options: [
      "Fresh produce",
      "Processed food",
      "Seeds",
      "Fertilizer",
      "Animal feed",
      "Farm service",
    ],
  },
  { id: "quantity", label: "Quantity", type: "number", required: true },
  {
    id: "unit",
    label: "Unit",
    type: "select",
    options: ["kg", "bag", "tonne", "basket", "crate", "piece", "animal", "litre", "acre"],
    required: true,
  },
  {
    id: "grade-quality",
    label: "Grade / Quality",
    type: "select",
    options: ["Premium", "Grade A", "Grade B", "Standard", "Mixed"],
  },
  { id: "packaging", label: "Packaging", type: "text", placeholder: "e.g. 50kg bag" },
  {
    id: "availability",
    label: "Availability",
    type: "select",
    options: ["Available now", "Pre-order", "Seasonal", "Out of stock"],
  },
  OPTIONAL_CONDITION,
];

const PROPERTY_COMMON: DynamicField[] = [
  {
    id: "property-type",
    label: "Property Type",
    type: "select",
    options: ["House", "Apartment", "Land", "Office", "Shop", "Warehouse", "Farm"],
  },
  {
    id: "listing-type",
    label: "Listing Type",
    type: "select",
    options: ["For Sale", "For Rent", "For Lease"],
    required: true,
  },
  { id: "bedrooms", label: "Bedrooms", type: "number" },
  { id: "bathrooms", label: "Bathrooms", type: "number" },
  { id: "toilets", label: "Toilets", type: "number" },
  { id: "land-size", label: "Land Size", type: "text", placeholder: "e.g. 500sqm or 1 plot" },
  { id: "building-size", label: "Building Size", type: "text", placeholder: "e.g. 240sqm" },
  { id: "furnished", label: "Furnished", type: "select", options: ["Yes", "No", "Semi-furnished"] },
  {
    id: "parking",
    label: "Parking",
    type: "select",
    options: ["None", "1 car", "2 cars", "3+ cars"],
  },
  {
    id: "amenities",
    label: "Amenities",
    type: "textarea",
    placeholder: "List important amenities",
  },
  {
    id: "document-status",
    label: "Title / Document Status",
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
];

const SERVICE_COMMON: DynamicField[] = [
  {
    id: "service-type",
    label: "Service Type",
    type: "text",
    required: true,
    placeholder: "e.g. Solar installation",
  },
  {
    id: "service-area",
    label: "Service Area",
    type: "text",
    placeholder: "e.g. Kano and nearby LGAs",
  },
  {
    id: "availability",
    label: "Availability",
    type: "select",
    options: ["Available now", "Weekdays", "Weekends", "Appointment only"],
  },
  {
    id: "pricing-model",
    label: "Pricing Type",
    type: "select",
    options: ["Per service", "Per hour", "Per day", "Per month", "Request quote"],
  },
  { id: "experience", label: "Experience", type: "text", placeholder: "e.g. 5 years" },
  { id: "duration", label: "Estimated Duration", type: "text", placeholder: "e.g. 2 days" },
];

const JOB_COMMON: DynamicField[] = [
  { id: "job-title", label: "Job Title", type: "text", required: true },
  {
    id: "employment-type",
    label: "Employment Type",
    type: "select",
    options: ["Full-time", "Part-time", "Contract", "Internship", "Freelance"],
  },
  {
    id: "workplace",
    label: "Remote / On-site / Hybrid",
    type: "select",
    options: ["On-site", "Remote", "Hybrid"],
  },
  { id: "salary", label: "Salary", type: "text", placeholder: "e.g. ₦250,000 per month" },
  { id: "experience", label: "Experience", type: "text", placeholder: "e.g. 2 years" },
  { id: "education", label: "Education", type: "text" },
  {
    id: "requirements",
    label: "Requirements",
    type: "textarea",
    placeholder: "List the key requirements",
  },
  { id: "deadline", label: "Application Deadline", type: "text", placeholder: "e.g. 30 Sep 2026" },
];

const FASHION_COMMON: DynamicField[] = [
  { id: "brand", label: "Brand", type: "text" },
  { id: "size", label: "Size", type: "text", placeholder: "e.g. XL, 42" },
  { id: "color", label: "Color", type: "text" },
  CONDITION,
  { id: "material", label: "Material", type: "text" },
  {
    id: "gender",
    label: "Gender",
    type: "select",
    options: ["Men", "Women", "Unisex", "Children"],
  },
  { id: "quantity", label: "Quantity", type: "number" },
];

const SOLAR_COMMON: DynamicField[] = [
  {
    id: "system-type",
    label: "System Type",
    type: "select",
    options: ["Complete system", "Panel", "Inverter", "Battery", "Pump", "Accessory"],
  },
  { id: "power-capacity", label: "Power Capacity", type: "text", placeholder: "e.g. 5kVA" },
  { id: "brand", label: "Brand", type: "text" },
  CONDITION,
  { id: "voltage", label: "Voltage", type: "text", placeholder: "e.g. 24V" },
  {
    id: "battery-type",
    label: "Battery Type",
    type: "select",
    options: ["Lithium", "Gel", "Tubular", "AGM", "Lead-acid"],
  },
  { id: "panel-wattage", label: "Panel Wattage", type: "text", placeholder: "e.g. 550W" },
  { id: "quantity", label: "Quantity", type: "number" },
  { id: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 2 years" },
  { id: "installation-available", label: "Installation Available", type: "boolean" },
];

export const UNIVERSAL_CATEGORIES: MainCategory[] = [
  {
    id: "agriculture-food",
    name: "Agriculture & Food",
    icon: "🌾",
    subcategories: [
      { id: "farm-produce", name: "Farm Produce" },
      { id: "grains", name: "Grains" },
      { id: "vegetables", name: "Vegetables" },
      { id: "fruits", name: "Fruits" },
      { id: "seeds", name: "Seeds" },
      { id: "fertilizer", name: "Fertilizer" },
      { id: "farm-equipment-agri", name: "Farm Equipment" },
      { id: "irrigation", name: "Irrigation" },
      { id: "greenhouse", name: "Greenhouse" },
      { id: "poultry", name: "Poultry" },
      {
        id: "livestock",
        name: "Livestock",
        fields: [
          { id: "animal-type", label: "Animal Type", type: "text", required: true },
          { id: "breed", label: "Breed", type: "text" },
          { id: "age", label: "Age", type: "text" },
          { id: "sex", label: "Sex", type: "select", options: ["Male", "Female", "Mixed"] },
          {
            id: "health-status",
            label: "Health Status",
            type: "select",
            options: ["Healthy", "Vaccinated", "Needs attention"],
          },
          { id: "weight", label: "Weight", type: "text" },
          {
            id: "purpose",
            label: "Purpose",
            type: "select",
            options: ["Breeding", "Meat", "Dairy", "Eggs", "Pets"],
          },
        ],
      },
      { id: "animal-feed", name: "Animal Feed" },
      { id: "fish", name: "Fish" },
      { id: "food-products", name: "Food Products" },
      { id: "agri-services", name: "Agricultural Services" },
      { id: "other-agri", name: "Other" },
    ],
    commonFields: AGRICULTURE_COMMON,
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: "🚗",
    subcategories: [
      {
        id: "cars",
        name: "Cars",
        fields: [
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
          { id: "seats", label: "Seats", type: "number" },
          { id: "engine-size", label: "Engine Size", type: "text", placeholder: "e.g. 2.0L" },
          {
            id: "drivetrain",
            label: "Drivetrain",
            type: "select",
            options: ["FWD", "RWD", "AWD", "4WD"],
          },
          { id: "cylinders", label: "Number of Cylinders", type: "number" },
        ],
      },
      {
        id: "buses-microbuses",
        name: "Buses & Microbuses",
        fields: [
          {
            id: "fuel",
            label: "Fuel Type",
            type: "select",
            options: ["Petrol", "Diesel", "Electric"],
          },
          { id: "seats", label: "Seats", type: "number" },
          { id: "mileage", label: "Mileage", type: "number", suffix: "km" },
          { id: "engine-size", label: "Engine Size", type: "text" },
        ],
      },
      {
        id: "trucks",
        name: "Trucks",
        fields: [
          {
            id: "fuel",
            label: "Fuel Type",
            type: "select",
            options: ["Petrol", "Diesel", "Electric"],
          },
          { id: "load-capacity", label: "Load Capacity", type: "text" },
          { id: "mileage", label: "Mileage", type: "number", suffix: "km" },
        ],
      },
      {
        id: "motorcycles",
        name: "Motorcycles",
        fields: [
          { id: "fuel", label: "Fuel Type", type: "select", options: ["Petrol", "Electric"] },
          { id: "engine-size", label: "Engine Size", type: "text" },
          { id: "mileage", label: "Mileage", type: "number", suffix: "km" },
        ],
      },
      { id: "tricycles", name: "Tricycles" },
      { id: "heavy-equipment", name: "Heavy Equipment" },
      { id: "parts", name: "Vehicle Parts" },
      { id: "other-vehicles", name: "Other Vehicles" },
    ],
    commonFields: VEHICLE_COMMON,
  },
  {
    id: "property",
    name: "Property",
    icon: "🏠",
    subcategories: [
      { id: "for-sale", name: "For Sale" },
      { id: "for-rent", name: "For Rent" },
      { id: "land", name: "Land" },
      { id: "houses", name: "Houses" },
      { id: "apartments", name: "Apartments" },
      { id: "farms-property", name: "Farms" },
      { id: "commercial-property", name: "Commercial Property" },
      { id: "short-let", name: "Short-let" },
      { id: "other-property", name: "Other" },
    ],
    commonFields: PROPERTY_COMMON,
  },
  {
    id: "electronics",
    name: "Electronics",
    icon: "📺",
    subcategories: [
      { id: "tvs", name: "TV" },
      { id: "audio", name: "Audio" },
      { id: "cameras", name: "Cameras" },
      { id: "gaming", name: "Gaming" },
      { id: "home-electronics", name: "Home Appliances" },
      { id: "other-electronics", name: "Other" },
    ],
    commonFields: [
      { id: "brand", label: "Brand", type: "text" },
      { id: "model", label: "Model", type: "text" },
      CONDITION,
      { id: "year", label: "Year", type: "number" },
      {
        id: "specifications",
        label: "Specifications",
        type: "textarea",
        placeholder: "Add important specifications",
      },
      { id: "warranty", label: "Warranty", type: "text" },
      {
        id: "accessories",
        label: "Accessories",
        type: "textarea",
        placeholder: "List included accessories",
      },
      { id: "power-rating", label: "Power Rating", type: "text", placeholder: "e.g. 1200W" },
    ],
  },
  {
    id: "phones-tablets",
    name: "Phones & Tablets",
    icon: "📱",
    subcategories: [
      {
        id: "android-phones",
        name: "Android Phones",
        fields: [
          {
            id: "storage",
            label: "Storage",
            type: "select",
            options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
          },
          {
            id: "ram",
            label: "RAM",
            type: "select",
            options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"],
          },
        ],
      },
      {
        id: "iphones",
        name: "iPhones",
        fields: [
          {
            id: "storage",
            label: "Storage",
            type: "select",
            options: ["64GB", "128GB", "256GB", "512GB", "1TB"],
          },
          { id: "ram", label: "RAM", type: "text", placeholder: "e.g. 6GB" },
        ],
      },
      {
        id: "tablets",
        name: "Tablets",
        fields: [
          {
            id: "storage",
            label: "Storage",
            type: "select",
            options: ["32GB", "64GB", "128GB", "256GB", "512GB"],
          },
          {
            id: "ram",
            label: "RAM",
            type: "select",
            options: ["2GB", "4GB", "6GB", "8GB", "12GB"],
          },
        ],
      },
      { id: "phone-accessories", name: "Accessories" },
      { id: "smartwatches", name: "Smart Watches" },
      { id: "other-phones", name: "Other" },
    ],
    commonFields: PHONE_COMMON,
  },
  {
    id: "computers",
    name: "Computers & Accessories",
    icon: "💻",
    subcategories: [
      { id: "laptops", name: "Laptops" },
      { id: "desktops", name: "Desktops" },
      { id: "comp-parts", name: "Parts & Accessories" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "model", label: "Model", type: "text" },
      { id: "processor", label: "Processor", type: "text" },
      { id: "ram", label: "RAM", type: "text" },
      { id: "storage", label: "Storage", type: "text" },
      { id: "warranty", label: "Warranty", type: "text" },
    ],
  },
  {
    id: "fashion",
    name: "Fashion & Clothing",
    icon: "👕",
    subcategories: [
      { id: "mens-clothing", name: "Men" },
      { id: "womens-clothing", name: "Women" },
      { id: "childrens-clothing", name: "Children" },
      { id: "shoes", name: "Shoes" },
      { id: "bags", name: "Bags" },
      { id: "watches", name: "Accessories" },
      { id: "jewelry", name: "Other" },
    ],
    commonFields: FASHION_COMMON,
  },
  {
    id: "home-furniture",
    name: "Home & Furniture",
    icon: "🛋️",
    subcategories: [
      { id: "furniture", name: "Furniture" },
      { id: "decor", name: "Home Decor" },
      { id: "kitchen", name: "Kitchenware" },
      { id: "bedding", name: "Bedding" },
    ],
    commonFields: [
      CONDITION,
      { id: "material", label: "Material", type: "text" },
      { id: "dimensions", label: "Dimensions", type: "text" },
    ],
  },
  {
    id: "appliances",
    name: "Appliances",
    icon: "🔌",
    subcategories: [
      { id: "fridges", name: "Fridges & Freezers" },
      { id: "washers", name: "Washers & Dryers" },
      { id: "microwaves", name: "Microwaves" },
      { id: "generators", name: "Generators" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "power-rating", label: "Power Rating", type: "text" },
      { id: "warranty", label: "Warranty", type: "text" },
    ],
  },
  {
    id: "beauty-health",
    name: "Beauty & Health",
    icon: "💄",
    subcategories: [
      { id: "makeup", name: "Makeup" },
      { id: "skincare", name: "Skincare" },
      { id: "fragrances", name: "Fragrances" },
      { id: "vitamins", name: "Health & Wellness" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "expiry", label: "Expiry Date", type: "text" },
    ],
  },
  {
    id: "baby-kids",
    name: "Baby & Kids",
    icon: "👶",
    subcategories: [
      { id: "baby-clothing", name: "Baby Clothing" },
      { id: "toys", name: "Toys" },
      { id: "baby-gear", name: "Baby Gear" },
    ],
    commonFields: [
      OPTIONAL_CONDITION,
      { id: "age-range", label: "Age Range", type: "text" },
      { id: "brand", label: "Brand", type: "text" },
    ],
  },
  {
    id: "animals-pets",
    name: "Animals & Pets",
    icon: "🐾",
    subcategories: [
      { id: "dogs", name: "Dogs" },
      { id: "cats", name: "Cats" },
      { id: "birds", name: "Birds" },
      { id: "pet-food", name: "Pet Food" },
    ],
    commonFields: [
      OPTIONAL_CONDITION,
      { id: "animal-type", label: "Animal Type", type: "text", required: true },
      { id: "breed", label: "Breed", type: "text" },
      { id: "age", label: "Age", type: "text" },
      { id: "sex", label: "Sex", type: "select", options: ["Male", "Female", "Mixed"] },
      { id: "quantity", label: "Quantity", type: "number" },
      {
        id: "health-status",
        label: "Health Status",
        type: "select",
        options: ["Healthy", "Vaccinated", "Needs attention"],
      },
    ],
  },
  {
    id: "farm-equipment",
    name: "Farm Equipment",
    icon: "🚜",
    subcategories: [
      { id: "tractors-equip", name: "Tractors" },
      { id: "harvesters", name: "Harvesters" },
      { id: "irrigation-equip", name: "Irrigation" },
      { id: "poultry-equip", name: "Poultry Equipment" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "model", label: "Model", type: "text" },
      { id: "hours-used", label: "Hours Used", type: "number" },
      { id: "specifications", label: "Specifications", type: "textarea" },
    ],
  },
  {
    id: "industrial-equip",
    name: "Industrial Equipment",
    icon: "🏗️",
    subcategories: [
      { id: "manufacturing", name: "Manufacturing" },
      { id: "construction-equip", name: "Construction" },
      { id: "medical-equip", name: "Medical Equipment" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "capacity", label: "Capacity", type: "text" },
      { id: "power-rating", label: "Power Rating", type: "text" },
      { id: "specifications", label: "Specifications", type: "textarea" },
    ],
  },
  {
    id: "tools-machinery",
    name: "Tools & Machinery",
    icon: "🛠️",
    subcategories: [
      { id: "power-tools", name: "Power Tools" },
      { id: "hand-tools", name: "Hand Tools" },
      { id: "machinery", name: "Machinery" },
    ],
    commonFields: [
      CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      {
        id: "power-source",
        label: "Power Source",
        type: "select",
        options: ["Electric", "Petrol", "Diesel", "Manual"],
      },
    ],
  },
  {
    id: "solar-energy",
    name: "Solar & Energy",
    icon: "☀️",
    subcategories: [
      { id: "solar-panels", name: "Solar Panels" },
      { id: "inverters", name: "Inverters" },
      { id: "batteries", name: "Batteries" },
      { id: "solar-pumps", name: "Solar Pumps" },
    ],
    commonFields: SOLAR_COMMON,
  },
  {
    id: "services",
    name: "Services",
    icon: "🤝",
    subcategories: [
      { id: "repairs", name: "Repairs" },
      { id: "cleaning", name: "Cleaning" },
      { id: "transport-serv", name: "Transportation" },
      { id: "construction-serv", name: "Construction" },
      { id: "design-serv", name: "Design" },
      { id: "software-serv", name: "Software" },
      { id: "photo-serv", name: "Photography" },
      { id: "education-serv", name: "Education" },
      { id: "agri-serv", name: "Agriculture Services" },
    ],
    commonFields: SERVICE_COMMON,
  },
  {
    id: "jobs",
    name: "Jobs & Employment",
    icon: "💼",
    subcategories: [
      { id: "full-time", name: "Full-time" },
      { id: "part-time", name: "Part-time" },
      { id: "contract", name: "Contract" },
      { id: "internship", name: "Internship" },
      { id: "freelance", name: "Freelance" },
      { id: "remote", name: "Remote" },
    ],
    commonFields: JOB_COMMON,
  },
  {
    id: "business-commercial",
    name: "Business & Commercial",
    icon: "🏢",
    subcategories: [
      { id: "business-for-sale", name: "Businesses for Sale" },
      { id: "office-equip", name: "Office Equipment" },
      { id: "wholesale-stock", name: "Wholesale Stock" },
    ],
    commonFields: [
      CONDITION,
      { id: "business-type", label: "Business Type", type: "text" },
      { id: "years-running", label: "Years Running", type: "number" },
      { id: "stock-quantity", label: "Stock Quantity", type: "number" },
    ],
  },
  {
    id: "building-construction",
    name: "Building & Construction",
    icon: "🧱",
    subcategories: [
      { id: "building-materials", name: "Building Materials" },
      { id: "plumbing", name: "Plumbing" },
      { id: "electrical", name: "Electrical" },
    ],
    commonFields: [
      CONDITION,
      { id: "material-type", label: "Material Type", type: "text" },
      { id: "quantity", label: "Quantity", type: "number" },
      {
        id: "unit",
        label: "Unit",
        type: "select",
        options: ["piece", "bag", "metre", "tonne", "set"],
      },
    ],
  },
  {
    id: "logistics-transport",
    name: "Logistics & Transportation",
    icon: "🚚",
    subcategories: [
      { id: "haulage", name: "Haulage" },
      { id: "delivery-serv", name: "Delivery Services" },
      { id: "warehousing", name: "Warehousing" },
    ],
    commonFields: [
      SERVICE_COMMON[0],
      SERVICE_COMMON[1],
      SERVICE_COMMON[2],
      SERVICE_COMMON[3],
      { id: "vehicle-type", label: "Vehicle Type", type: "text" },
    ],
  },
  {
    id: "sports-hobbies",
    name: "Sports & Hobbies",
    icon: "⚽",
    subcategories: [
      { id: "sports-equipment", name: "Sports Equipment" },
      { id: "musical-instruments", name: "Musical Instruments" },
      { id: "collectibles", name: "Collectibles" },
      { id: "other-sports", name: "Other" },
    ],
    commonFields: [
      OPTIONAL_CONDITION,
      { id: "brand", label: "Brand", type: "text" },
      { id: "age", label: "Age", type: "text" },
    ],
  },
  {
    id: "other",
    name: "Other",
    icon: "🌿",
    subcategories: [{ id: "misc", name: "Miscellaneous" }],
    commonFields: [OPTIONAL_CONDITION],
  },
];

export function getCategory(id: string) {
  return UNIVERSAL_CATEGORIES.find((category) => category.id === id);
}

export function getSubcategory(categoryId: string, subId: string) {
  return getCategory(categoryId)?.subcategories.find((subcategory) => subcategory.id === subId);
}
