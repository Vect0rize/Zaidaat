-- ZAIDAAT Initial Relational Database Schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Users & Roles
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'google', 'phone')),
  google_id TEXT UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  default_state TEXT,
  default_city TEXT,
  default_locality TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'professional', 'admin')),
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

-- 2. All-India Location Directory
CREATE TABLE IF NOT EXISTS india_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  pincode TEXT,
  region_zone TEXT,
  UNIQUE(state, city, locality)
);
CREATE INDEX IF NOT EXISTS idx_locations_state_city ON india_locations(state, city);
CREATE INDEX IF NOT EXISTS idx_locations_city ON india_locations(city);

-- 3. Property Marketplace
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  listing_purpose TEXT NOT NULL CHECK (listing_purpose IN ('buy', 'rent')),
  property_category TEXT NOT NULL CHECK (property_category IN ('residential', 'commercial')),
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'villa', 'independent_house', 'plot', 'land', 'shop', 'office', 'warehouse')),
  price INTEGER NOT NULL CHECK (price >= 0),
  price_unit TEXT NOT NULL DEFAULT 'total' CHECK (price_unit IN ('total', 'monthly')),
  security_deposit INTEGER DEFAULT 0,
  maintenance_monthly INTEGER DEFAULT 0,
  area_sqft INTEGER NOT NULL CHECK (area_sqft > 0),
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  balconies INTEGER NOT NULL DEFAULT 0,
  furnishing TEXT NOT NULL DEFAULT 'unfurnished' CHECK (furnishing IN ('unfurnished', 'semi_furnished', 'fully_furnished')),
  facing TEXT,
  floor_number INTEGER,
  total_floors INTEGER,
  age_years INTEGER DEFAULT 0,
  possession_status TEXT NOT NULL DEFAULT 'ready_to_move' CHECK (possession_status IN ('ready_to_move', 'under_construction')),
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address_line TEXT,
  pincode TEXT,
  amenities_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  rera_id TEXT,
  video_url TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold', 'rented', 'archived')),
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_properties_purpose_status ON properties(listing_purpose, status);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(state, city, locality);
CREATE INDEX IF NOT EXISTS idx_properties_type_price ON properties(property_type, price);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);

CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  caption TEXT,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_property_images_prop ON property_images(property_id);

CREATE TABLE IF NOT EXISTS saved_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS property_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  preferred_visit_date TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'site_visited', 'closed')),
  owner_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_enquiries_property ON property_enquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_owner ON property_enquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_buyer ON property_enquiries(buyer_id);

-- 4. Professional Marketplace
CREATE TABLE IF NOT EXISTS professional_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'Wrench',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS professional_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES professional_categories(id),
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  bio TEXT NOT NULL,
  profile_photo_url TEXT,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  localities_json TEXT NOT NULL DEFAULT '[]',
  service_radius_km INTEGER NOT NULL DEFAULT 25,
  experience_years INTEGER NOT NULL DEFAULT 1,
  skills_json TEXT NOT NULL DEFAULT '[]',
  languages_json TEXT NOT NULL DEFAULT '["Hindi", "English"]',
  pricing_model TEXT NOT NULL DEFAULT 'daily' CHECK (pricing_model IN ('hourly', 'daily', 'project', 'sqft')),
  rate_min INTEGER NOT NULL DEFAULT 500,
  rate_max INTEGER NOT NULL DEFAULT 1500,
  rate_unit_label TEXT NOT NULL DEFAULT 'per day',
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable')),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  rating_avg REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  completed_jobs_count INTEGER NOT NULL DEFAULT 0,
  response_time_hours INTEGER NOT NULL DEFAULT 4,
  team_size INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pro_category ON professional_profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_pro_location ON professional_profiles(state, city);
CREATE INDEX IF NOT EXISTS idx_pro_avail_ver ON professional_profiles(availability_status, verification_status);

CREATE TABLE IF NOT EXISTS professional_portfolios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_city TEXT,
  completion_year INTEGER,
  budget_display TEXT,
  image_url TEXT NOT NULL,
  category_tag TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_portfolio_pro ON professional_portfolios(professional_id);

-- 5. Work Marketplace (Jobs, Applications, Quotations, Hiring Requests)
CREATE TABLE IF NOT EXISTS job_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES professional_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  budget_min INTEGER NOT NULL DEFAULT 0,
  budget_max INTEGER NOT NULL DEFAULT 0,
  budget_type TEXT NOT NULL DEFAULT 'fixed' CHECK (budget_type IN ('fixed', 'daily', 'hourly', 'estimate')),
  preferred_start_date TEXT,
  property_type TEXT,
  reference_images_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_professional_id INTEGER REFERENCES professional_profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_cat_loc ON job_posts(category_id, state, city);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON job_posts(customer_id);

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  cover_note TEXT NOT NULL,
  proposed_timeline TEXT,
  estimated_start_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, professional_id)
);
CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_pro ON job_applications(professional_id);

CREATE TABLE IF NOT EXISTS hiring_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  project_id INTEGER,
  job_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT,
  budget INTEGER NOT NULL DEFAULT 0,
  preferred_date TEXT,
  reference_images_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  pro_response_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_hiring_customer ON hiring_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_hiring_pro ON hiring_requests(professional_id);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES job_posts(id) ON DELETE CASCADE,
  hiring_request_id INTEGER REFERENCES hiring_requests(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scope_summary TEXT NOT NULL,
  line_items_json TEXT NOT NULL DEFAULT '[]',
  labor_cost INTEGER NOT NULL DEFAULT 0,
  material_cost INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  validity_days INTEGER NOT NULL DEFAULT 15,
  estimated_duration_days INTEGER NOT NULL DEFAULT 7,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'revised', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quotes_job ON quotations(job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_hiring ON quotations(hiring_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_pro ON quotations(professional_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotations(customer_id);

-- 6. Project Hub
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  job_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'renovation' CHECK (project_type IN ('construction', 'renovation', 'interior', 'repair', 'other')),
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT,
  total_budget INTEGER NOT NULL DEFAULT 0,
  spent_amount INTEGER NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  start_date TEXT,
  target_end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS project_professionals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  role_in_project TEXT NOT NULL,
  agreed_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed')),
  hired_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, professional_id)
);
CREATE INDEX IF NOT EXISTS idx_project_pros_project ON project_professionals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_pros_pro ON project_professionals(professional_id);

CREATE TABLE IF NOT EXISTS project_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  update_type TEXT NOT NULL DEFAULT 'progress' CHECK (update_type IN ('milestone', 'progress', 'photo', 'budget', 'note')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  progress_percent INTEGER,
  expense_amount INTEGER DEFAULT 0,
  photos_json TEXT NOT NULL DEFAULT '[]',
  milestone_status TEXT DEFAULT 'done' CHECK (milestone_status IN ('pending', 'in_progress', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_project_updates_project ON project_updates(project_id);

-- 7. Messaging, Reviews, Verification, Notifications, Subscriptions, Reports
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_key TEXT NOT NULL,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL DEFAULT 'direct' CHECK (context_type IN ('property', 'job', 'hiring', 'project', 'direct')),
  context_id INTEGER,
  body TEXT NOT NULL,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_key, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, recipient_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  job_id INTEGER REFERENCES job_posts(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  work_quality_rating INTEGER NOT NULL DEFAULT 5 CHECK (work_quality_rating >= 1 AND work_quality_rating <= 5),
  punctuality_rating INTEGER NOT NULL DEFAULT 5 CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  value_rating INTEGER NOT NULL DEFAULT 5 CHECK (value_rating >= 1 AND value_rating <= 5),
  title TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_pro ON reviews(professional_id);

CREATE TABLE IF NOT EXISTS verification_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id INTEGER REFERENCES professional_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar_masked', 'pan', 'gst', 'trade_license', 'coa_license', 'portfolio_check')),
  document_number_masked TEXT NOT NULL,
  document_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  admin_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_records(status);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL CHECK (plan_code IN ('free_customer', 'pro_starter', 'pro_verified_plus', 'builder_enterprise')),
  role_scope TEXT NOT NULL DEFAULT 'customer',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  price_inr INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  features_json TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS complaints_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('property', 'professional', 'user', 'job', 'review')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_resolution TEXT,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints_reports(status);
