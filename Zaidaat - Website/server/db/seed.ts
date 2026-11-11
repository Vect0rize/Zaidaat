import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { getDb, closeDb, withTransaction } from './connection.js';
import { runMigrations } from './migrate.js';
import { ensureSeedMedia } from './seedMedia.js';

const __filename = fileURLToPath(import.meta.url);

export function seedDatabase(): void {
  runMigrations(false);
  ensureSeedMedia();

  const db = getDb();
  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt > 0) {
    console.log('[seed] Database already contains users; skipping duplicate seed.');
    return;
  }

  const demoPassHash = bcrypt.hashSync('Zaidaat@123', 10);
  const adminPassHash = bcrypt.hashSync('AdminZaidaat@123', 10);

  withTransaction((tx) => {
    const insertUser = tx.prepare(`
      INSERT INTO users (full_name, email, phone, password_hash, avatar_url, auth_provider, email_verified, phone_verified, default_state, default_city, default_locality)
      VALUES (?, ?, ?, ?, ?, 'local', 1, 1, ?, ?, ?)
    `);
    const insertRole = tx.prepare(`INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, ?)`);

    // 1. Admin
    const adminId = Number(
      insertUser.run(
        'Vikramaditya Rao (Admin)',
        'admin@zaidaat.in',
        '9810000001',
        adminPassHash,
        null,
        'Delhi',
        'New Delhi',
        'Saket'
      ).lastInsertRowid
    );
    insertRole.run(adminId, 'admin');
    insertRole.run(adminId, 'customer');

    // 2. Customers
    const ananyaId = Number(
      insertUser.run(
        'Ananya Sharma',
        'ananya.sharma@zaidaat.in',
        '9820112233',
        demoPassHash,
        null,
        'Maharashtra',
        'Mumbai',
        'Bandra West'
      ).lastInsertRowid
    );
    insertRole.run(ananyaId, 'customer');

    const rohitId = Number(
      insertUser.run(
        'Rohit Verma',
        'rohit.verma@zaidaat.in',
        '9845112244',
        demoPassHash,
        null,
        'Karnataka',
        'Bengaluru',
        'Whitefield'
      ).lastInsertRowid
    );
    insertRole.run(rohitId, 'customer');

    const priyaCustId = Number(
      insertUser.run(
        'Priya Nair',
        'priya.nair@zaidaat.in',
        '9895113355',
        demoPassHash,
        null,
        'Kerala',
        'Kochi',
        'Kakkanad'
      ).lastInsertRowid
    );
    insertRole.run(priyaCustId, 'customer');

    // 3. Professionals (also carry customer role so they can buy/sell properties too)
    const proSeeds = [
      {
        name: 'Rajesh Kumar Buildcon',
        email: 'rajesh.thekedar@zaidaat.in',
        phone: '9811223301',
        state: 'Delhi',
        city: 'New Delhi',
        locality: 'Dwarka',
        catSlug: 'thekedars-contractors',
        headline: 'Turnkey Residential Contractor & Civil Thekedar (G+3 Specialist)',
        bio: '16+ years executing turnkey home construction, structural extensions, and full-floor renovations across Delhi NCR. Dedicated crew of 22 masons, bar-benders, and site supervisors with transparent BOQ billing.',
        photo: null as string | null,
        localities: ['Dwarka', 'Saket', 'Vasant Kunj', 'Sector 62', 'DLF Phase 4'],
        radius: 40,
        exp: 16,
        skills: ['Turnkey Construction', 'RCC Structure', 'Home Renovation', 'BOQ & Estimation', 'Basement Work'],
        languages: ['Hindi', 'English', 'Punjabi'],
        pricingModel: 'sqft',
        rateMin: 1650,
        rateMax: 2200,
        rateLabel: 'per sq.ft (turnkey)',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.9,
        reviews: 28,
        jobs: 64,
        team: 22,
      },
      {
        name: 'Meera Nair Architects',
        email: 'meera.architect@zaidaat.in',
        phone: '9845223302',
        state: 'Karnataka',
        city: 'Bengaluru',
        locality: 'Indiranagar',
        catSlug: 'architects',
        headline: 'COA Registered Architect • Sustainable Homes & Vaastu Layouts',
        bio: 'Principal Architect delivering climate-responsive residences, 3D elevation modeling, BBMP sanction drawings, and full interior architectural documentation across Karnataka and South India.',
        photo: null as string | null,
        localities: ['Indiranagar', 'Whitefield', 'Koramangala', 'HSR Layout', 'Jayanagar'],
        radius: 50,
        exp: 11,
        skills: ['Architectural Floor Plans', '3D Elevation', 'Vaastu Planning', 'Sanction Drawings', 'Eco-Homes'],
        languages: ['English', 'Kannada', 'Malayalam', 'Hindi'],
        pricingModel: 'sqft',
        rateMin: 65,
        rateMax: 120,
        rateLabel: 'per sq.ft (design)',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.8,
        reviews: 19,
        jobs: 42,
        team: 6,
      },
      {
        name: 'Vikram Singh Woodworks',
        email: 'vikram.carpenter@zaidaat.in',
        phone: '9820223303',
        state: 'Maharashtra',
        city: 'Mumbai',
        locality: 'Andheri West',
        catSlug: 'carpenters',
        headline: 'Master Carpenter • Custom Wardrobes, Teak Doors & Veneer Panelling',
        bio: 'Precision carpentry for marine-ply wardrobes, concealed sliding doors, solid Burma teak joinery, and bespoke living room TV units across Mumbai & Thane.',
        photo: null as string | null,
        localities: ['Andheri West', 'Bandra West', 'Powai', 'Thane West', 'Worli'],
        radius: 30,
        exp: 14,
        skills: ['Custom Wardrobes', 'Teak Wood Doors', 'Veneer Work', 'Bed & Storage', 'Door Lock & Hinge Repair'],
        languages: ['Hindi', 'Marathi', 'English'],
        pricingModel: 'daily',
        rateMin: 1100,
        rateMax: 1500,
        rateLabel: 'per day',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.8,
        reviews: 34,
        jobs: 95,
        team: 4,
      },
      {
        name: 'Arjun Patil Electricals',
        email: 'arjun.electrician@zaidaat.in',
        phone: '9822223304',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Baner',
        catSlug: 'electricians',
        headline: 'Licensed Electrician • 3-Phase Wiring, Smart Automation & DB Panels',
        bio: 'Government-certified wireman specializing in complete apartment concealed wiring, inverter/UPS changeovers, earthing pits, and smart Wi-Fi switchboards.',
        photo: null as string | null,
        localities: ['Baner', 'Kothrud', 'Hinjewadi', 'Viman Nagar'],
        radius: 25,
        exp: 9,
        skills: ['Concealed House Wiring', 'MCB & DB Setup', 'Smart Switches', 'Inverter Installation', 'Fault Tracing'],
        languages: ['Marathi', 'Hindi', 'English'],
        pricingModel: 'hourly',
        rateMin: 350,
        rateMax: 600,
        rateLabel: 'per hour / visit',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.7,
        reviews: 22,
        jobs: 118,
        team: 3,
      },
      {
        name: 'Suresh Mishra Plumbing',
        email: 'suresh.plumber@zaidaat.in',
        phone: '9839223305',
        state: 'Uttar Pradesh',
        city: 'Lucknow',
        locality: 'Gomti Nagar',
        catSlug: 'plumbers',
        headline: 'CPVC / PPR Plumbing, Concealed Diverters & Pressure Pump Specialist',
        bio: 'Complete bathroom & kitchen sanitary installations, Jaquar/Kohler concealed fittings, terrace overhead tank piping, and pressure booster pump setups.',
        photo: null as string | null,
        localities: ['Gomti Nagar', 'Hazratganj', 'Indirapuram', 'Sector 62'],
        radius: 30,
        exp: 12,
        skills: ['CPVC & UPVC Piping', 'Concealed Diverters', 'Booster Pumps', 'Leakage Repair', 'Rainwater Harvesting'],
        languages: ['Hindi', 'English'],
        pricingModel: 'daily',
        rateMin: 850,
        rateMax: 1200,
        rateLabel: 'per day',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.6,
        reviews: 15,
        jobs: 83,
        team: 2,
      },
      {
        name: 'Kavita Deshmukh Interiors',
        email: 'kavita.interiors@zaidaat.in',
        phone: '9880223306',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Jubilee Hills',
        catSlug: 'interior-designers',
        headline: 'Luxury & Mid-Segment Home Interiors • 45-Day Handover Guarantee',
        bio: 'Full-service residential interior studio covering 3D visualization, modular kitchens, POP false ceilings, lighting curves, and custom soft furnishings.',
        photo: null as string | null,
        localities: ['Jubilee Hills', 'Gachibowli', 'Kondapur', 'Banjara Hills'],
        radius: 35,
        exp: 8,
        skills: ['3D Interior Design', 'False Ceiling', 'Lighting Plan', 'Turnkey Interiors', 'Color Consultation'],
        languages: ['Telugu', 'Hindi', 'English'],
        pricingModel: 'project',
        rateMin: 250000,
        rateMax: 1200000,
        rateLabel: 'per project',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.9,
        reviews: 24,
        jobs: 37,
        team: 9,
      },
      {
        name: 'Farhan Ahmed Civil & Structural',
        email: 'farhan.civil@zaidaat.in',
        phone: '9825223307',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'SG Highway',
        catSlug: 'civil-engineers',
        headline: 'M.Tech Structural Engineer • Quality Audit, BOQ & Retrofitting',
        bio: 'Independent civil engineering consultancy offering structural stability audits, RCC bar-bending inspection, concrete cube testing coordination, and cost-effective house planning.',
        photo: null as string | null,
        localities: ['SG Highway', 'Satellite', 'Bopal', 'Vesu'],
        radius: 45,
        exp: 10,
        skills: ['Structural Audit', 'RCC Detailing', 'BOQ Preparation', 'Site Supervision', 'Soil Testing'],
        languages: ['Gujarati', 'Hindi', 'English'],
        pricingModel: 'project',
        rateMin: 18000,
        rateMax: 85000,
        rateLabel: 'per project',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.8,
        reviews: 12,
        jobs: 31,
        team: 3,
      },
      {
        name: 'Deepak Chauhan Painters',
        email: 'deepak.painter@zaidaat.in',
        phone: '9829223308',
        state: 'Rajasthan',
        city: 'Jaipur',
        locality: 'Vaishali Nagar',
        catSlug: 'painters',
        headline: 'Asian Paints Trained Team • Royal Play Textures, Putty & Polish',
        bio: 'Dust-free mechanized wall sanding, Birla putty, primer, Royale emulsion, exterior Apex Ultima, and PU wood polish across Jaipur homes and offices.',
        photo: null as string | null,
        localities: ['Vaishali Nagar', 'Malviya Nagar', 'Mansarovar'],
        radius: 25,
        exp: 11,
        skills: ['Interior Emulsion', 'Exterior Weather Coat', 'Wall Textures', 'Wood PU Polish', 'Damp Primer'],
        languages: ['Hindi', 'Rajasthani'],
        pricingModel: 'sqft',
        rateMin: 18,
        rateMax: 38,
        rateLabel: 'per sq.ft',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.7,
        reviews: 27,
        jobs: 110,
        team: 6,
      },
      {
        name: 'Harpreet Singh Waterproofing',
        email: 'harpreet.waterproof@zaidaat.in',
        phone: '9815223309',
        state: 'Chandigarh',
        city: 'Chandigarh',
        locality: 'Sector 35',
        catSlug: 'waterproofing-specialists',
        headline: 'Dr. Fixit & Fosroc Certified • Terrace PU Coating & Damp Cure',
        bio: '10-year warranty terrace waterproofing, sunken bathroom PU grouting, epoxy injection for basement seepage, and heat-reflective roof coatings.',
        photo: null as string | null,
        localities: ['Sector 35', 'Sector 17', 'Sector 70', 'Sector 20'],
        radius: 40,
        exp: 13,
        skills: ['Terrace Waterproofing', 'Bathroom Grouting', 'Injection Grouting', 'Heat Insulation', 'Basement Sealing'],
        languages: ['Punjabi', 'Hindi', 'English'],
        pricingModel: 'sqft',
        rateMin: 45,
        rateMax: 110,
        rateLabel: 'per sq.ft',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.9,
        reviews: 18,
        jobs: 76,
        team: 5,
      },
      {
        name: 'Ramesh Nair Tile & Granite',
        email: 'ramesh.tile@zaidaat.in',
        phone: '9840223310',
        state: 'Tamil Nadu',
        city: 'Chennai',
        locality: 'Adyar',
        catSlug: 'tile-fitters',
        headline: 'Large-Format Vitrified, Italian Marble & Granite Kitchen Countertop Expert',
        bio: 'Zero-lippage laser-leveled flooring, epoxy tile grouting, staircase granite nosing, and outdoor anti-skid terrace tiling.',
        photo: null as string | null,
        localities: ['Adyar', 'Anna Nagar', 'OMR Sholinganallur'],
        radius: 30,
        exp: 15,
        skills: ['Italian Marble Laying', 'Epoxy Grouting', 'Granite Counters', 'Laser Level Flooring', 'Wall Cladding'],
        languages: ['Tamil', 'Malayalam', 'English'],
        pricingModel: 'sqft',
        rateMin: 32,
        rateMax: 85,
        rateLabel: 'per sq.ft',
        avail: 'busy',
        verStatus: 'verified',
        rating: 4.8,
        reviews: 21,
        jobs: 88,
        team: 4,
      },
      {
        name: 'Manoj Tiwari HVAC & AC Care',
        email: 'manoj.ac@zaidaat.in',
        phone: '9831223311',
        state: 'West Bengal',
        city: 'Kolkata',
        locality: 'Salt Lake Sector V',
        catSlug: 'ac-technicians',
        headline: 'Split, Inverter & VRV AC Installation, Copper Piping & Deep Jet Service',
        bio: 'Fast doorstep servicing, concealed copper line pre-piping for new constructions, R32/R410A gas charging, and PCB diagnostics.',
        photo: null as string | null,
        localities: ['Salt Lake Sector V', 'New Town', 'Ballygunge'],
        radius: 25,
        exp: 8,
        skills: ['Split AC Installation', 'Concealed Copper Piping', 'Jet Pump Cleaning', 'Gas Refill', 'Inverter PCB Repair'],
        languages: ['Bengali', 'Hindi', 'English'],
        pricingModel: 'hourly',
        rateMin: 499,
        rateMax: 1500,
        rateLabel: 'per service',
        avail: 'available',
        verStatus: 'pending',
        rating: 4.5,
        reviews: 9,
        jobs: 54,
        team: 2,
      },
      {
        name: 'Lakshmi Modular Kitchens',
        email: 'lakshmi.kitchen@zaidaat.in',
        phone: '9849223312',
        state: 'Kerala',
        city: 'Kochi',
        locality: 'Kakkanad',
        catSlug: 'modular-kitchen-specialists',
        headline: 'Hettich & Blum Hardware • BWP Marine Ply & Stainless Modular Kitchens',
        bio: 'Moisture-proof coastal-grade modular kitchens tailored for Indian cooking, tall pantry units, quartz countertops, and chimney ducting.',
        photo: null as string | null,
        localities: ['Kakkanad', 'Edappally'],
        radius: 35,
        exp: 10,
        skills: ['BWP Marine Ply Kitchen', 'Quartz Countertop', 'Soft-Close Tandem', 'Chimney & Hob Setup', 'Tall Pantry Units'],
        languages: ['Malayalam', 'English', 'Hindi'],
        pricingModel: 'project',
        rateMin: 120000,
        rateMax: 480000,
        rateLabel: 'per kitchen',
        avail: 'available',
        verStatus: 'verified',
        rating: 4.9,
        reviews: 16,
        jobs: 49,
        team: 5,
      },
    ];

    const getCatId = tx.prepare('SELECT id FROM professional_categories WHERE slug = ?');
    const insertProProfile = tx.prepare(`
      INSERT INTO professional_profiles (
        user_id, category_id, display_name, headline, bio, profile_photo_url,
        state, city, localities_json, service_radius_km, experience_years,
        skills_json, languages_json, pricing_model, rate_min, rate_max, rate_unit_label,
        availability_status, verification_status, rating_avg, review_count, completed_jobs_count, response_time_hours, team_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const proProfileIds: Record<string, number> = {};
    const proUserIds: Record<string, number> = {};

    for (const p of proSeeds) {
      const uid = Number(
        insertUser.run(p.name, p.email, p.phone, demoPassHash, p.photo, p.state, p.city, p.locality).lastInsertRowid
      );
      insertRole.run(uid, 'professional');
      insertRole.run(uid, 'customer');
      proUserIds[p.email] = uid;

      const cat = getCatId.get(p.catSlug) as { id: number };
      const pid = Number(
        insertProProfile.run(
          uid,
          cat.id,
          p.name,
          p.headline,
          p.bio,
          p.photo,
          p.state,
          p.city,
          JSON.stringify(p.localities),
          p.radius,
          p.exp,
          JSON.stringify(p.skills),
          JSON.stringify(p.languages),
          p.pricingModel,
          p.rateMin,
          p.rateMax,
          p.rateLabel,
          p.avail,
          p.verStatus,
          p.rating,
          p.reviews,
          p.jobs,
          3,
          p.team
        ).lastInsertRowid
      );
      proProfileIds[p.email] = pid;
    }

    // Portfolios (authentic project showcase imagery for every seeded professional)
    const insertPortfolio = tx.prepare(`
      INSERT INTO professional_portfolios (professional_id, title, description, project_city, completion_year, budget_display, image_url, category_tag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const portfolioSeeds: Array<[string, string, string, string, number, string, string, string]> = [
      [
        'rajesh.thekedar@zaidaat.in',
        'G+2 Independent Duplex Construction — Dwarka Sector 19',
        'Complete excavation, RCC framed structure, brick masonry, plumbing, electrical, and exterior stone cladding handed over in 11 months.',
        'New Delhi',
        2025,
        '₹68 Lakhs',
        '/uploads/seed/trades/thekedars-contractors.jpg',
        'Turnkey Construction',
      ],
      [
        'rajesh.thekedar@zaidaat.in',
        'Structural Rebar & Slab Formwork — Vasant Kunj Extension',
        'Heavy reinforcement execution with anti-termite plinth barrier and certified concrete curing.',
        'New Delhi',
        2024,
        '₹42 Lakhs',
        '/uploads/seed/work-construction.jpg',
        'Civil & RCC',
      ],
      [
        'vikram.carpenter@zaidaat.in',
        'Teak & Matte Acrylic Wardrobes — Bandra 3BHK',
        'Floor-to-ceiling sliding wardrobes with soft-close Hettich channels and fluted oak veneer panelling.',
        'Mumbai',
        2025,
        '₹4.2 Lakhs',
        '/uploads/seed/trades/carpenters.jpg',
        'Custom Woodwork',
      ],
      [
        'vikram.carpenter@zaidaat.in',
        'Bespoke Living & Dining Woodwork — Powai Lakeview',
        'Solid seasoned teakwood doors, paneling, and custom joinery finished in satin PU polish.',
        'Mumbai',
        2026,
        '₹3.6 Lakhs',
        '/uploads/seed/prop-interior-gallery.jpg',
        'Interior Carpentry',
      ],
      [
        'meera.architect@zaidaat.in',
        'Courtyard Cross-Ventilated Villa — Whitefield',
        '3,200 sq.ft passive-cooling residence featuring double-height living room, skylight court, and rainwater recharge.',
        'Bengaluru',
        2025,
        '₹1.15 Cr',
        '/uploads/seed/trades/architects.jpg',
        'Architecture',
      ],
      [
        'meera.architect@zaidaat.in',
        'Contemporary Courtyard Elevation — Indiranagar',
        'Architectural planning, municipality sanction drawings, and sun-path calibrated elevation design.',
        'Bengaluru',
        2025,
        '₹95 Lakhs',
        '/uploads/seed/prop-bengaluru-villa.jpg',
        'Villa Design',
      ],
      [
        'arjun.electrician@zaidaat.in',
        '3-Phase Concealed Rewiring & MCB Board — Baner',
        'Complete copper FR-LSH concealed wiring with Surge Protection Device, earthing pit, and smart Wi-Fi switches.',
        'Pune',
        2026,
        '₹1.1 Lakhs',
        '/uploads/seed/trades/electricians.jpg',
        'Electrical & Panel',
      ],
      [
        'suresh.plumber@zaidaat.in',
        'Concealed CPVC Bathroom & Booster Setup — Gomti Nagar',
        'Full sanitary line replacement, concealed diverters, overhead pressure pump, and leak testing.',
        'Lucknow',
        2025,
        '₹85,000',
        '/uploads/seed/trades/plumbers.jpg',
        'Plumbing & Sanitary',
      ],
      [
        'kavita.interiors@zaidaat.in',
        'Fluted Wall & Cove Lighting Suite — Jubilee Hills',
        'Complete master bedroom paneling, motorized blinds, acoustic backing, and warm architectural lighting.',
        'Hyderabad',
        2026,
        '₹8.5 Lakhs',
        '/uploads/seed/trades/interior-designers.jpg',
        'Turnkey Interiors',
      ],
      [
        'kavita.interiors@zaidaat.in',
        'Open-Plan Lounge & Dining — Gachibowli Penthouse',
        'Minimalist limewash walls paired with teak furniture and customized soft furnishings.',
        'Hyderabad',
        2025,
        '₹11.2 Lakhs',
        '/uploads/seed/prop-interior-gallery.jpg',
        'Living Space',
      ],
      [
        'farhan.civil@zaidaat.in',
        'RCC Quality Audit & Level Survey — SG Highway',
        'Structural core testing, site benchmark levelling, and reinforced slab QA inspection before concreting.',
        'Ahmedabad',
        2025,
        '₹55,000',
        '/uploads/seed/trades/civil-engineers.jpg',
        'Structural Audit',
      ],
      [
        'deepak.painter@zaidaat.in',
        'Exterior Weather-Coat Facade Repaint — Vaishali Nagar',
        'Crack-bridging elastomeric putty, anti-fungal primer, and two coats of UV-resistant exterior emulsion.',
        'Jaipur',
        2026,
        '₹1.4 Lakhs',
        '/uploads/seed/trades/painters.jpg',
        'Exterior Painting',
      ],
      [
        'harpreet.waterproof@zaidaat.in',
        'APP Bituminous Terrace Waterproofing — Sector 35',
        '5-layer crack sealing, primer, and torch-applied waterproofing membrane with 10-year leakage warranty.',
        'Chandigarh',
        2025,
        '₹92,000',
        '/uploads/seed/trades/waterproofing-specialists.jpg',
        'Terrace Sealing',
      ],
      [
        'ramesh.tile@zaidaat.in',
        'Laser-Levelled Ceramic & Stone Tiling — Adyar',
        'Zero-lippage floor tile installation with stain-resistant epoxy grouting and skirting bevels.',
        'Chennai',
        2026,
        '₹2.1 Lakhs',
        '/uploads/seed/trades/tile-fitters.jpg',
        'Floor Tiling',
      ],
      [
        'manoj.ac@zaidaat.in',
        'Concealed Copper Piping & Split HVAC — Salt Lake',
        'Four-room insulated copper refrigerant piping and condenser coil deep servicing before handover.',
        'Kolkata',
        2026,
        '₹48,000',
        '/uploads/seed/trades/ac-technicians.jpg',
        'HVAC & Split AC',
      ],
      [
        'lakshmi.kitchen@zaidaat.in',
        'Coastal BWP Island Kitchen — Kakkanad Villa',
        'Moisture-resistant BWP ply island kitchen with quartz counter, corner magic carousel, and built-in oven tower.',
        'Kochi',
        2026,
        '₹3.1 Lakhs',
        '/uploads/seed/trades/modular-kitchen-specialists.jpg',
        'Modular Kitchen',
      ],
    ];
    for (const row of portfolioSeeds) {
      insertPortfolio.run(
        proProfileIds[row[0]],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7]
      );
    }

    // 4. Properties across India (Buy & Rent, Residential & Commercial)
    const insertProp = tx.prepare(`
      INSERT INTO properties (
        owner_id, title, slug, listing_purpose, property_category, property_type,
        price, price_unit, security_deposit, maintenance_monthly, area_sqft,
        bedrooms, bathrooms, balconies, furnishing, facing, floor_number, total_floors,
        age_years, possession_status, state, city, locality, address_line, pincode,
        amenities_json, description, rera_id, is_featured, status, views_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `);
    const insertPropImg = tx.prepare(`
      INSERT INTO property_images (property_id, file_url, caption, media_type, is_primary, sort_order)
      VALUES (?, ?, ?, 'image', ?, ?)
    `);

    const propSeeds = [
      {
        ownerId: ananyaId,
        title: 'Sea-Breeze 3 BHK Luxury Apartment in Bandra West',
        slug: 'sea-breeze-3-bhk-bandra-west-mumbai',
        purpose: 'buy',
        cat: 'residential',
        type: 'apartment',
        price: 42500000,
        unit: 'total',
        deposit: 0,
        maint: 9500,
        sqft: 1580,
        bhk: 3,
        bath: 3,
        balc: 2,
        furnishing: 'semi_furnished',
        facing: 'West',
        floor: 9,
        totalFloors: 16,
        age: 3,
        poss: 'ready_to_move',
        state: 'Maharashtra',
        city: 'Mumbai',
        locality: 'Bandra West',
        addr: 'Pali Hill Lane, Bandra West',
        pin: '400050',
        amenities: ['Covered Parking', '24x7 Security', 'Lift', 'Gymnasium', 'Power Backup', 'Clubhouse'],
        desc: 'Sunlit corner 3 BHK apartment overlooking greenery in Pali Hill, Bandra West. Features Italian marble living flooring, modular kitchen, two covered stilt parking slots, and clear society OC.',
        rera: 'P51800041290',
        featured: 1,
        views: 342,
        imgs: ['/uploads/seed/prop-mumbai-apt.jpg', '/uploads/seed/prop-interior-gallery.jpg'],
      },
      {
        ownerId: rohitId,
        title: '4 BHK Contemporary Courtyard Villa in Whitefield',
        slug: '4-bhk-courtyard-villa-whitefield-bengaluru',
        purpose: 'buy',
        cat: 'residential',
        type: 'villa',
        price: 26500000,
        unit: 'total',
        deposit: 0,
        maint: 6500,
        sqft: 2950,
        bhk: 4,
        bath: 4,
        balc: 3,
        furnishing: 'semi_furnished',
        facing: 'East',
        floor: 0,
        totalFloors: 2,
        age: 1,
        poss: 'ready_to_move',
        state: 'Karnataka',
        city: 'Bengaluru',
        locality: 'Whitefield',
        addr: 'Palm Meadows Enclave, Whitefield',
        pin: '560066',
        amenities: ['Private Garden', 'Solar Water Heater', 'Clubhouse', 'Swimming Pool', 'EV Charging', 'CCTV'],
        desc: 'East-facing Vaastu compliant villa in gated community near ITPL & Metro. Private landscaped lawn, double-height dining court, maid room, and dual EV charging bay.',
        rera: 'PRM/KA/RERA/1251/446',
        featured: 1,
        views: 289,
        imgs: ['/uploads/seed/prop-bengaluru-villa.jpg', '/uploads/seed/prop-interior-gallery.jpg'],
      },
      {
        ownerId: proUserIds['rajesh.thekedar@zaidaat.in'],
        title: 'Newly Built 3 BHK Freehold Builder Floor in Saket',
        slug: '3-bhk-builder-floor-saket-new-delhi',
        purpose: 'buy',
        cat: 'residential',
        type: 'independent_house',
        price: 19500000,
        unit: 'total',
        deposit: 0,
        maint: 2500,
        sqft: 1850,
        bhk: 3,
        bath: 3,
        balc: 2,
        furnishing: 'fully_furnished',
        facing: 'North-East',
        floor: 2,
        totalFloors: 4,
        age: 0,
        poss: 'ready_to_move',
        state: 'Delhi',
        city: 'New Delhi',
        locality: 'Saket',
        addr: 'Block J, Saket',
        pin: '110017',
        amenities: ['Lift', 'Stilt Parking', 'Modular Kitchen', 'Video Door Phone', 'Park Facing'],
        desc: 'Brand-new freehold builder floor constructed with earthquake-resistant RCC frame, Jaguar bath fittings, Schindler lift, and 2-car stilt parking.',
        rera: '',
        featured: 1,
        views: 215,
        imgs: ['/uploads/seed/prop-delhi-house.jpg', '/uploads/seed/work-kitchen.jpg'],
      },
      {
        ownerId: ananyaId,
        title: '2 BHK Furnished Smart Flat for Rent in Baner',
        slug: '2-bhk-smart-flat-rent-baner-pune',
        purpose: 'rent',
        cat: 'residential',
        type: 'apartment',
        price: 34000,
        unit: 'monthly',
        deposit: 100000,
        maint: 3200,
        sqft: 1120,
        bhk: 2,
        bath: 2,
        balc: 2,
        furnishing: 'fully_furnished',
        facing: 'North',
        floor: 6,
        totalFloors: 12,
        age: 2,
        poss: 'ready_to_move',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Baner',
        addr: 'High Street Road, Baner',
        pin: '411045',
        amenities: ['AC in Bedrooms', 'Modular Kitchen', 'Gymnasium', 'Covered Parking', 'Power Backup', 'Fiber Ready'],
        desc: 'Ready-to-move furnished 2 BHK ideal for working professionals & families. Includes wardrobes, sofa, dining table, refrigerator, washing machine, and dedicated parking.',
        rera: '',
        featured: 1,
        views: 194,
        imgs: ['/uploads/seed/prop-pune-apt.jpg', '/uploads/seed/prop-interior-gallery.jpg'],
      },
      {
        ownerId: rohitId,
        title: '2400 Sq.Ft JDA Approved Corner Residential Plot in Vaishali Nagar',
        slug: 'jda-residential-plot-vaishali-nagar-jaipur',
        purpose: 'buy',
        cat: 'residential',
        type: 'plot',
        price: 11200000,
        unit: 'total',
        deposit: 0,
        maint: 0,
        sqft: 2400,
        bhk: 0,
        bath: 0,
        balc: 0,
        furnishing: 'unfurnished',
        facing: 'East',
        floor: 0,
        totalFloors: 0,
        age: 0,
        poss: 'ready_to_move',
        state: 'Rajasthan',
        city: 'Jaipur',
        locality: 'Vaishali Nagar',
        addr: 'Amrapali Marg Extension, Vaishali Nagar',
        pin: '302021',
        amenities: ['40ft Wide Road', 'Boundary Wall', 'Water Line Ready', 'Underground Electricity', 'Park Adjacent'],
        desc: 'Clear-title JDA patta corner residential plot ready for immediate house construction. Ideal dimensions 40x60 ft with 40 ft paved approach road.',
        rera: 'RAJ/P/2025/2911',
        featured: 0,
        views: 148,
        imgs: ['/uploads/seed/prop-jaipur-plot.jpg'],
      },
      {
        ownerId: priyaCustId,
        title: 'Main Road Commercial Showroom for Rent in Gachibowli',
        slug: 'commercial-showroom-rent-gachibowli-hyderabad',
        purpose: 'rent',
        cat: 'commercial',
        type: 'shop',
        price: 145000,
        unit: 'monthly',
        deposit: 600000,
        maint: 8000,
        sqft: 2100,
        bhk: 0,
        bath: 2,
        balc: 0,
        furnishing: 'semi_furnished',
        facing: 'South',
        floor: 0,
        totalFloors: 4,
        age: 2,
        poss: 'ready_to_move',
        state: 'Telangana',
        city: 'Hyderabad',
        locality: 'Gachibowli',
        addr: 'Financial District Main Road, Gachibowli',
        pin: '500032',
        amenities: ['Glass Frontage', 'Visitor Parking', '3-Phase Power', 'DG Backup', 'Washrooms'],
        desc: 'High-visibility ground floor commercial retail space with 36-foot wide glass facade, suitable for bank, clinic, architecture studio, or flagship retail.',
        rera: '',
        featured: 1,
        views: 176,
        imgs: ['/uploads/seed/prop-hyderabad-shop.jpg'],
      },
      {
        ownerId: priyaCustId,
        title: '3 BHK Waterfront Villa for Rent in Kakkanad, Kochi',
        slug: '3-bhk-waterfront-villa-rent-kakkanad-kochi',
        purpose: 'rent',
        cat: 'residential',
        type: 'villa',
        price: 42000,
        unit: 'monthly',
        deposit: 150000,
        maint: 2000,
        sqft: 2150,
        bhk: 3,
        bath: 3,
        balc: 2,
        furnishing: 'semi_furnished',
        facing: 'East',
        floor: 0,
        totalFloors: 2,
        age: 3,
        poss: 'ready_to_move',
        state: 'Kerala',
        city: 'Kochi',
        locality: 'Kakkanad',
        addr: 'Infopark Expressway, Kakkanad',
        pin: '682030',
        amenities: ['Gated Community', 'Solar Backup', 'Car Porch', 'Modular Kitchen', '24x7 Water'],
        desc: 'Peaceful independent villa 5 minutes from Infopark Kochi. Comes with coastal BWP modular kitchen, landscaped front yard, and two covered car bays.',
        rera: '',
        featured: 0,
        views: 112,
        imgs: ['/uploads/seed/prop-kochi-villa.jpg'],
      },
      {
        ownerId: proUserIds['farhan.civil@zaidaat.in'],
        title: 'Furnished Grade-A Corporate Office Suite on SG Highway',
        slug: 'grade-a-office-sg-highway-ahmedabad',
        purpose: 'buy',
        cat: 'commercial',
        type: 'office',
        price: 16800000,
        unit: 'total',
        deposit: 0,
        maint: 7500,
        sqft: 1950,
        bhk: 0,
        bath: 2,
        balc: 0,
        furnishing: 'fully_furnished',
        facing: 'North',
        floor: 8,
        totalFloors: 14,
        age: 1,
        poss: 'ready_to_move',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'SG Highway',
        addr: 'Mondeal Corporate Park, SG Highway',
        pin: '380054',
        amenities: ['24 Workstations', 'Conference Room', 'Central AC', 'High-Speed Elevators', '2 Car Parks'],
        desc: 'Turnkey corporate office suite with 24 modular workstations, 10-seater glass conference room, MD cabin, pantry, and reception.',
        rera: 'PR/GJ/AHMEDABAD/00912',
        featured: 0,
        views: 98,
        imgs: ['/uploads/seed/prop-ahmedabad-office.jpg'],
      },
      {
        ownerId: rohitId,
        title: '3 BHK Breezy Coastal Apartment for Rent in Adyar',
        slug: '3-bhk-apartment-rent-adyar-chennai',
        purpose: 'rent',
        cat: 'residential',
        type: 'apartment',
        price: 48000,
        unit: 'monthly',
        deposit: 200000,
        maint: 3500,
        sqft: 1620,
        bhk: 3,
        bath: 3,
        balc: 2,
        furnishing: 'semi_furnished',
        facing: 'East',
        floor: 4,
        totalFloors: 7,
        age: 4,
        poss: 'ready_to_move',
        state: 'Tamil Nadu',
        city: 'Chennai',
        locality: 'Adyar',
        addr: 'Gandhi Nagar 2nd Main Road, Adyar',
        pin: '600020',
        amenities: ['Lift', 'Covered Car Park', 'Power Backup', 'Rainwater Harvesting', 'Security'],
        desc: 'Spacious Vastu-compliant 3 BHK family home in quiet tree-lined lane of Adyar, close to top schools and Besant Nagar beach.',
        rera: '',
        featured: 0,
        views: 134,
        imgs: ['/uploads/seed/prop-chennai-apt.jpg'],
      },
    ];

    for (const pr of propSeeds) {
      const propId = Number(
        insertProp.run(
          pr.ownerId,
          pr.title,
          pr.slug,
          pr.purpose,
          pr.cat,
          pr.type,
          pr.price,
          pr.unit,
          pr.deposit,
          pr.maint,
          pr.sqft,
          pr.bhk,
          pr.bath,
          pr.balc,
          pr.furnishing,
          pr.facing,
          pr.floor,
          pr.totalFloors,
          pr.age,
          pr.poss,
          pr.state,
          pr.city,
          pr.locality,
          pr.addr,
          pr.pin,
          JSON.stringify(pr.amenities),
          pr.desc,
          pr.rera,
          pr.featured,
          pr.views
        ).lastInsertRowid
      );
      pr.imgs.forEach((imgUrl, idx) => {
        insertPropImg.run(propId, imgUrl, pr.title, idx === 0 ? 1 : 0, idx);
      });
    }

    // Saved property & Enquiry seed
    tx.prepare('INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)').run(ananyaId, 2);
    tx.prepare('INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)').run(rohitId, 1);

    tx.prepare(`
      INSERT INTO property_enquiries (property_id, buyer_id, owner_id, buyer_name, buyer_email, buyer_phone, message, preferred_visit_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run(
      1,
      rohitId,
      ananyaId,
      'Rohit Verma',
      'rohit.verma@zaidaat.in',
      '9845112244',
      'Interested in scheduling a weekend site visit for the Bandra West 3 BHK. Is society NOC ready?',
      '2026-11-18'
    );

    // 5. Work Marketplace: Job Posts, Applications, Quotations, Hiring Requests
    const insertJob = tx.prepare(`
      INSERT INTO job_posts (
        customer_id, category_id, title, description, state, city, locality,
        budget_min, budget_max, budget_type, preferred_start_date, property_type,
        reference_images_json, status, assigned_professional_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const catCarpenter = (getCatId.get('carpenters') as { id: number }).id;
    const catContractor = (getCatId.get('thekedars-contractors') as { id: number }).id;
    const catPainter = (getCatId.get('painters') as { id: number }).id;
    const catWaterproof = (getCatId.get('waterproofing-specialists') as { id: number }).id;
    const catKitchen = (getCatId.get('modular-kitchen-specialists') as { id: number }).id;
    const catElectrician = (getCatId.get('electricians') as { id: number }).id;

    const job1Id = Number(
      insertJob.run(
        ananyaId,
        catKitchen,
        'L-Shaped BWP Marine Ply Modular Kitchen & Tall Unit in Bandra 3 BHK',
        'Looking for an experienced modular kitchen & woodwork team for a 11x9 ft kitchen renovation in Bandra West. Need Hettich soft-close channels, quartz stone fitting, chimney ducting, and loft cabinets.',
        'Maharashtra',
        'Mumbai',
        'Bandra West',
        180000,
        280000,
        'fixed',
        '2026-11-22',
        '3 BHK Apartment',
        JSON.stringify(['/uploads/seed/work-kitchen.jpg']),
        'open',
        null
      ).lastInsertRowid
    );

    const job2Id = Number(
      insertJob.run(
        rohitId,
        catWaterproof,
        'Terrace Waterproofing & Heat Reflective Coating (1,600 sq.ft) — Whitefield',
        'Need thorough crack filling, brick-bat repair check, and 3-coat elastomeric PU terrace waterproofing with minimum 5-year service warranty before next monsoon.',
        'Karnataka',
        'Bengaluru',
        'Whitefield',
        65000,
        110000,
        'fixed',
        '2026-11-25',
        'Courtyard Villa',
        JSON.stringify(['/uploads/seed/prop-bengaluru-villa.jpg']),
        'open',
        null
      ).lastInsertRowid
    );

    const job3Id = Number(
      insertJob.run(
        priyaCustId,
        catPainter,
        'Complete Interior Painting & Wall Putty Touch-up for 3 BHK Villa',
        'Require Asian Paints Royale Luxury Emulsion for 2,150 sq.ft villa interiors plus exterior gate enamel touch-up.',
        'Kerala',
        'Kochi',
        'Kakkanad',
        55000,
        85000,
        'fixed',
        '2026-12-01',
        'Villa',
        JSON.stringify(['/uploads/seed/prop-kochi-villa.jpg']),
        'open',
        null
      ).lastInsertRowid
    );

    const job4Id = Number(
      insertJob.run(
        ananyaId,
        catContractor,
        'Full 3 BHK Interior Civil, False Ceiling & Wardrobe Renovation',
        'Active renovation project covering POP ceiling, electrical point shifting, bathroom tiling, and custom wardrobes.',
        'Maharashtra',
        'Mumbai',
        'Bandra West',
        650000,
        850000,
        'fixed',
        '2026-11-01',
        'Apartment',
        JSON.stringify(['/uploads/seed/prop-interior-gallery.jpg']),
        'in_progress',
        proProfileIds['vikram.carpenter@zaidaat.in']
      ).lastInsertRowid
    );

    // Job Applications + Quotations on Job 1
    tx.prepare(`
      INSERT INTO job_applications (job_id, professional_id, cover_note, proposed_timeline, estimated_start_date, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(
      job1Id,
      proProfileIds['vikram.carpenter@zaidaat.in'],
      'We have completed 25+ Bandra & Pali Hill modular kitchens using Century Club Prime BWP ply and Hettich InnoTech channels. Happy to visit for laser measurement tomorrow.',
      '18 working days',
      '2026-11-22'
    );

    tx.prepare(`
      INSERT INTO job_applications (job_id, professional_id, cover_note, proposed_timeline, estimated_start_date, status)
      VALUES (?, ?, ?, ?, ?, 'shortlisted')
    `).run(
      job1Id,
      proProfileIds['lakshmi.kitchen@zaidaat.in'],
      'Coastal BWP specialist team; can deliver factory-finished edge-banded shutters with 5-year hardware warranty.',
      '21 working days',
      '2026-11-24'
    );

    tx.prepare(`
      INSERT INTO quotations (
        job_id, professional_id, customer_id, title, scope_summary,
        line_items_json, labor_cost, material_cost, total_amount, validity_days, estimated_duration_days, payment_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?, ?, 'sent')
    `).run(
      job1Id,
      proProfileIds['vikram.carpenter@zaidaat.in'],
      ananyaId,
      'Quotation: Century BWP Marine Ply + Acrylic L-Shaped Kitchen',
      'Includes carcass fabrication, 1.5mm high-gloss acrylic shutters, Hettich tandem boxes, quartz counter cutout, and loft shutters.',
      JSON.stringify([
        { item: 'BWP Marine Ply Base & Wall Carcass (11x9 ft)', qty: '1 Lot', amount: 95000 },
        { item: 'Hettich Soft-Close Tandem & Corner Carousel', qty: '8 Units', amount: 46000 },
        { item: 'Quartz Stone Countertop & Dado Installation', qty: '45 Sq.Ft', amount: 52000 },
        { item: 'Carpentry Labour, Edge-Banding & Chimney Ducting', qty: '18 Days', amount: 42000 },
      ]),
      42000,
      193000,
      235000,
      18,
      '30% advance, 40% on carcass installation, 30% on handover'
    );

    tx.prepare(`
      INSERT INTO quotations (
        job_id, professional_id, customer_id, title, scope_summary,
        line_items_json, labor_cost, material_cost, total_amount, validity_days, estimated_duration_days, payment_terms, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?, ?, 'sent')
    `).run(
      job1Id,
      proProfileIds['lakshmi.kitchen@zaidaat.in'],
      ananyaId,
      'Quotation: Factory-Pressed Modular Kitchen with Blum Hardware',
      'Factory-finished PUR edge-banded modules with Blum Aventos lift-ups and SS304 sink unit.',
      JSON.stringify([
        { item: 'Factory Modular Carcass & Acrylic Shutters', qty: '1 Lot', amount: 118000 },
        { item: 'Blum Soft-Close Hardware & Pantry Pullout', qty: '1 Set', amount: 64000 },
        { item: 'Installation, Quartz Fitting & Plumbing Hookup', qty: '1 Lot', amount: 36000 },
      ]),
      36000,
      182000,
      218000,
      21,
      '40% booking, 40% dispatch, 20% completion'
    );

    // Hiring Request
    tx.prepare(`
      INSERT INTO hiring_requests (customer_id, professional_id, title, description, state, city, locality, budget, preferred_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      rohitId,
      proProfileIds['meera.architect@zaidaat.in'],
      'Courtyard Villa Extension & Pergola Design Consultation',
      'Looking to add a sunlit home-office studio above the existing car porch in Whitefield with matching elevation and BBMP approval drawings.',
      'Karnataka',
      'Bengaluru',
      'Whitefield',
      95000,
      '2026-11-28'
    );

    // 6. Project Hub (Active Project + Completed Project)
    const project1Id = Number(
      tx.prepare(`
        INSERT INTO projects (
          customer_id, property_id, job_id, title, description, project_type,
          state, city, locality, total_budget, spent_amount, progress_percent,
          start_date, target_end_date, status
        ) VALUES (?, ?, ?, ?, ?, 'renovation', 'Maharashtra', 'Mumbai', 'Bandra West', 850000, 420000, 58, '2026-10-20', '2026-12-15', 'active')
      `).run(
        ananyaId,
        1,
        job4Id,
        'Bandra 3 BHK Interior & Woodwork Modernization',
        'Complete bedroom wardrobes, living room veneer TV console, false ceiling lighting, and master kitchen upgrade.'
      ).lastInsertRowid
    );

    tx.prepare(`
      INSERT INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(project1Id, proProfileIds['vikram.carpenter@zaidaat.in'], 'Lead Woodwork & Carpentry', 420000);

    tx.prepare(`
      INSERT INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
      VALUES (?, ?, ?, ?, 'active')
    `).run(project1Id, proProfileIds['arjun.electrician@zaidaat.in'], 'Smart Lighting & Concealed Wiring', 145000);

    const insertUpdate = tx.prepare(`
      INSERT INTO project_updates (project_id, author_id, update_type, title, description, progress_percent, expense_amount, photos_json, milestone_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUpdate.run(
      project1Id,
      proUserIds['arjun.electrician@zaidaat.in'],
      'milestone',
      'Concealed Wiring & 8-Module Smart Switch Boxes Installed',
      'Completed chasing, Finolex FRLS wiring pull, and dual earthing check across all 3 bedrooms and living hall.',
      30,
      115000,
      JSON.stringify(['/uploads/seed/prop-interior-gallery.jpg']),
      'done'
    );

    insertUpdate.run(
      project1Id,
      proUserIds['vikram.carpenter@zaidaat.in'],
      'progress',
      'Master & Guest Bedroom Wardrobe Carcass Completed',
      '19mm Century BWP carcass erected and leveled. Fluted oak veneer lamination starts Monday.',
      58,
      305000,
      JSON.stringify(['/uploads/seed/work-kitchen.jpg']),
      'in_progress'
    );

    // Completed Project for Review demonstration
    const project2Id = Number(
      tx.prepare(`
        INSERT INTO projects (
          customer_id, title, description, project_type,
          state, city, locality, total_budget, spent_amount, progress_percent,
          start_date, target_end_date, status
        ) VALUES (?, 'Whitefield Villa External & Terrace Painting', 'Full exterior Apex Ultima weather-coat and compound wall texture finish.', 'repair', 'Karnataka', 'Bengaluru', 'Whitefield', 135000, 132000, 100, '2026-08-10', '2026-09-05', 'completed')
      `).run(rohitId).lastInsertRowid
    );

    tx.prepare(`
      INSERT INTO project_professionals (project_id, professional_id, role_in_project, agreed_amount, status)
      VALUES (?, ?, 'Lead Painting & Coating', 132000, 'completed')
    `).run(project2Id, proProfileIds['deepak.painter@zaidaat.in']);

    // Messages
    const insertMsg = tx.prepare(`
      INSERT INTO messages (thread_key, sender_id, recipient_id, context_type, context_id, body, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMsg.run(
      `project:${project1Id}`,
      proUserIds['vikram.carpenter@zaidaat.in'],
      ananyaId,
      'project',
      project1Id,
      'Namaste Ananya ji, veneer sheets for the master wardrobe arrived today. We will share photos once pressed tomorrow evening.',
      0
    );
    insertMsg.run(
      `project:${project1Id}`,
      ananyaId,
      proUserIds['vikram.carpenter@zaidaat.in'],
      'project',
      project1Id,
      'Great Vikram ji! Please ensure soft-close hinges are aligned on the loft shutters too.',
      1
    );

    // Reviews
    const insertReview = tx.prepare(`
      INSERT INTO reviews (reviewer_id, professional_id, project_id, rating, work_quality_rating, punctuality_rating, value_rating, title, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertReview.run(
      ananyaId,
      proProfileIds['vikram.carpenter@zaidaat.in'],
      project1Id,
      5,
      5,
      5,
      5,
      'Impeccable joinery & transparent material billing',
      'Vikram and his team finished the living console and wardrobe framing right on schedule with zero plywood wastage.'
    );
    insertReview.run(
      rohitId,
      proProfileIds['deepak.painter@zaidaat.in'],
      project2Id,
      5,
      5,
      4,
      5,
      'Clean mechanized finish with genuine Asian Paints stock',
      'Sealed hairline cracks properly before primer and cleaned up daily after work.'
    );
    insertReview.run(
      priyaCustId,
      proProfileIds['lakshmi.kitchen@zaidaat.in'],
      null,
      5,
      5,
      5,
      5,
      'Built to last for Kerala monsoon humidity',
      'Excellent BWP marine ply advice and spotless quartz installation.'
    );

    // Verification records (some verified, 1 pending for Admin testing!)
    const insertVer = tx.prepare(`
      INSERT INTO verification_records (user_id, professional_id, document_type, document_number_masked, status, admin_notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertVer.run(
      proUserIds['rajesh.thekedar@zaidaat.in'],
      proProfileIds['rajesh.thekedar@zaidaat.in'],
      'gst',
      '07AABCR****1Z5',
      'verified',
      'GST & trade registration verified'
    );
    insertVer.run(
      proUserIds['meera.architect@zaidaat.in'],
      proProfileIds['meera.architect@zaidaat.in'],
      'coa_license',
      'CA/2015/68***',
      'verified',
      'Council of Architecture active license verified'
    );
    insertVer.run(
      proUserIds['manoj.ac@zaidaat.in'],
      proProfileIds['manoj.ac@zaidaat.in'],
      'aadhaar_masked',
      'XXXX-XXXX-4821',
      'pending',
      null
    );

    // Notifications
    const insertNotif = tx.prepare(`
      INSERT INTO notifications (user_id, type, title, body, link_url, is_read)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    insertNotif.run(
      ananyaId,
      'quotation_received',
      '2 New Quotations Received',
      'Vikram Singh Woodworks and Lakshmi Modular Kitchens sent itemized quotes for your Bandra Modular Kitchen job.',
      `/jobs/${job1Id}`
    );
    insertNotif.run(
      ananyaId,
      'property_enquiry',
      'New Property Enquiry on Bandra 3 BHK',
      'Rohit Verma requested a weekend site visit for Sea-Breeze 3 BHK Luxury Apartment.',
      '/dashboard'
    );
    insertNotif.run(
      proUserIds['meera.architect@zaidaat.in'],
      'hiring_request',
      'New Hiring Request from Rohit Verma',
      'Courtyard Villa Extension & Pergola Design Consultation in Whitefield, Bengaluru.',
      '/dashboard'
    );

    // Subscriptions
    tx.prepare(`
      INSERT INTO subscriptions (user_id, plan_code, role_scope, status, price_inr, billing_cycle, features_json, expires_at)
      VALUES (?, 'pro_verified_plus', 'professional', 'active', 999, 'monthly', ?, datetime('now', '+30 days'))
    `).run(
      proUserIds['rajesh.thekedar@zaidaat.in'],
      JSON.stringify(['Verified Shield Badge', 'Unlimited Job Quotes', 'Priority Search Ranking', 'Portfolio Showcase'])
    );

    // Sample Complaint/Report for Admin queue
    tx.prepare(`
      INSERT INTO complaints_reports (reporter_id, target_type, target_id, reason, details, status)
      VALUES (?, 'property', 5, 'Duplicate / Boundary Verification Check', 'Requesting admin check on corner dimension photos for the Vaishali Nagar plot listing.', 'open')
    `).run(ananyaId);
  });

  console.log('[seed] Seeded ZAIDAAT All-India database successfully.');
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase();

if (isDirectRun) {
  seedDatabase();
  closeDb();
}
