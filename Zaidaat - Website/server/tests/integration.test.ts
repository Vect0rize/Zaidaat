import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

function getCookies(res: Response): string {
  const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined;
  if (setCookies && setCookies.length > 0) {
    return setCookies.map((c) => c.split(';')[0]).join('; ');
  }
  const raw = res.headers.get('set-cookie');
  return raw ? raw.split(';')[0] : '';
}

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zaidaat-test-'));
  process.env.DATABASE_PATH = path.join(tempDir, 'zaidaat-test.db');
  process.env.UPLOAD_DIR = path.join(tempDir, 'uploads');

  const { createApp } = await import('../index.js');
  const { closeDb } = await import('../db/connection.js');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    console.log(`[test] Running ZAIDAAT API integration tests against ${baseUrl}...`);

    // 1. Health & Locations & Public Listings
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as any;
    assert.equal(health.dbOk, true);

    const statesRes = await fetch(`${baseUrl}/api/locations/states`);
    const statesData = (await statesRes.json()) as any;
    assert.ok(statesData.states.length >= 28, 'Should cover all Indian states and UTs');

    const propsRes = await fetch(`${baseUrl}/api/properties?purpose=buy`);
    const propsData = (await propsRes.json()) as any;
    assert.ok(propsData.properties.length > 0);
    // Security check: public listing MUST NOT expose ownerPhone / ownerEmail
    assert.equal(propsData.properties[0].ownerPhone, undefined);
    assert.equal(propsData.properties[0].ownerEmail, undefined);

    const catsRes = await fetch(`${baseUrl}/api/professionals/categories`);
    const catsData = (await catsRes.json()) as any;
    assert.ok(catsData.categories.length >= 19, 'Should have 19+ professional categories');

    // 2. Register new customer + Auth cookie + Forgot/Reset password + OTP
    const uniqueSuffix = Date.now().toString().slice(-6);
    const regPhone = `9899${uniqueSuffix}`;
    const regEmail = `testbuyer.${uniqueSuffix}@zaidaat.in`;

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Buyer',
        email: regEmail,
        phone: regPhone,
        password: 'TestUser@123',
        role: 'customer',
        defaultState: 'Maharashtra',
        defaultCity: 'Pune',
      }),
    });
    assert.equal(regRes.status, 201);
    let buyerCookie = getCookies(regRes);
    assert.ok(buyerCookie.includes('zaidaat_token='));

    // Security check: customer cannot access admin analytics
    const forbiddenAdmin = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Cookie: buyerCookie },
    });
    assert.equal(forbiddenAdmin.status, 403);

    // 3. Property CRUD + Ownership Enforcement
    const createPropRes = await fetch(`${baseUrl}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        title: 'Test 2 BHK Flat in Kothrud Pune',
        listingPurpose: 'buy',
        propertyCategory: 'residential',
        propertyType: 'apartment',
        price: 7500000,
        areaSqft: 1050,
        bedrooms: 2,
        bathrooms: 2,
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Kothrud',
        description: 'Well-ventilated apartment near Paud Road metro station with parking.',
      }),
    });
    assert.equal(createPropRes.status, 201);
    const createdProp = ((await createPropRes.json()) as any).property;

    // Save toggle
    const saveRes = await fetch(`${baseUrl}/api/properties/${createdProp.id}/save`, {
      method: 'POST',
      headers: { Cookie: buyerCookie },
    });
    assert.equal(((await saveRes.json()) as any).saved, true);

    // Edit own property
    const editPropRes = await fetch(`${baseUrl}/api/properties/${createdProp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        title: 'Updated 2 BHK Flat in Kothrud Pune',
        listingPurpose: 'buy',
        propertyCategory: 'residential',
        propertyType: 'apartment',
        price: 7700000,
        areaSqft: 1050,
        bedrooms: 2,
        bathrooms: 2,
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Kothrud',
        description: 'Updated description with metro proximity and covered parking.',
      }),
    });
    assert.equal(editPropRes.status, 200);

    // Register Professional user and verify they CANNOT delete buyer's property
    const proEmail = `testpro.${uniqueSuffix}@zaidaat.in`;
    const proRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Contractor',
        email: proEmail,
        phone: `9788${uniqueSuffix}`,
        password: 'TestPro@123',
        role: 'professional',
      }),
    });
    assert.equal(proRegRes.status, 201);
    const proCookie = getCookies(proRegRes);

    const unauthorizedDel = await fetch(`${baseUrl}/api/properties/${createdProp.id}`, {
      method: 'DELETE',
      headers: { Cookie: proCookie },
    });
    assert.equal(unauthorizedDel.status, 403);

    // Buyer deletes own property
    const ownerDel = await fetch(`${baseUrl}/api/properties/${createdProp.id}`, {
      method: 'DELETE',
      headers: { Cookie: buyerCookie },
    });
    assert.equal(ownerDel.status, 200);

    // 4. Professional Profile -> Job Post -> Apply -> Quotation -> Accept -> Project Hub -> Update -> Message -> Review
    const proProfileRes = await fetch(`${baseUrl}/api/professionals/me/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({
        categoryId: catsData.categories[0].id,
        displayName: 'Test Woodcraft Studio',
        headline: 'Custom Carpentry & Modular Wardrobes Specialist',
        bio: 'Experienced woodworking crew serving Pune residential societies with transparent estimates.',
        state: 'Maharashtra',
        city: 'Pune',
        localities: ['Kothrud', 'Baner'],
        serviceRadiusKm: 25,
        experienceYears: 7,
        skills: ['Wardrobes', 'Doors'],
        languages: ['Marathi', 'Hindi'],
        pricingModel: 'daily',
        rateMin: 900,
        rateMax: 1400,
        rateUnitLabel: 'per day',
        availabilityStatus: 'available',
      }),
    });
    assert.equal(proProfileRes.status, 200);
    const proProfile = ((await proProfileRes.json()) as any).profile;

    // Buyer posts a job
    const jobRes = await fetch(`${baseUrl}/api/work/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        categoryId: catsData.categories[0].id,
        title: 'Custom Wardrobe for Master Bedroom in Pune',
        description: 'Need 8x7 ft sliding wardrobe in BWP ply with laminate finish.',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Kothrud',
        budgetMin: 50000,
        budgetMax: 85000,
        budgetType: 'fixed',
      }),
    });
    assert.equal(jobRes.status, 201);
    const job = ((await jobRes.json()) as any).job;

    // Pro applies & sends quotation
    const applyRes = await fetch(`${baseUrl}/api/work/jobs/${job.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ coverNote: 'Can start Monday with Century BWP stock.' }),
    });
    assert.equal(applyRes.status, 201);

    const quoteRes = await fetch(`${baseUrl}/api/work/quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({
        jobId: job.id,
        title: 'Wardrobe Quotation',
        scopeSummary: 'Complete 8x7 sliding wardrobe with soft-close hardware',
        lineItems: [{ item: 'BWP Ply & Laminate', qty: '1 Lot', amount: 68000 }],
        laborCost: 18000,
        materialCost: 50000,
        totalAmount: 68000,
        estimatedDurationDays: 10,
      }),
    });
    assert.equal(quoteRes.status, 201);
    const quote = ((await quoteRes.json()) as any).quotation;

    // Buyer accepts quotation -> launches Project Hub
    const acceptRes = await fetch(`${baseUrl}/api/work/quotations/${quote.id}/accept`, {
      method: 'POST',
      headers: { Cookie: buyerCookie },
    });
    assert.equal(acceptRes.status, 200);
    const acceptData = (await acceptRes.json()) as any;
    assert.ok(acceptData.projectId, 'Accepting quotation should create Project Hub workspace');

    // Pro posts progress update & message in Project Hub
    const updRes = await fetch(`${baseUrl}/api/projects/${acceptData.projectId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({
        updateType: 'progress',
        title: 'Carcass cutting completed',
        description: 'All marine ply panels cut and edge-banded.',
        progressPercent: 45,
        expenseAmount: 25000,
      }),
    });
    assert.equal(updRes.status, 201);

    const projMsgRes = await fetch(`${baseUrl}/api/projects/${acceptData.projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ body: 'Ready for fitting tomorrow morning.' }),
    });
    assert.equal(projMsgRes.status, 201);

    // Buyer reviews pro
    const reviewRes = await fetch(`${baseUrl}/api/professionals/${proProfile.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        projectId: acceptData.projectId,
        rating: 5,
        title: 'Excellent wardrobe craftsmanship',
        comment: 'Finished accurately on budget and kept the room clean.',
      }),
    });
    assert.equal(reviewRes.status, 201);

    // 5. Admin Login & Analytics + Verification check
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@zaidaat.in', password: 'AdminZaidaat@123' }),
    });
    assert.equal(adminLoginRes.status, 200);
    const adminCookie = getCookies(adminLoginRes);

    const adminStats = await fetch(`${baseUrl}/api/admin/analytics`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(adminStats.status, 200);

    // 6. Phone OTP dev flow
    const otpSend = await fetch(`${baseUrl}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820112233' }),
    });
    assert.equal(otpSend.status, 200);
    const otpData = (await otpSend.json()) as any;
    assert.ok(otpData.devOtpCode);

    const otpVerify = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9820112233', code: otpData.devOtpCode }),
    });
    assert.equal(otpVerify.status, 200);

    // 7. Forgot & Reset Password flow
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotData = (await forgotRes.json()) as any;
    assert.ok(forgotData.devResetToken);

    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: forgotData.devResetToken, newPassword: 'NewPassword@123' }),
    });
    assert.equal(resetRes.status, 200);

    // Re-login buyer after password reset (since reset-password revokes prior sessions!)
    const revokedCheck = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: buyerCookie } });
    assert.equal(revokedCheck.status, 200);
    assert.equal(((await revokedCheck.json()) as any).user, null);
    const reLoginBuyer = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: regEmail, password: 'NewPassword@123' }),
    });
    assert.equal(reLoginBuyer.status, 200);
    buyerCookie = getCookies(reLoginBuyer);

    // 8. Property Compare & Magic-Byte Verified Upload + Private KYC Isolation
    const compareRes = await fetch(`${baseUrl}/api/properties/compare?ids=1,2`);
    assert.equal(compareRes.status, 200);
    const compareData = (await compareRes.json()) as any;
    assert.equal(compareData.properties.length, 2);

    // Spoofed SVG labeled as PNG must be rejected (400)
    const spoofForm = new FormData();
    spoofForm.append(
      'files',
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/png' }),
      'spoof.png'
    );
    const spoofUpload = await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: spoofForm,
    });
    assert.equal(spoofUpload.status, 400);

    // Genuine PNG magic-byte file succeeds
    const validPngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const validForm = new FormData();
    validForm.append('files', new Blob([validPngBytes], { type: 'image/png' }), 'real.png');
    const uploadRes = await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: validForm,
    });
    assert.equal(uploadRes.status, 201);
    const uploadData = (await uploadRes.json()) as any;
    assert.ok(uploadData.files[0].url.startsWith('/uploads/user/'));

    // Private KYC upload & owner/admin access control
    const kycForm = new FormData();
    kycForm.append('files', new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'], { type: 'application/pdf' }), 'pan.pdf');
    const kycUpload = await fetch(`${baseUrl}/api/uploads/kyc`, {
      method: 'POST',
      headers: { Cookie: proCookie },
      body: kycForm,
    });
    assert.equal(kycUpload.status, 201);
    const kycUrl = ((await kycUpload.json()) as any).files[0].url as string;
    assert.ok(kycUrl.startsWith('/api/uploads/kyc/'));

    // Stranger buyer & direct static /uploads/kyc access blocked; owner & admin allowed
    const kycUnauth = await fetch(`${baseUrl}${kycUrl}`);
    assert.equal(kycUnauth.status, 401);
    const kycStranger = await fetch(`${baseUrl}${kycUrl}`, { headers: { Cookie: buyerCookie } });
    assert.equal(kycStranger.status, 403);
    const kycStaticDirect = await fetch(`${baseUrl}/uploads/kyc/${kycUrl.split('/').pop()}`);
    assert.equal(kycStaticDirect.status, 403);
    const kycOwnerRead = await fetch(`${baseUrl}${kycUrl}`, { headers: { Cookie: proCookie } });
    assert.equal(kycOwnerRead.status, 200);
    const kycAdminRead = await fetch(`${baseUrl}${kycUrl}`, { headers: { Cookie: adminCookie } });
    assert.equal(kycAdminRead.status, 200);

    // 9. Admin Verification Approval, Self-Suspend Protection & Audit Log
    const versRes = await fetch(`${baseUrl}/api/admin/verifications`, { headers: { Cookie: adminCookie } });
    const versData = (await versRes.json()) as any;
    const pendingVer = versData.records.find((r: any) => r.status === 'pending');
    assert.ok(pendingVer, 'Should have a seeded pending verification');

    const approveVer = await fetch(`${baseUrl}/api/admin/verifications/${pendingVer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'verified', adminNotes: 'Approved in integration test' }),
    });
    assert.equal(approveVer.status, 200);

    // Admin self-suspend guard
    const adminMe = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: adminCookie } });
    const adminUser = ((await adminMe.json()) as any).user;
    const selfSuspend = await fetch(`${baseUrl}/api/admin/users/${adminUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(selfSuspend.status, 400);

    const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs`, { headers: { Cookie: adminCookie } });
    assert.equal(auditRes.status, 200);
    const auditLogs = ((await auditRes.json()) as any).logs;
    assert.ok(auditLogs.some((l: any) => l.action === 'verification_verified' && l.target_id === pendingVer.id));

    // 10. Business Logic Integrity & Anti-Abuse Guards (Prompt 3)
    // Review without engagement -> 403
    const fakeReview = await fetch(`${baseUrl}/api/professionals/9/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ rating: 1, title: 'Unrelated stranger review', comment: 'Should be rejected' }),
    });
    assert.equal(fakeReview.status, 403);

    // Duplicate review for same engagement -> 409
    const dupReview = await fetch(`${baseUrl}/api/professionals/${proProfile.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        projectId: acceptData.projectId,
        rating: 5,
        title: 'Duplicate try',
        comment: 'Should fail cleanly with 409 conflict.',
      }),
    });
    assert.equal(dupReview.status, 409);

    // Double quotation accept -> 409
    const reAcceptQuote = await fetch(`${baseUrl}/api/work/quotations/${quote.id}/accept`, {
      method: 'POST',
      headers: { Cookie: buyerCookie },
    });
    assert.equal(reAcceptQuote.status, 409);

    // Project completion idempotency (marking completed twice only increments completed_jobs_count once)
    const beforeProData = ((await (await fetch(`${baseUrl}/api/professionals/${proProfile.id}`)).json()) as any)
      .professional;
    const comp1 = await fetch(`${baseUrl}/api/projects/${acceptData.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(comp1.status, 200);
    const comp2 = await fetch(`${baseUrl}/api/projects/${acceptData.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(comp2.status, 200);
    const afterProData = ((await (await fetch(`${baseUrl}/api/professionals/${proProfile.id}`)).json()) as any)
      .professional;
    assert.equal(afterProData.completedJobsCount, beforeProData.completedJobsCount + 1);

    // Hiring request state machine: pending -> completed directly fails (409), pending -> accepted -> completed works
    const hrRes = await fetch(`${baseUrl}/api/work/hiring-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        professionalId: proProfile.id,
        title: 'Balcony Pergola Build',
        description: 'Need exterior teak pergola installation in Kothrud.',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Kothrud',
        budget: 45000,
      }),
    });
    assert.equal(hrRes.status, 201);
    const hrId = ((await hrRes.json()) as any).hiringRequestId;
    const invalidComplete = await fetch(`${baseUrl}/api/work/hiring-requests/${hrId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(invalidComplete.status, 409);
    const acceptHr = await fetch(`${baseUrl}/api/work/hiring-requests/${hrId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ status: 'accepted' }),
    });
    assert.equal(acceptHr.status, 200);
    const reRejectHr = await fetch(`${baseUrl}/api/work/hiring-requests/${hrId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ status: 'rejected' }),
    });
    assert.equal(reRejectHr.status, 409);

    // Unsafe javascript: media URL rejection
    const unsafeJobRes = await fetch(`${baseUrl}/api/work/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        categoryId: catsData.categories[0].id,
        title: 'Unsafe media test job',
        description: 'Testing javascript protocol URL rejection cleanly.',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Baner',
        budgetMin: 10000,
        budgetMax: 20000,
        referenceImages: ['javascript:alert(1)'],
      }),
    });
    assert.equal(unsafeJobRes.status, 400);

    // Owner shortlist application & cancel open job
    const job2Res = await fetch(`${baseUrl}/api/work/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({
        categoryId: catsData.categories[0].id,
        title: 'Secondary Loft Cabinet Job',
        description: 'Loft shutters for study room in Baner.',
        state: 'Maharashtra',
        city: 'Pune',
        locality: 'Baner',
        budgetMin: 18000,
        budgetMax: 26000,
      }),
    });
    assert.equal(job2Res.status, 201);
    const job2 = ((await job2Res.json()) as any).job;
    await fetch(`${baseUrl}/api/work/jobs/${job2.id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: proCookie },
      body: JSON.stringify({ coverNote: 'Available next week for measurement.' }),
    });
    const job2Detail = ((await (await fetch(`${baseUrl}/api/work/jobs/${job2.id}`, { headers: { Cookie: buyerCookie } })).json()) as any);
    const appId = job2Detail.applications[0].id;
    const shortlistRes = await fetch(`${baseUrl}/api/work/applications/${appId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ status: 'shortlisted' }),
    });
    assert.equal(shortlistRes.status, 200);
    const cancelJob2 = await fetch(`${baseUrl}/api/work/jobs/${job2.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: buyerCookie },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    assert.equal(cancelJob2.status, 200);

    // 11. Redesigned Marketplace Endpoints (portfolioPreview, saved_jobs, admin directory listings)
    const prosListRes = await fetch(`${baseUrl}/api/professionals`);
    assert.equal(prosListRes.status, 200);
    const prosListData = (await prosListRes.json()) as any;
    assert.ok(prosListData.professionals.length > 0);
    assert.ok(Array.isArray(prosListData.professionals[0].portfolioPreview));

    const saveJobRes = await fetch(`${baseUrl}/api/work/jobs/1/save`, {
      method: 'POST',
      headers: { Cookie: proCookie },
    });
    assert.equal(saveJobRes.status, 200);
    const saveJobData = (await saveJobRes.json()) as any;
    assert.equal(saveJobData.saved, true);

    const savedJobsRes = await fetch(`${baseUrl}/api/work/jobs/saved`, {
      headers: { Cookie: proCookie },
    });
    assert.equal(savedJobsRes.status, 200);
    const savedJobsData = (await savedJobsRes.json()) as any;
    assert.ok(savedJobsData.jobs.some((j: any) => j.id === 1));

    const adminProsRes = await fetch(`${baseUrl}/api/admin/professionals`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(adminProsRes.status, 200);

    const adminJobsRes = await fetch(`${baseUrl}/api/admin/jobs`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(adminJobsRes.status, 200);

    console.log('[test] ALL API & SECURITY INTEGRATION TESTS PASSED!');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeDb();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup lock on Windows
    }
  }
}

run().catch((err) => {
  console.error('[test] FAILED:', err);
  process.exit(1);
});
