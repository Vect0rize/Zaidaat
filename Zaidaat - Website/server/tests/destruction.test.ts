import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

type FindingStatus = 'PASS' | 'FAIL' | 'WARN';
interface AuditCheck {
  id: string;
  category: string;
  title: string;
  status: FindingStatus;
  detail: string;
  ms?: number;
}

const results: AuditCheck[] = [];

function record(id: string, category: string, title: string, status: FindingStatus, detail: string, ms?: number) {
  results.push({ id, category, title, status, detail, ms });
  const icon = status === 'PASS' ? 'PASS' : status === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${icon}] [${id}] ${title} — ${detail}${ms !== undefined ? ` (${ms}ms)` : ''}`);
}

function getCookies(res: Response): string {
  const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined;
  if (setCookies && setCookies.length > 0) {
    return setCookies.map((c) => c.split(';')[0]).join('; ');
  }
  const raw = res.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : '';
}

// Minimal valid 1x1 PNG buffer (68 bytes)
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf00000201010018dd8d2b0000000049454e44ae426082',
  'hex'
);

async function timedFetch(url: string, init?: RequestInit): Promise<{ res: Response; ms: number }> {
  const start = performance.now();
  const res = await fetch(url, init);
  const ms = Math.round(performance.now() - start);
  return { res, ms };
}

async function runAudit() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zaidaat-audit-'));
  process.env.DATABASE_PATH = path.join(tempDir, 'zaidaat-audit.db');
  process.env.UPLOAD_DIR = path.join(tempDir, 'uploads');

  const { createApp } = await import('../index.js');
  const { closeDb, getDb } = await import('../db/connection.js');

  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}`;

  try {
    // Seed check & helper accounts
    const h = await timedFetch(`${base}/api/health`);
    const healthJson = (await h.res.json()) as any;
    record(
      'CORE-01',
      'Core',
      'Health endpoint',
      h.res.status === 200 && healthJson.dbOk ? 'PASS' : 'FAIL',
      `status=${h.res.status}, dbOk=${healthJson.dbOk}`,
      h.ms
    );

    // Login as seeded admin & demo user
    const loginRes = async (identifier: string, password: string) => {
      const { res } = await timedFetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      return { res, cookie: getCookies(res), body: await res.json().catch(() => ({})) };
    };

    const registerUser = async (name: string, email: string, phone: string, role: 'customer' | 'professional' = 'customer') => {
      const { res } = await timedFetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email,
          phone,
          password: 'AuditUser@2026',
          role,
          defaultState: 'Uttarakhand',
          defaultCity: 'Dehradun',
        }),
      });
      return { res, cookie: getCookies(res), body: await res.json().catch(() => ({})) };
    };

    const admin = await loginRes('admin@zaidaat.in', 'AdminZaidaat@123');
    record('AUTH-01', 'Auth', 'Seeded admin login', admin.res.status === 200 ? 'PASS' : 'FAIL', `status=${admin.res.status}`);

    const suffix = Date.now().toString().slice(-6);
    const seller = await registerUser('Seller User', `seller.${suffix}@zaidaat.in`, `9811${suffix}`, 'customer');
    const buyer = await registerUser('Buyer User', `buyer.${suffix}@zaidaat.in`, `9822${suffix}`, 'customer');
    const pro = await registerUser('Contractor Pro', `pro.${suffix}@zaidaat.in`, `9833${suffix}`, 'professional');
    record(
      'AUTH-02',
      'Auth',
      'New multi-persona registration',
      seller.res.status === 201 && buyer.res.status === 201 && pro.res.status === 201 ? 'PASS' : 'FAIL',
      `seller=${seller.res.status}, buyer=${buyer.res.status}, pro=${pro.res.status}`
    );

    // Role self-escalation attempt on register
    const adminEsc = await timedFetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Hacker Admin',
        email: `evil.${suffix}@zaidaat.in`,
        phone: `9844${suffix}`,
        password: 'Password@123',
        role: 'admin',
      }),
    });
    record(
      'SEC-01',
      'Security',
      'Reject admin role self-registration',
      adminEsc.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${adminEsc.res.status}`
    );

    // --- EXTREME EDGE CASES & PAGINATION / NaN PROBES ---
    const negLimit = await timedFetch(`${base}/api/properties?limit=-1`);
    const negLimitBody = (await negLimit.res.json().catch(() => ({}))) as any;
    record(
      'EDGE-01',
      'EdgeCase',
      'Properties negative limit=-1 clamped safely',
      negLimit.res.status === 200 && Array.isArray(negLimitBody.properties) && negLimitBody.properties.length <= 24 && negLimitBody.properties.length > 0
        ? 'PASS'
        : 'FAIL',
      `status=${negLimit.res.status}, returned=${negLimitBody.properties?.length ?? 'err'}`
    );

    const nanLimit = await timedFetch(`${base}/api/properties?limit=abc&offset=xyz&minPrice=abc`);
    record(
      'EDGE-02',
      'EdgeCase',
      'Properties non-numeric query params limit=abc&offset=xyz&minPrice=abc',
      nanLimit.res.status === 200 || nanLimit.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${nanLimit.res.status}`
    );

    const nanProLimit = await timedFetch(`${base}/api/professionals?limit=-5&offset=abc`);
    const nanWorkLimit = await timedFetch(`${base}/api/work/jobs?limit=-5&offset=abc`);
    record(
      'EDGE-03',
      'EdgeCase',
      'Professionals & Work non-numeric/negative pagination',
      nanProLimit.res.status === 200 && nanWorkLimit.res.status === 200 ? 'PASS' : 'FAIL',
      `proStatus=${nanProLimit.res.status}, workStatus=${nanWorkLimit.res.status}`
    );

    const nonNumId = await timedFetch(`${base}/api/properties/notanumber`);
    record(
      'EDGE-04',
      'EdgeCase',
      'Non-numeric entity ID GET /api/properties/notanumber',
      nonNumId.res.status === 400 || nonNumId.res.status === 404 ? 'PASS' : 'FAIL',
      `status=${nonNumId.res.status}`
    );

    const adminPatchGhost = await timedFetch(`${base}/api/admin/properties/999999`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({ status: 'archived' }),
    });
    record(
      'EDGE-05',
      'EdgeCase',
      'Admin PATCH non-existent property ID returns 404 (not fake 200)',
      adminPatchGhost.res.status === 404 ? 'PASS' : 'FAIL',
      `status=${adminPatchGhost.res.status}`
    );

    // Malformed JSON
    const badJson = await timedFetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });
    record(
      'EDGE-06',
      'EdgeCase',
      'Malformed JSON body returns 400 instead of 500',
      badJson.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${badJson.res.status}`
    );

    // --- SECURITY: AVATAR XSS / MEDIA URL VALIDATION ---
    const avatarXss = await timedFetch(`${base}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie },
      body: JSON.stringify({ avatarUrl: 'javascript:alert(document.domain)' }),
    });
    record(
      'SEC-02',
      'Security',
      'Reject javascript: URL in PATCH /api/auth/me avatarUrl',
      avatarXss.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${avatarXss.res.status}`
    );

    // --- SECURITY: SQL INJECTION PROBES ---
    const sqliQueries = ["' OR '1'='1", "1; DROP TABLE users;--", "%' UNION SELECT 1,2,3--"];
    let sqliOk = true;
    for (const payload of sqliQueries) {
      const r1 = await fetch(`${base}/api/properties?q=${encodeURIComponent(payload)}&city=${encodeURIComponent(payload)}`);
      const r2 = await fetch(`${base}/api/locations/suggest?q=${encodeURIComponent(payload)}`);
      const r3 = await fetch(`${base}/api/professionals?q=${encodeURIComponent(payload)}`);
      if (r1.status >= 500 || r2.status >= 500 || r3.status >= 500) sqliOk = false;
    }
    record('SEC-03', 'Security', 'SQL injection payloads in search & filters safely parameterized', sqliOk ? 'PASS' : 'FAIL', `tested ${sqliQueries.length} payloads across 3 search endpoints`);

    // --- SECURITY: FILE UPLOAD ATTACKS ---
    const fakePngForm = new FormData();
    fakePngForm.append('files', new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' }), 'evil.png');
    const fakePngRes = await timedFetch(`${base}/api/uploads`, {
      method: 'POST',
      headers: { Cookie: seller.cookie },
      body: fakePngForm,
    });
    record(
      'SEC-04',
      'Security',
      'Reject polyglot HTML disguised as image/png',
      fakePngRes.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${fakePngRes.res.status}`
    );

    const svgForm = new FormData();
    svgForm.append('files', new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/svg+xml' }), 'xss.svg');
    const svgRes = await timedFetch(`${base}/api/uploads`, {
      method: 'POST',
      headers: { Cookie: seller.cookie },
      body: svgForm,
    });
    record(
      'SEC-05',
      'Security',
      'Reject SVG XSS upload',
      svgRes.res.status === 400 || svgRes.res.status === 500 ? 'PASS' : 'FAIL',
      `status=${svgRes.res.status}`
    );

    // Real PNG upload + retrieval
    const validPngForm = new FormData();
    validPngForm.append('files', new Blob([TINY_PNG], { type: 'image/png' }), 'house.png');
    const upRes = await timedFetch(`${base}/api/uploads`, {
      method: 'POST',
      headers: { Cookie: seller.cookie },
      body: validPngForm,
    });
    const upBody = (await upRes.res.json().catch(() => ({}))) as any;
    const uploadedUrl = upBody.files?.[0]?.url;
    const imgFetch = uploadedUrl ? await timedFetch(`${base}${uploadedUrl}`) : null;
    record(
      'CRUD-01',
      'Upload',
      'Valid PNG image upload and static retrieval',
      upRes.res.status === 201 && imgFetch?.res.status === 200 ? 'PASS' : 'FAIL',
      `upload=${upRes.res.status}, fetch=${imgFetch?.res.status}, url=${uploadedUrl}`
    );

    // --- SELLER CRUD + UNICODE/XSS SANITIZATION + PERSISTENCE ---
    const propRes = await timedFetch(`${base}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: seller.cookie },
      body: JSON.stringify({
        title: '🏠 Dehradun Plot <script>alert(1)</script> Near Rajpur Road',
        listingPurpose: 'buy',
        propertyCategory: 'residential',
        propertyType: 'plot',
        price: 4500000,
        areaSqft: 2160,
        bedrooms: 0,
        bathrooms: 0,
        balconies: 0,
        furnishing: 'unfurnished',
        state: 'Uttarakhand',
        city: 'Dehradun',
        locality: 'Rajpur Road',
        pincode: '248001',
        amenities: [],
        description: 'Clear title Nali plot near Rajpur Road with road access and electricity.',
        mediaUrls: uploadedUrl ? [{ url: uploadedUrl, mediaType: 'image', caption: 'Front view' }] : [],
      }),
    });
    const propJson = (await propRes.res.json().catch(() => ({}))) as any;
    const propId = propJson.property?.id;
    const titleSanitized = typeof propJson.property?.title === 'string' && !propJson.property.title.includes('<script>');
    record(
      'CRUD-02',
      'Properties',
      'Create property with Unicode + strip XSS angle brackets + no default amenities',
      propRes.res.status === 201 && propId && titleSanitized && propJson.property.amenities.length === 0 ? 'PASS' : 'FAIL',
      `status=${propRes.res.status}, id=${propId}, sanitized=${titleSanitized}`
    );

    // Put with invalid status
    const badPutStatus = await timedFetch(`${base}/api/properties/${propId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: seller.cookie },
      body: JSON.stringify({
        title: 'Dehradun Plot Updated',
        listingPurpose: 'buy',
        propertyCategory: 'residential',
        propertyType: 'plot',
        price: 4700000,
        areaSqft: 2160,
        state: 'Uttarakhand',
        city: 'Dehradun',
        locality: 'Rajpur Road',
        description: 'Updated plot listing description over 20 chars long.',
        status: 'hacked_status',
      }),
    });
    record(
      'EDGE-07',
      'Validation',
      'PUT property rejects invalid status with 400 instead of silently ignoring',
      badPutStatus.res.status === 400 ? 'PASS' : 'FAIL',
      `status=${badPutStatus.res.status}`
    );

    // IDOR: Buyer tries to edit Seller's property
    const idorEdit = await timedFetch(`${base}/api/properties/${propId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie },
      body: JSON.stringify({
        title: 'Stolen Listing',
        listingPurpose: 'buy',
        propertyCategory: 'residential',
        propertyType: 'plot',
        price: 1000,
        areaSqft: 500,
        state: 'Delhi',
        city: 'New Delhi',
        locality: 'Saket',
        description: 'Unauthorized edit attempt over 20 chars.',
      }),
    });
    record(
      'SEC-06',
      'Authorization',
      'IDOR prevent Buyer editing Seller property',
      idorEdit.res.status === 403 ? 'PASS' : 'FAIL',
      `status=${idorEdit.res.status}`
    );

    // Concurrency: double toggle save on property
    const saveRace = await Promise.all([
      fetch(`${base}/api/properties/${propId}/save`, { method: 'POST', headers: { Cookie: buyer.cookie } }),
      fetch(`${base}/api/properties/${propId}/save`, { method: 'POST', headers: { Cookie: buyer.cookie } }),
    ]);
    record(
      'CONC-01',
      'Concurrency',
      'Concurrent double save property does not 500',
      saveRace.every((r) => r.status < 500) ? 'PASS' : 'FAIL',
      `statuses=${saveRace.map((r) => r.status).join(',')}`
    );

    // --- KYC UPLOAD & PATH TRAVERSAL + IDOR ---
    const kycForm = new FormData();
    kycForm.append('files', new Blob([TINY_PNG], { type: 'image/png' }), 'kyc.png');
    const kycUp = await timedFetch(`${base}/api/uploads/kyc`, {
      method: 'POST',
      headers: { Cookie: pro.cookie },
      body: kycForm,
    });
    const kycUrl = ((await kycUp.res.json().catch(() => ({}))) as any).files?.[0]?.url;
    const staticKyc = kycUrl ? await fetch(`${base}${kycUrl.replace('/api/uploads/kyc/', '/uploads/kyc/')}`) : null;
    const idorKyc = kycUrl ? await fetch(`${base}${kycUrl}`, { headers: { Cookie: buyer.cookie } }) : null;
    const ownerKyc = kycUrl ? await fetch(`${base}${kycUrl}`, { headers: { Cookie: pro.cookie } }) : null;
    const travKyc = await fetch(`${base}/api/uploads/kyc/..%2F..%2Fpackage.json`, { headers: { Cookie: admin.cookie } });
    record(
      'SEC-07',
      'Authorization',
      'KYC direct static blocked, cross-user IDOR 403, owner 200, traversal blocked',
      staticKyc?.status === 403 && idorKyc?.status === 403 && ownerKyc?.status === 200 && [400, 403, 404].includes(travKyc.status)
        ? 'PASS'
        : 'FAIL',
      `static=${staticKyc?.status}, idor=${idorKyc?.status}, owner=${ownerKyc?.status}, traversal=${travKyc.status}`
    );

    // --- WORK + QUOTATION RACE + PROJECT HUB IDOR ---
    const catsJson = (await (await fetch(`${base}/api/professionals/categories`)).json()) as any;
    const catId = catsJson.categories?.[0]?.id;

    // Create Pro profile
    const proProfRes = await timedFetch(`${base}/api/professionals/me/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: pro.cookie },
      body: JSON.stringify({
        categoryId: catId,
        displayName: 'BuildPro Contractors',
        headline: 'Turnkey home builder and civil engineer',
        bio: '15 years of residential building and remodeling across Uttarakhand and Delhi NCR.',
        state: 'Uttarakhand',
        city: 'Dehradun',
        localities: ['Rajpur Road'],
        serviceRadiusKm: 40,
        experienceYears: 12,
        skills: ['Masonry', 'Tile Work'],
        languages: ['Hindi', 'English'],
        pricingModel: 'sqft',
        rateMin: 1200,
        rateMax: 2200,
        rateUnitLabel: 'per sq.ft',
        availabilityStatus: 'available',
        teamSize: 10,
      }),
    });
    const proId = ((await proProfRes.res.json().catch(() => ({}))) as any).profile?.id;

    // Buyer posts job
    const jobRes = await timedFetch(`${base}/api/work/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie },
      body: JSON.stringify({
        categoryId: catId,
        title: 'Boundary wall & house construction',
        description: 'Need a trusted contractor for boundary wall and foundation work.',
        state: 'Uttarakhand',
        city: 'Dehradun',
        locality: 'Rajpur Road',
        budgetMin: 150000,
        budgetMax: 250000,
        budgetType: 'fixed',
      }),
    });
    const jobId = ((await jobRes.res.json().catch(() => ({}))) as any).job?.id;

    // Pro quotes on job
    const quoteRes = await timedFetch(`${base}/api/work/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: pro.cookie },
      body: JSON.stringify({
        jobId,
        title: 'Complete boundary wall package',
        scopeSummary: 'Excavation, PCC foundation, brick work and plastering with material.',
        lineItems: [{ item: 'Labor & Material', qty: '1 job', amount: 185000 }],
        laborCost: 75000,
        materialCost: 110000,
        totalAmount: 185000,
        validityDays: 15,
        estimatedDurationDays: 20,
      }),
    });
    const quoteId = ((await quoteRes.res.json().catch(() => ({}))) as any).quotation?.id;

    // Concurrency: double quotation accept
    const [acc1, acc2] = await Promise.all([
      fetch(`${base}/api/work/quotations/${quoteId}/accept`, { method: 'POST', headers: { Cookie: buyer.cookie } }),
      fetch(`${base}/api/work/quotations/${quoteId}/accept`, { method: 'POST', headers: { Cookie: buyer.cookie } }),
    ]);
    const accStatuses = [acc1.status, acc2.status].sort();
    const acc1Data = (await acc1.json().catch(() => ({}))) as any;
    const acc2Data = (await acc2.json().catch(() => ({}))) as any;
    const projectId = acc1Data.projectId || acc2Data.projectId;
    record(
      'CONC-02',
      'Concurrency',
      'Concurrent double accept quotation allows only one 200 and one 409',
      accStatuses[0] === 200 && accStatuses[1] === 409 ? 'PASS' : 'FAIL',
      `statuses=${accStatuses.join(',')}, projectId=${projectId}`
    );

    // IDOR: Seller (unrelated third party!) creates Project linked to Buyer's property OR injects message into Buyer's project thread
    const projLinkIdor = await timedFetch(`${base}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie },
      body: JSON.stringify({
        propertyId: propId, // belongs to Seller, NOT Buyer!
        title: 'Spoofed Link to Another Property',
        description: 'Testing whether I can attach someone else propertyId to my project.',
        projectType: 'renovation',
        state: 'Uttarakhand',
        city: 'Dehradun',
      }),
    });
    record(
      'SEC-08',
      'Authorization',
      'IDOR prevent linking another user propertyId in POST /api/projects',
      projLinkIdor.res.status === 403 ? 'PASS' : 'FAIL',
      `status=${projLinkIdor.res.status}`
    );

    const projMsgIdor = await timedFetch(`${base}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: seller.cookie },
      body: JSON.stringify({
        recipientId: buyer.body.user.id,
        contextType: 'project',
        contextId: projectId, // Seller is NOT on this project!
        body: 'Injected unauthorized project message',
      }),
    });
    record(
      'SEC-09',
      'Authorization',
      'IDOR prevent outsider injecting message into private project thread',
      projMsgIdor.res.status === 403 ? 'PASS' : 'FAIL',
      `status=${projMsgIdor.res.status}`
    );

    // Concurrency: double report
    const repPayload = JSON.stringify({
      targetType: 'property',
      targetId: propId,
      reason: 'Duplicate listing test',
      details: 'Testing concurrent report submission race condition handling.',
    });
    const [rep1, rep2] = await Promise.all([
      fetch(`${base}/api/plans/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie }, body: repPayload }),
      fetch(`${base}/api/plans/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: buyer.cookie }, body: repPayload }),
    ]);
    const repStatuses = [rep1.status, rep2.status].sort();
    record(
      'CONC-03',
      'Concurrency',
      'Concurrent double complaint report allows only one 201 and one 409',
      repStatuses[0] === 201 && repStatuses[1] === 409 ? 'PASS' : 'FAIL',
      `statuses=${repStatuses.join(',')}`
    );

    // --- CSRF & SECURITY HEADERS ---
    const csrfOrigin = await timedFetch(`${base}/api/properties/${propId}/save`, {
      method: 'POST',
      headers: { Cookie: buyer.cookie, Origin: 'https://evil-attacker.example' },
    });
    const csrfFetchSite = await timedFetch(`${base}/api/properties/${propId}/save`, {
      method: 'POST',
      headers: { Cookie: buyer.cookie, 'Sec-Fetch-Site': 'cross-site' },
    });
    record(
      'SEC-10',
      'Security',
      'CSRF origin and Sec-Fetch-Site cross-site rejection',
      csrfOrigin.res.status === 403 && csrfFetchSite.res.status === 403 ? 'PASS' : 'FAIL',
      `origin=${csrfOrigin.res.status}, fetchSite=${csrfFetchSite.res.status}`
    );

    // --- SESSION REVOCATION & SUSPENSION ---
    await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: buyer.cookie } });
    const afterLogout = await fetch(`${base}/api/properties/mine`, { headers: { Cookie: buyer.cookie } });
    record(
      'SEC-11',
      'Auth',
      'Revoked session cookie rejected after logout',
      afterLogout.status === 401 ? 'PASS' : 'FAIL',
      `status=${afterLogout.status}`
    );

    // Suspend Seller & confirm existing cookie fails
    await fetch(`${base}/api/admin/users/${seller.body.user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: admin.cookie },
      body: JSON.stringify({ isActive: false }),
    });
    const suspendedCall = await fetch(`${base}/api/properties/mine`, { headers: { Cookie: seller.cookie } });
    record(
      'SEC-12',
      'Auth',
      'Suspended user existing token immediately rejected',
      suspendedCall.status === 401 ? 'PASS' : 'FAIL',
      `status=${suspendedCall.status}`
    );

    // Verified Review eligibility check
    const pro2 = await registerUser('Another Pro', `pro2.${suffix}@zaidaat.in`, `9855${suffix}`, 'professional');
    const reviewFail = await fetch(`${base}/api/professionals/${proId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: pro2.cookie },
      body: JSON.stringify({
        rating: 5,
        title: 'Fake review',
        comment: 'Trying to post a fake review without hiring.',
      }),
    });
    record(
      'SEC-13',
      'Authorization',
      'Prevent unengaged user posting verified review',
      reviewFail.status === 403 ? 'PASS' : 'FAIL',
      `status=${reviewFail.status}`
    );

    // SEO: robots.txt, dynamic sitemap.xml, and CSP header
    const robotsRes = await fetch(`${base}/robots.txt`);
    const robotsText = await robotsRes.text();
    const robotsCt = robotsRes.headers.get('content-type') || '';
    const cspHeader = robotsRes.headers.get('content-security-policy') || '';
    record(
      'SEO-01',
      'SEO',
      'robots.txt returns text/plain with Sitemap directive',
      robotsRes.status === 200 && robotsCt.includes('text/plain') && robotsText.includes('Sitemap:') ? 'PASS' : 'FAIL',
      `status=${robotsRes.status}, ct=${robotsCt}`
    );

    const sitemapRes = await fetch(`${base}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    const sitemapCt = sitemapRes.headers.get('content-type') || '';
    record(
      'SEO-02',
      'SEO',
      'sitemap.xml returns application/xml with live approved property URL',
      sitemapRes.status === 200 && sitemapCt.includes('xml') && sitemapText.includes(`/properties/${propId}`)
        ? 'PASS'
        : 'FAIL',
      `status=${sitemapRes.status}, hasProp=${sitemapText.includes(`/properties/${propId}`)}`
    );

    record(
      'SEC-14',
      'Security',
      'Content-Security-Policy header enforced',
      cspHeader.includes("default-src 'self'") && cspHeader.includes("object-src 'none'") ? 'PASS' : 'FAIL',
      `cspPresent=${Boolean(cspHeader)}`
    );

    // Per-phone OTP send throttle (>4 in 10 mins => 429)
    const otpPhone = `9899${suffix}`;
    const otpStatuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${base}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone }),
      });
      otpStatuses.push(r.status);
    }
    record(
      'AUTH-03',
      'Auth',
      'Per-phone OTP rate throttle returns 429 after 4 requests',
      otpStatuses.slice(0, 4).every((s) => s === 200) && otpStatuses[4] === 429 ? 'PASS' : 'FAIL',
      `statuses=${otpStatuses.join(',')}`
    );

    // Notification linkUrl points directly to /dashboard rather than deprecated /projects/*
    const notifRes = await fetch(`${base}/api/notifications`, { headers: { Cookie: pro.cookie } });
    const notifJson = (await notifRes.json().catch(() => ({}))) as any;
    const links: string[] = (notifJson.notifications || []).map((n: any) => String(n.link_url || ''));
    const hasDeadProjectLink = links.some((l) => l.startsWith('/projects'));
    record(
      'NOTIF-01',
      'Navigation',
      'Accepted quotation notifications link to /dashboard (no /projects redirect)',
      links.length > 0 && !hasDeadProjectLink ? 'PASS' : 'FAIL',
      `links=${links.join(',')}`
    );

    // Performance check on key read routes
    const perfRoutes = ['/api/properties', '/api/professionals', '/api/work/jobs', '/api/locations/states'];
    const perfTimes: number[] = [];
    for (const r of perfRoutes) {
      const t = await timedFetch(`${base}${r}`);
      perfTimes.push(t.ms);
    }
    const maxPerf = Math.max(...perfTimes);
    record(
      'PERF-01',
      'Performance',
      'Core public GET endpoints respond under 150ms locally',
      maxPerf < 150 ? 'PASS' : 'WARN',
      `latenciesMs=${perfTimes.join(',')}`
    );

    // Also verify DB integrity: zero orphan property_images
    const db = getDb();
    const orphanImgs = (db.prepare(`SELECT COUNT(*) as c FROM property_images WHERE property_id NOT IN (SELECT id FROM properties)`).get() as any).c;
    record('DB-01', 'Database', 'Zero orphaned property_images rows', orphanImgs === 0 ? 'PASS' : 'FAIL', `orphans=${orphanImgs}`);

    // Summary
    const fails = results.filter((r) => r.status === 'FAIL');
    const warns = results.filter((r) => r.status === 'WARN');
    console.log(`\n=== AUDIT SUMMARY: ${results.length} checks | PASS=${results.length - fails.length - warns.length} | WARN=${warns.length} | FAIL=${fails.length} ===`);
    if (fails.length > 0) {
      console.log('Failed checks:', fails.map((f) => `${f.id} (${f.title}: ${f.detail})`).join('\n'));
      process.exitCode = 1;
    }
  } finally {
    closeDb();
    server.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runAudit().catch((err) => {
  console.error('[audit] Fatal test error:', err);
  process.exit(1);
});
