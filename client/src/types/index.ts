export type UserRole = 'customer' | 'professional' | 'admin';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  authProvider: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  defaultState: string | null;
  defaultCity: string | null;
  defaultLocality: string | null;
  roles: UserRole[];
  professionalProfile: {
    id: number;
    category_id: number;
    display_name: string;
    verification_status: string;
    availability_status: string;
  } | null;
  unreadNotifications: number;
  unreadMessages: number;
  subscription: {
    plan_code: string;
    status: string;
    billing_cycle: string;
    expires_at: string | null;
  } | null;
}

export interface AuthProvidersInfo {
  googleConfigured: boolean;
  smsConfigured: boolean;
  devOtpEnabled: boolean;
}

export interface PropertyMedia {
  id: number;
  url: string;
  caption: string | null;
  mediaType: 'image' | 'video';
  isPrimary: boolean;
}

export interface Property {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerCity: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  title: string;
  slug: string;
  listingPurpose: 'buy' | 'rent';
  propertyCategory: 'residential' | 'commercial';
  propertyType: 'apartment' | 'villa' | 'independent_house' | 'plot' | 'land' | 'shop' | 'office' | 'warehouse';
  price: number;
  priceUnit: 'total' | 'monthly';
  securityDeposit: number;
  maintenanceMonthly: number;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  furnishing: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
  facing: string | null;
  floorNumber: number | null;
  totalFloors: number | null;
  ageYears: number;
  possessionStatus: 'ready_to_move' | 'under_construction';
  state: string;
  city: string;
  locality: string;
  addressLine: string | null;
  pincode: string | null;
  amenities: string[];
  description: string;
  reraId: string | null;
  videoUrl: string | null;
  isFeatured: boolean;
  status: 'active' | 'pending' | 'sold' | 'rented' | 'archived';
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  isSaved: boolean;
  images: PropertyMedia[];
}

export interface ProfessionalCategory {
  id: number;
  name: string;
  slug: string;
  group_name: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: number;
  pro_count?: number;
}

export interface ProfessionalProfile {
  id: number;
  userId: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryIcon: string;
  displayName: string;
  headline: string;
  bio: string;
  profilePhotoUrl: string | null;
  state: string;
  city: string;
  localities: string[];
  serviceRadiusKm: number;
  experienceYears: number;
  skills: string[];
  languages: string[];
  pricingModel: 'hourly' | 'daily' | 'project' | 'sqft';
  rateMin: number;
  rateMax: number;
  rateUnitLabel: string;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  ratingAvg: number;
  reviewCount: number;
  completedJobsCount: number;
  responseTimeHours: number;
  teamSize: number;
  portfolioPreview?: Array<{ id: number; title: string; imageUrl: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface JobPost {
  id: number;
  customerId: number;
  customerName: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  title: string;
  description: string;
  state: string;
  city: string;
  locality: string;
  budgetMin: number;
  budgetMax: number;
  budgetType: 'fixed' | 'daily' | 'hourly' | 'estimate';
  preferredStartDate: string | null;
  propertyType: string | null;
  referenceImages: string[];
  status: 'open' | 'in_review' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedProfessionalId: number | null;
  applicationsCount: number;
  quotationsCount: number;
  isSaved?: boolean;
  createdAt: string;
}

export interface ProjectSummary {
  id: number;
  customer_id: number;
  customer_name?: string;
  property_id: number | null;
  job_id: number | null;
  title: string;
  description: string;
  project_type: string;
  state: string;
  city: string;
  locality: string | null;
  total_budget: number;
  spent_amount: number;
  progress_percent: number;
  start_date: string | null;
  target_end_date: string | null;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  pros_count?: number;
  updates_count?: number;
  created_at: string;
  updated_at: string;
}
