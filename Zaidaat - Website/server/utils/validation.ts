import { z } from 'zod';
import { sanitizeMediaUrl } from './sanitize.js';

const safeMediaUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine((v) => sanitizeMediaUrl(v) !== null, {
    message: 'Media URL must start with /uploads/ or http(s)://',
  });

export const optionalSafeMediaUrlSchema = z
  .string()
  .trim()
  .max(300)
  .optional()
  .nullable()
  .refine((v) => !v || sanitizeMediaUrl(v) !== null, {
    message: 'Media URL must start with /uploads/ or http(s)://',
  });

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['customer', 'professional']).default('customer'),
  defaultState: z.string().trim().max(80).optional(),
  defaultCity: z.string().trim().max(80).optional(),
  defaultLocality: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(200),
  newPassword: z.string().min(8).max(128),
});

export const phoneOtpSendSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

export const phoneOtpVerifySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter 6-digit OTP'),
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['customer', 'professional']).optional(),
});

export const propertyCreateSchema = z.object({
  title: z.string().trim().min(5).max(180),
  listingPurpose: z.enum(['buy', 'rent']),
  propertyCategory: z.enum(['residential', 'commercial']),
  propertyType: z.enum([
    'apartment',
    'villa',
    'independent_house',
    'plot',
    'land',
    'shop',
    'office',
    'warehouse',
  ]),
  price: z.coerce.number().int().min(1000).max(10000000000),
  securityDeposit: z.coerce.number().int().min(0).max(500000000).optional().default(0),
  maintenanceMonthly: z.coerce.number().int().min(0).max(1000000).optional().default(0),
  areaSqft: z.coerce.number().int().min(50).max(50000000),
  bedrooms: z.coerce.number().int().min(0).max(25).optional().default(0),
  bathrooms: z.coerce.number().int().min(0).max(25).optional().default(0),
  balconies: z.coerce.number().int().min(0).max(20).optional().default(0),
  furnishing: z.enum(['unfurnished', 'semi_furnished', 'fully_furnished']).default('unfurnished'),
  facing: z.string().trim().max(40).optional().nullable(),
  floorNumber: z.coerce.number().int().min(0).max(150).optional().nullable(),
  totalFloors: z.coerce.number().int().min(0).max(150).optional().nullable(),
  ageYears: z.coerce.number().int().min(0).max(150).optional().default(0),
  possessionStatus: z.enum(['ready_to_move', 'under_construction']).default('ready_to_move'),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(120),
  addressLine: z.string().trim().max(240).optional().nullable(),
  pincode: z.string().trim().max(12).optional().nullable(),
  amenities: z.array(z.string().trim().max(60)).max(50).optional().default([]),
  description: z.string().trim().min(20).max(4000),
  reraId: z.string().trim().max(80).optional().nullable(),
  videoUrl: optionalSafeMediaUrlSchema,
  mediaUrls: z
    .array(
      z.object({
        url: safeMediaUrlSchema,
        mediaType: z.enum(['image', 'video']).default('image'),
        caption: z.string().trim().max(160).optional(),
      })
    )
    .max(15)
    .optional()
    .default([]),
});

export const propertyUpdateSchema = propertyCreateSchema.extend({
  status: z.enum(['active', 'pending', 'sold', 'rented', 'archived']).optional(),
});

export const propertyEnquirySchema = z.object({
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().trim().email().max(160).optional().or(z.literal('')),
  buyerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  message: z.string().trim().min(10).max(2000),
  preferredVisitDate: z.string().trim().max(40).optional().nullable(),
});

export const professionalProfileSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  displayName: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(8).max(180),
  bio: z.string().trim().min(20).max(3000),
  profilePhotoUrl: optionalSafeMediaUrlSchema,
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  localities: z.array(z.string().trim().min(1).max(100)).max(25).default([]),
  serviceRadiusKm: z.coerce.number().int().min(1).max(500).default(25),
  experienceYears: z.coerce.number().int().min(0).max(60).default(1),
  skills: z.array(z.string().trim().min(1).max(60)).max(25).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(15).default(['Hindi', 'English']),
  pricingModel: z.enum(['hourly', 'daily', 'project', 'sqft']),
  rateMin: z.coerce.number().int().min(50).max(50000000),
  rateMax: z.coerce.number().int().min(50).max(50000000),
  rateUnitLabel: z.string().trim().min(2).max(60),
  availabilityStatus: z.enum(['available', 'busy', 'unavailable']).default('available'),
  teamSize: z.coerce.number().int().min(1).max(500).default(1),
});

export const portfolioCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(1500),
  projectCity: z.string().trim().max(80).optional().nullable(),
  completionYear: z.coerce.number().int().min(1980).max(2035).optional().nullable(),
  budgetDisplay: z.string().trim().max(60).optional().nullable(),
  imageUrl: safeMediaUrlSchema,
  categoryTag: z.string().trim().max(60).optional().nullable(),
});

export const jobPostCreateSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(20).max(4000),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(120),
  budgetMin: z.coerce.number().int().min(0).max(500000000).default(0),
  budgetMax: z.coerce.number().int().min(0).max(500000000).default(0),
  budgetType: z.enum(['fixed', 'daily', 'hourly', 'estimate']).default('fixed'),
  preferredStartDate: z.string().trim().max(40).optional().nullable(),
  propertyType: z.string().trim().max(80).optional().nullable(),
  referenceImages: z.array(safeMediaUrlSchema).max(10).optional().default([]),
});

export const jobApplySchema = z.object({
  coverNote: z.string().trim().min(10).max(2000),
  proposedTimeline: z.string().trim().max(120).optional().nullable(),
  estimatedStartDate: z.string().trim().max(40).optional().nullable(),
});

export const quotationSchema = z.object({
  jobId: z.coerce.number().int().positive().optional().nullable(),
  hiringRequestId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().trim().min(4).max(180),
  scopeSummary: z.string().trim().min(10).max(2500),
  lineItems: z
    .array(
      z.object({
        item: z.string().trim().min(1).max(180),
        qty: z.string().trim().max(60).default('1'),
        amount: z.coerce.number().int().min(0).max(500000000),
      })
    )
    .max(30)
    .default([]),
  laborCost: z.coerce.number().int().min(0).max(500000000).default(0),
  materialCost: z.coerce.number().int().min(0).max(500000000).default(0),
  totalAmount: z.coerce.number().int().min(100).max(500000000),
  validityDays: z.coerce.number().int().min(1).max(180).default(15),
  estimatedDurationDays: z.coerce.number().int().min(1).max(1095).default(7),
  paymentTerms: z.string().trim().max(500).optional().nullable(),
});

export const hiringRequestSchema = z.object({
  professionalId: z.coerce.number().int().positive(),
  projectId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(15).max(3000),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().max(120).optional().nullable(),
  budget: z.coerce.number().int().min(0).max(500000000).default(0),
  preferredDate: z.string().trim().max(40).optional().nullable(),
  referenceImages: z.array(safeMediaUrlSchema).max(10).optional().default([]),
});

export const projectCreateSchema = z.object({
  propertyId: z.coerce.number().int().positive().optional().nullable(),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(3000),
  projectType: z.enum(['construction', 'renovation', 'interior', 'repair', 'other']).default('renovation'),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().max(120).optional().nullable(),
  totalBudget: z.coerce.number().int().min(0).max(1000000000).default(0),
  startDate: z.string().trim().max(40).optional().nullable(),
  targetEndDate: z.string().trim().max(40).optional().nullable(),
});

export const projectUpdateCreateSchema = z.object({
  updateType: z.enum(['milestone', 'progress', 'photo', 'budget', 'note']).default('progress'),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(2000),
  progressPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  expenseAmount: z.coerce.number().int().min(0).max(500000000).optional().default(0),
  photos: z.array(safeMediaUrlSchema).max(10).optional().default([]),
  milestoneStatus: z.enum(['pending', 'in_progress', 'done']).optional().default('done'),
});

export const reviewCreateSchema = z.object({
  professionalId: z.coerce.number().int().positive(),
  projectId: z.coerce.number().int().positive().optional().nullable(),
  jobId: z.coerce.number().int().positive().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  workQualityRating: z.coerce.number().int().min(1).max(5).default(5),
  punctualityRating: z.coerce.number().int().min(1).max(5).default(5),
  valueRating: z.coerce.number().int().min(1).max(5).default(5),
  title: z.string().trim().min(3).max(160),
  comment: z.string().trim().min(10).max(2000),
});

export const messageCreateSchema = z.object({
  recipientId: z.coerce.number().int().positive(),
  contextType: z.enum(['property', 'job', 'hiring', 'project', 'direct']).default('direct'),
  contextId: z.coerce.number().int().positive().optional().nullable(),
  body: z.string().trim().min(1).max(3000),
});

export const reportCreateSchema = z.object({
  targetType: z.enum(['property', 'professional', 'user', 'job', 'review']),
  targetId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3).max(160),
  details: z.string().trim().min(10).max(2000),
});
