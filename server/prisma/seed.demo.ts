import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024
  });
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const targetDbUrl = process.env.DATABASE_URL || "file:./demo.db";

// CRITICAL SAFETY CHECK: Refuse execution on dev.db
if (targetDbUrl.includes("dev.db")) {
  console.error("FATAL: seed.demo.ts is strictly isolated to demo.db and cannot run against dev.db.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: targetDbUrl }
  }
});

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "RoyalKnot#LocalDev2026";
const defaultPasswordHash = hashPassword(DEMO_PASSWORD);

async function seedDemoData() {
  console.log(`Starting isolated demonstration seeding against: ${targetDbUrl}`);

  // 1. Users (5)
  console.log("1. Seeding 5 Role Users...");
  const usersData = [
    { email: "admin@royalknot.in", name: "System Administrator", role: "ADMIN", phone: "+919829099999", hourlyRatePaise: 0n },
    { email: "founder@royalknot.in", name: "Devika Rajyashree", role: "FOUNDER", phone: "+919829000000", hourlyRatePaise: 500000n },
    { email: "lead.planner@royalknot.in", name: "Ananya Singhal", role: "LEAD_PLANNER", phone: "+919829011111", hourlyRatePaise: 250000n },
    { email: "operations@royalknot.in", name: "Rajesh Chouhan", role: "COORDINATOR", phone: "+919829022222", hourlyRatePaise: 150000n },
    { email: "finance@royalknot.in", name: "Vikram Rathore", role: "FINANCE_DIRECTOR", phone: "+919829033333", hourlyRatePaise: 300000n }
  ];
  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, passwordHash: defaultPasswordHash },
      create: { ...u, passwordHash: defaultPasswordHash }
    });
  }

  // 2. Master Luxury Vendors (8)
  console.log("2. Seeding 8 Master Luxury Vendors...");
  const vendorsData = [
    { id: "demo-v-caterer", businessName: "Royal Rajputana Hospitality & Banquets", category: "CATERING", contactPerson: "Chef Mahendra Singh", phone: "+919829100001", email: "contact@rajputanacatering.com", city: "Jaipur", notes: "Royal haveli thalis and multi-cuisine royal spreads" },
    { id: "demo-v-decor", businessName: "Mewar Palace Floral & Heritage Decorators", category: "DECOR_FLORAL", contactPerson: "Sunita Mewari", phone: "+919829100002", email: "info@mewardecor.com", city: "Udaipur", notes: "Floral structural rigging, lake terrace lighting grids" },
    { id: "demo-v-sound", businessName: "Jaipur Stagecraft & Soundworks", category: "SOUND_LIGHT", contactPerson: "Kunal Sound", phone: "+919829100003", email: "kunal@jaipursoundworks.com", city: "Jaipur", notes: "Concert line arrays and acoustic limiters" },
    { id: "demo-v-photo", businessName: "Heritage Frames & Cinema Udaipur", category: "PHOTOGRAPHY", contactPerson: "Aditya Purohit", phone: "+919829100004", email: "info@heritageframes.in", city: "Udaipur", notes: "Royal palace documentary cinema" },
    { id: "demo-v-cars", businessName: "Marwar Vintage Automobile Fleet", category: "LOGISTICS", contactPerson: "Ratan Singh", phone: "+919829100005", email: "fleet@marwarvintage.com", city: "Jaipur", notes: "1930s Rolls Royce and open-top convertible vintage fleet" },
    { id: "demo-v-band", businessName: "Udaipur Royal Symphony Brass Band", category: "ENTERTAINMENT", contactPerson: "Ustad Rehmat Khan", phone: "+919829100006", email: "music@royalsymphony.in", city: "Udaipur", notes: "Traditional Shehnai, Nagada, and regal brass fanfare" },
    { id: "demo-v-mehendi", businessName: "Udaivilas Artisan Bridal Mehendi", category: "HAIR_MAKEUP_MEHENDI", contactPerson: "Fatima Sheikh", phone: "+919829100007", email: "bridal@udaivilasmehendi.in", city: "Udaipur", notes: "Organic Rajasthani sojat henna with intricate royal haveli motifs" },
    { id: "demo-v-security", businessName: "Rajputana Royal Guard & VIP Escort", category: "SECURITY", contactPerson: "Col. Bhupendra Rathore", phone: "+919829100008", email: "vip@rajputanasecurity.com", city: "Jaipur", notes: "Executive protection, palace perimeter guards and drone counter-surveillance" }
  ];
  for (const v of vendorsData) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: v
    });
  }

  // 3. Client Enquiries (8)
  console.log("3. Seeding 8 Luxury Enquiries...");
  const enquiriesData = [
    { id: "demo-enq-1", coupleNames: "Aaditya Singhania & Radhika Merchant", primaryEmail: "aaditya.singhania@demowedding.in", primaryPhone: "+919829200001", source: "REFERRAL", roughDate: new Date("2026-10-10"), estimatedGuests: 450, budgetCeilingPaise: 5500000000n, status: "CONVERTED", themePreference: "PALACE_REGAL", isDemoData: true },
    { id: "demo-enq-2", coupleNames: "Vikramaditya Rathore & Ananya Sharma", primaryEmail: "vikram.rathore@demowedding.in", primaryPhone: "+919829200002", source: "INSTAGRAM", roughDate: new Date("2026-10-20"), estimatedGuests: 400, budgetCeilingPaise: 4800000000n, status: "CONVERTED", themePreference: "ROYAL_HERITAGE", isDemoData: true },
    { id: "demo-enq-3", coupleNames: "Yuvraj Shekhawat & Devika Kumari", primaryEmail: "yuvraj.shekhawat@demowedding.in", primaryPhone: "+919829200003", source: "WHATSAPP", roughDate: new Date("2026-11-05"), estimatedGuests: 350, budgetCeilingPaise: 3800000000n, status: "CONVERTED", themePreference: "PALACE_REGAL", isDemoData: true },
    { id: "demo-enq-4", coupleNames: "Rohan Agarwal & Pooja Kothari", primaryEmail: "rohan.agarwal@demowedding.in", primaryPhone: "+919829200004", source: "WEBSITE", roughDate: new Date("2026-11-20"), estimatedGuests: 420, budgetCeilingPaise: 4200000000n, status: "CONVERTED", themePreference: "ROYAL_HERITAGE", isDemoData: true },
    { id: "demo-enq-5", coupleNames: "Kabir Mehra & Nisha Bafna", primaryEmail: "kabir.mehra@demowedding.in", primaryPhone: "+919829200005", source: "REFERRAL", roughDate: new Date("2026-12-10"), estimatedGuests: 300, budgetCeilingPaise: 3200000000n, status: "CONVERTED", themePreference: "PALACE_REGAL", isDemoData: true },
    { id: "demo-enq-6", coupleNames: "Arjun Jaipuria & Tara Mittal", primaryEmail: "arjun.jaipuria@demowedding.in", primaryPhone: "+919829200006", source: "PHONE_CALL", roughDate: new Date("2026-12-24"), estimatedGuests: 250, budgetCeilingPaise: 2800000000n, status: "CONVERTED", themePreference: "ROYAL_HERITAGE", isDemoData: true },
    { id: "demo-enq-7", coupleNames: "Siddharth Lodha & Meera Darda", primaryEmail: "siddharth.lodha@demowedding.in", primaryPhone: "+919829200007", source: "INSTAGRAM", roughDate: new Date("2027-02-14"), estimatedGuests: 450, budgetCeilingPaise: 4000000000n, status: "CONSULTATION_SCHEDULED", themePreference: "ROYAL_HERITAGE", consultationDate: new Date("2026-11-15"), isDemoData: true },
    { id: "demo-enq-8", coupleNames: "Karan Godawat & Ishita Rungta", primaryEmail: "karan.godawat@demowedding.in", primaryPhone: "+919829200008", source: "WEBSITE", roughDate: new Date("2027-03-20"), estimatedGuests: 500, budgetCeilingPaise: 5000000000n, status: "AGREEMENT_SENT", themePreference: "PALACE_REGAL", isDemoData: true }
  ];
  for (const e of enquiriesData) {
    await prisma.enquiry.upsert({
      where: { id: e.id },
      update: {},
      create: e
    });
  }

  // 4. Couples (6)
  console.log("4. Seeding 6 Converted Couples...");
  const couplesData = [
    { id: "demo-c-1", enquiryId: "demo-enq-1", partnerOneName: "Aaditya Singhania", partnerTwoName: "Radhika Merchant", email: "aaditya.singhania@demowedding.in", phone: "+919829200001", address: "Altamount Road, Mumbai" },
    { id: "demo-c-2", enquiryId: "demo-enq-2", partnerOneName: "Vikramaditya Rathore", partnerTwoName: "Ananya Sharma", email: "vikram.rathore@demowedding.in", phone: "+919829200002", address: "Civil Lines, Jaipur" },
    { id: "demo-c-3", enquiryId: "demo-enq-3", partnerOneName: "Yuvraj Shekhawat", partnerTwoName: "Devika Kumari", email: "yuvraj.shekhawat@demowedding.in", phone: "+919829200003", address: "Fatehsagar Enclave, Udaipur" },
    { id: "demo-c-4", enquiryId: "demo-enq-4", partnerOneName: "Rohan Agarwal", partnerTwoName: "Pooja Kothari", email: "rohan.agarwal@demowedding.in", phone: "+919829200004", address: "Ballygunge Circular, Kolkata" },
    { id: "demo-c-5", enquiryId: "demo-enq-5", partnerOneName: "Kabir Mehra", partnerTwoName: "Nisha Bafna", email: "kabir.mehra@demowedding.in", phone: "+919829200005", address: "Golf Links, New Delhi" },
    { id: "demo-c-6", enquiryId: "demo-enq-6", partnerOneName: "Arjun Jaipuria", partnerTwoName: "Tara Mittal", email: "arjun.jaipuria@demowedding.in", phone: "+919829200006", address: "C-Scheme, Jaipur" }
  ];
  for (const c of couplesData) {
    await prisma.couple.upsert({
      where: { id: c.id },
      update: {},
      create: c
    });
  }

  // 5. Service Agreements (6)
  console.log("5. Seeding 6 Executed Service Agreements...");
  const agreementsData = [
    { coupleId: "demo-c-1", packageType: "FULL_SERVICE", agreedFeePaise: 750000000n, paymentTerms: "20% Deposit, 60% Advance, 20% Post-Event", isExecuted: true, signedByName: "Aaditya Singhania", signedAt: new Date("2026-06-15") },
    { coupleId: "demo-c-2", packageType: "FULL_SERVICE", agreedFeePaise: 675000000n, paymentTerms: "20% Deposit, 60% Advance, 20% Post-Event", isExecuted: true, signedByName: "Vikramaditya Rathore", signedAt: new Date("2026-06-25") },
    { coupleId: "demo-c-3", packageType: "PARTIAL_DAY_OF", agreedFeePaise: 280000000n, paymentTerms: "30% Deposit, 70% Day-Of Settlement", isExecuted: true, signedByName: "Yuvraj Shekhawat", signedAt: new Date("2026-07-10") },
    { coupleId: "demo-c-4", packageType: "FULL_SERVICE", agreedFeePaise: 600000000n, paymentTerms: "20% Deposit, 60% Advance, 20% Post-Event", isExecuted: true, signedByName: "Rohan Agarwal", signedAt: new Date("2026-07-20") },
    { coupleId: "demo-c-5", packageType: "FULL_SERVICE", agreedFeePaise: 450000000n, paymentTerms: "20% Deposit, 60% Advance, 20% Post-Event", isExecuted: true, signedByName: "Kabir Mehra", signedAt: new Date("2026-08-05") },
    { coupleId: "demo-c-6", packageType: "PARTIAL_DAY_OF", agreedFeePaise: 200000000n, paymentTerms: "30% Deposit, 70% Day-Of Settlement", isExecuted: true, signedByName: "Arjun Jaipuria", signedAt: new Date("2026-08-15") }
  ];
  for (const a of agreementsData) {
    await prisma.serviceAgreement.upsert({
      where: { coupleId: a.coupleId },
      update: {},
      create: a
    });
  }

  // 6. Weddings (6)
  console.log("6. Seeding 6 Destination Weddings...");
  const weddingsData = [
    { id: "demo-w-1", coupleId: "demo-c-1", title: "The Royal Wedding of Aaditya & Radhika", packageType: "FULL_SERVICE", startDate: new Date("2026-10-10"), endDate: new Date("2026-10-12"), primaryCity: "Udaipur", venueName: "The Oberoi Udaivilas", targetGuestCount: 450, totalBudgetPaise: 5000000000n, status: "COMPLETED", tasksGenerated: true, isDemoData: true },
    { id: "demo-w-2", coupleId: "demo-c-2", title: "The Heritage Gala of Vikramaditya & Ananya", packageType: "FULL_SERVICE", startDate: new Date("2026-10-20"), endDate: new Date("2026-10-22"), primaryCity: "Jaipur", venueName: "Rambagh Palace", targetGuestCount: 400, totalBudgetPaise: 4500000000n, status: "COMPLETED", tasksGenerated: true, isDemoData: true },
    { id: "demo-w-3", coupleId: "demo-c-3", title: "The Palace Nuptials of Yuvraj & Devika", packageType: "PARTIAL_DAY_OF", startDate: new Date("2026-11-05"), endDate: new Date("2026-11-07"), primaryCity: "Udaipur", venueName: "Taj Lake Palace", targetGuestCount: 350, totalBudgetPaise: 3500000000n, status: "ACTIVE_EXECUTION", tasksGenerated: true, isDemoData: true },
    { id: "demo-w-4", coupleId: "demo-c-4", title: "The Regal Union of Rohan & Pooja", packageType: "FULL_SERVICE", startDate: new Date("2026-11-20"), endDate: new Date("2026-11-22"), primaryCity: "Udaipur", venueName: "City Palace & Jagmandir Island", targetGuestCount: 420, totalBudgetPaise: 4000000000n, status: "ACTIVE_EXECUTION", tasksGenerated: true, isDemoData: true },
    { id: "demo-w-5", coupleId: "demo-c-5", title: "The Bishangarh Citadel Wedding of Kabir & Nisha", packageType: "FULL_SERVICE", startDate: new Date("2026-12-10"), endDate: new Date("2026-12-12"), primaryCity: "Jaipur", venueName: "Alila Fort Bishangarh", targetGuestCount: 300, totalBudgetPaise: 3000000000n, status: "PLANNING", tasksGenerated: true, isDemoData: true },
    { id: "demo-w-6", coupleId: "demo-c-6", title: "The Haveli Festivities of Arjun & Tara", packageType: "PARTIAL_DAY_OF", startDate: new Date("2026-12-24"), endDate: new Date("2026-12-26"), primaryCity: "Jaipur", venueName: "Samode Palace & Haveli", targetGuestCount: 250, totalBudgetPaise: 2500000000n, status: "PLANNING", tasksGenerated: true, isDemoData: true }
  ];
  for (const w of weddingsData) {
    await prisma.wedding.upsert({
      where: { id: w.id },
      update: {},
      create: w
    });
  }

  // 7. Wedding Days (18: 3 days per wedding)
  console.log("7. Seeding 18 Wedding Days...");
  for (const w of weddingsData) {
    for (let day = 1; day <= 3; day++) {
      const dayDate = new Date(w.startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
      const title = day === 1 ? "Royal Arrival & Welcome Mehendi" : day === 2 ? "Royal Sangeet & Cocktail Gala" : "Regal Baraat, Vows & Grand Reception";
      await prisma.weddingDay.upsert({
        where: { id: `demo-day-${w.id}-${day}` },
        update: {},
        create: {
          id: `demo-day-${w.id}-${day}`,
          weddingId: w.id,
          dayNumber: day,
          date: dayDate,
          title
        }
      });
    }
  }

  // 8. Tasks (24: 4 per wedding)
  console.log("8. Seeding 24 Operational Tasks...");
  const taskTemplates = [
    { key: "VENUE_DESIGN", title: "Palace Lighting & Floral Structural Rigging", cat: "VENUE_DESIGN", pri: "CRITICAL" },
    { key: "VENDORS", title: "Master Vendor Lock & Menu Tastings", cat: "VENDORS", pri: "HIGH" },
    { key: "GUEST_LOGISTICS", title: "VIP Vintage Fleet & Airport Escort Coordination", cat: "GUEST_LOGISTICS", pri: "MEDIUM" },
    { key: "BIG_DAY_EXECUTION", title: "Ceremonial Baraat Procession & Vows Choreography", cat: "BIG_DAY_EXECUTION", pri: "CRITICAL" }
  ];
  for (const w of weddingsData) {
    const isDone = w.status === "COMPLETED";
    const isInProgress = w.status === "ACTIVE_EXECUTION";
    for (const t of taskTemplates) {
      const stage = isDone ? "DONE" : isInProgress ? (t.key === "VENUE_DESIGN" ? "DONE" : "IN_PROGRESS") : "TO_PLAN";
      await prisma.task.upsert({
        where: { weddingId_templateKey: { weddingId: w.id, templateKey: t.key } },
        update: {},
        create: {
          id: `demo-task-${w.id}-${t.key}`,
          weddingId: w.id,
          templateKey: t.key,
          title: `${t.title} - ${w.venueName}`,
          category: t.cat,
          stage,
          priority: t.pri,
          dueDate: new Date(w.startDate.getTime() - 15 * 24 * 60 * 60 * 1000),
          isCustom: false
        }
      });
    }
  }

  // 9. Event Schedules (12: 2 per wedding)
  console.log("9. Seeding 12 Event Schedules...");
  for (const w of weddingsData) {
    const day2Date = new Date(w.startDate.getTime() + 1 * 24 * 60 * 60 * 1000);
    const day3Date = new Date(w.startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    await prisma.eventSchedule.upsert({
      where: { id: `demo-sch-${w.id}-sangeet` },
      update: {},
      create: {
        id: `demo-sch-${w.id}-sangeet`,
        weddingId: w.id,
        weddingDayId: `demo-day-${w.id}-2`,
        subEvent: "SANGEET",
        activityName: "Royal Sangeet Performances & Gala Dinner",
        startTime: new Date(day2Date.getTime() + 19 * 3600 * 1000),
        endTime: new Date(day2Date.getTime() + 23 * 3600 * 1000),
        location: `${w.venueName} Courtyard`,
        notes: "Acoustic decibel limiters enforced at 10 PM"
      }
    });
    await prisma.eventSchedule.upsert({
      where: { id: `demo-sch-${w.id}-reception` },
      update: {},
      create: {
        id: `demo-sch-${w.id}-reception`,
        weddingId: w.id,
        weddingDayId: `demo-day-${w.id}-3`,
        subEvent: "RECEPTION",
        activityName: "Baraat Arrival & Royal Dinner Reception",
        startTime: new Date(day3Date.getTime() + 18 * 3600 * 1000),
        endTime: new Date(day3Date.getTime() + 22 * 3600 * 1000),
        location: `${w.venueName} Royal Lawns`,
        notes: "VIP guest receiving line with royal brass accompaniment"
      }
    });
  }

  // 10. Incidents (3)
  console.log("10. Seeding 3 Incidents & Resolutions...");
  const incidentsData = [
    { id: "demo-inc-1", weddingId: "demo-w-1", title: "Sudden lakeside squall on dining terrace", description: "High wind warning on lake terrace required emergency structural canopies", severity: "HIGH", status: "RESOLVED", reportedBy: "Rajesh Chouhan", resolvedAt: new Date("2026-10-11"), resolutionNotes: "Deployed all-weather waterproof canopy within 35 minutes" },
    { id: "demo-inc-2", weddingId: "demo-w-2", title: "Main generator phase imbalance", description: "Secondary diesel generator engaged during Sangeet lighting check", severity: "MEDIUM", status: "RESOLVED", reportedBy: "Kunal Sound", resolvedAt: new Date("2026-10-21"), resolutionNotes: "Silent backup 125kVA unit deployed without event interruption" },
    { id: "demo-inc-3", weddingId: "demo-w-3", title: "Sojat henna truck highway transit delay", description: "Floral truck delayed due to highway lane closure outside Udaipur", severity: "LOW", status: "RESOLVED", reportedBy: "Ananya Singhal", resolvedAt: new Date("2026-11-05"), resolutionNotes: "Local reserve stock mobilized immediately" }
  ];
  for (const inc of incidentsData) {
    await prisma.incident.upsert({
      where: { id: inc.id },
      update: {},
      create: inc
    });
  }

  // 11. RFQ Groups (5: Weddings 1 to 5)
  console.log("11. Seeding 5 RFQ Groups...");
  const rfqData = [
    { id: "demo-rfq-1", weddingId: "demo-w-1", title: "Gala Banquet Catering Tender", category: "CATERING" },
    { id: "demo-rfq-2", weddingId: "demo-w-2", title: "Palace Floral Rigging Tender", category: "DECOR_FLORAL" },
    { id: "demo-rfq-3", weddingId: "demo-w-3", title: "Concert Acoustic Lighting Tender", category: "SOUND_LIGHT" },
    { id: "demo-rfq-4", weddingId: "demo-w-4", title: "Royal Cinematography Package", category: "PHOTOGRAPHY" },
    { id: "demo-rfq-5", weddingId: "demo-w-5", title: "Citadel Mandap Decor Rigging", category: "DECOR_FLORAL" }
  ];
  for (const r of rfqData) {
    await prisma.quotationRequestGroup.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        weddingId: r.weddingId,
        title: r.title,
        category: r.category,
        targetGuestCount: 400,
        status: "AWARDED"
      }
    });
  }

  // 12. Vendor Requests & Quotations (15 Requests, 15 Quotations, 15 Line Items)
  console.log("12. Seeding 15 Vendor Requests, Quotations & Line Items...");
  const rfqVendors = [
    { rfqId: "demo-rfq-1", vendorId: "demo-v-caterer", base: 450000000n, isWinner: true },
    { rfqId: "demo-rfq-1", vendorId: "demo-v-decor", base: 490000000n, isWinner: false },
    { rfqId: "demo-rfq-1", vendorId: "demo-v-sound", base: 520000000n, isWinner: false },

    { rfqId: "demo-rfq-2", vendorId: "demo-v-decor", base: 380000000n, isWinner: true },
    { rfqId: "demo-rfq-2", vendorId: "demo-v-sound", base: 420000000n, isWinner: false },
    { rfqId: "demo-rfq-2", vendorId: "demo-v-photo", base: 440000000n, isWinner: false },

    { rfqId: "demo-rfq-3", vendorId: "demo-v-sound", base: 250000000n, isWinner: true },
    { rfqId: "demo-rfq-3", vendorId: "demo-v-decor", base: 280000000n, isWinner: false },
    { rfqId: "demo-rfq-3", vendorId: "demo-v-band", base: 310000000n, isWinner: false },

    { rfqId: "demo-rfq-4", vendorId: "demo-v-photo", base: 220000000n, isWinner: true },
    { rfqId: "demo-rfq-4", vendorId: "demo-v-sound", base: 260000000n, isWinner: false },
    { rfqId: "demo-rfq-4", vendorId: "demo-v-decor", base: 275000000n, isWinner: false },

    { rfqId: "demo-rfq-5", vendorId: "demo-v-decor", base: 290000000n, isWinner: true },
    { rfqId: "demo-rfq-5", vendorId: "demo-v-sound", base: 310000000n, isWinner: false },
    { rfqId: "demo-rfq-5", vendorId: "demo-v-photo", base: 330000000n, isWinner: false }
  ];

  let reqIdx = 1;
  const awardedQuotes: Record<string, string> = {};

  for (const item of rfqVendors) {
    const reqId = `demo-vreq-${reqIdx}`;
    const quoteId = `demo-vquote-${reqIdx}`;
    const lineId = `demo-line-${reqIdx}`;

    await prisma.vendorRequest.upsert({
      where: { quotationRequestGroupId_vendorId: { quotationRequestGroupId: item.rfqId, vendorId: item.vendorId } },
      update: {},
      create: {
        id: reqId,
        quotationRequestGroupId: item.rfqId,
        vendorId: item.vendorId,
        requirement: `Luxury service proposal for ${item.rfqId}`,
        status: item.isWinner ? "AWARDED" : "REJECTED_COMPETING_AWARDED"
      }
    });

    await prisma.vendorQuotation.upsert({
      where: { id: quoteId },
      update: {},
      create: {
        id: quoteId,
        vendorRequestId: reqId,
        vendorId: item.vendorId,
        quoteReference: `QUOTE-REF-2026-${reqIdx}`,
        baseAmountPaise: item.base,
        isSelectedWinner: item.isWinner
      }
    });

    await prisma.quotationLineItem.upsert({
      where: { id: lineId },
      update: {},
      create: {
        id: lineId,
        quotationId: quoteId,
        description: "Standard Palace Execution Package with Dedicated Lead Supervisor",
        quantityScaledUnits: 1000n,
        unitPricePaise: item.base,
        totalPricePaise: item.base
      }
    });

    if (item.isWinner) {
      awardedQuotes[item.rfqId] = quoteId;
      await prisma.quotationRequestGroup.update({
        where: { id: item.rfqId },
        data: { awardedQuotationId: quoteId }
      });
    }

    reqIdx++;
  }

  // 13. Wedding Vendors & Check-Ins (5 WeddingVendors, 5 CheckIns)
  console.log("13. Seeding 5 Contracted Wedding Vendors & Check-Ins...");
  const awardedContracts = [
    { weddingId: "demo-w-1", vendorId: "demo-v-caterer", rfqId: "demo-rfq-1", cat: "CATERING", amount: 450000000n },
    { weddingId: "demo-w-2", vendorId: "demo-v-decor", rfqId: "demo-rfq-2", cat: "DECOR_FLORAL", amount: 380000000n },
    { weddingId: "demo-w-3", vendorId: "demo-v-sound", rfqId: "demo-rfq-3", cat: "SOUND_LIGHT", amount: 250000000n },
    { weddingId: "demo-w-4", vendorId: "demo-v-photo", rfqId: "demo-rfq-4", cat: "PHOTOGRAPHY", amount: 220000000n },
    { weddingId: "demo-w-5", vendorId: "demo-v-decor", rfqId: "demo-rfq-5", cat: "DECOR_FLORAL", amount: 290000000n }
  ];

  let wvIdx = 1;
  for (const c of awardedContracts) {
    const wvId = `demo-wv-${wvIdx}`;
    const checkId = `demo-check-${wvIdx}`;
    await prisma.weddingVendor.upsert({
      where: { weddingId_vendorId_quotationRequestGroupId: { weddingId: c.weddingId, vendorId: c.vendorId, quotationRequestGroupId: c.rfqId } },
      update: {},
      create: {
        id: wvId,
        weddingId: c.weddingId,
        vendorId: c.vendorId,
        quotationRequestGroupId: c.rfqId,
        quotationId: awardedQuotes[c.rfqId],
        serviceCategory: c.cat,
        agreedBaselineAmountPaise: c.amount,
        status: "CONTRACTED"
      }
    });

    await prisma.vendorCheckIn.upsert({
      where: { id: checkId },
      update: {},
      create: {
        id: checkId,
        weddingVendorId: wvId,
        scheduledArrival: new Date("2026-10-10T14:00:00Z"),
        actualArrival: new Date("2026-10-10T13:45:00Z"),
        status: "ARRIVED",
        delayMinutes: 0,
        checkedInBy: "Rajesh Chouhan",
        notes: "Crew arrived on time with required palace load-in passes"
      }
    });
    wvIdx++;
  }

  // 14. Payment Milestones (18: 3 per wedding)
  console.log("14. Seeding 18 Client Payment Milestones...");
  for (const w of weddingsData) {
    const isCompleted = w.status === "COMPLETED";
    const depositAmount = (w.totalBudgetPaise * 15n * 20n) / 10000n; // 20% of 15% agency fee
    const advanceAmount = (w.totalBudgetPaise * 15n * 60n) / 10000n; // 60% of 15% agency fee
    const finalAmount = (w.totalBudgetPaise * 15n * 20n) / 10000n;   // 20% of 15% agency fee

    await prisma.paymentMilestone.upsert({
      where: { id: `demo-ms-${w.id}-1` },
      update: {},
      create: {
        id: `demo-ms-${w.id}-1`,
        weddingId: w.id,
        type: "BOOKING_DEPOSIT",
        title: "Immediate Booking Deposit (20%)",
        dueDate: new Date(w.startDate.getTime() - 90 * 24 * 3600 * 1000),
        targetAmountPaise: depositAmount,
        status: "PAID"
      }
    });

    await prisma.paymentMilestone.upsert({
      where: { id: `demo-ms-${w.id}-2` },
      update: {},
      create: {
        id: `demo-ms-${w.id}-2`,
        weddingId: w.id,
        type: "ADVANCE_PAYMENT",
        title: "Pre-Event Planning Advance (60%)",
        dueDate: new Date(w.startDate.getTime() - 30 * 24 * 3600 * 1000),
        targetAmountPaise: advanceAmount,
        status: isCompleted ? "PAID" : "PAID"
      }
    });

    await prisma.paymentMilestone.upsert({
      where: { id: `demo-ms-${w.id}-3` },
      update: {},
      create: {
        id: `demo-ms-${w.id}-3`,
        weddingId: w.id,
        type: "FINAL_SETTLEMENT",
        title: "Post-Event Final Settlement (20%)",
        dueDate: new Date(w.endDate.getTime() + 7 * 24 * 3600 * 1000),
        targetAmountPaise: finalAmount,
        status: isCompleted ? "PAID" : "PENDING"
      }
    });
  }

  // 15. Client Invoices, Milestone Links & Client Payments (12 Invoices, 12 Milestone Links, 12 Payments)
  console.log("15. Seeding 12 Invoices, Milestone Links & Payments...");
  let invCounter = 1;
  for (const w of weddingsData) {
    const isCompleted = w.status === "COMPLETED";
    const depositAmount = (w.totalBudgetPaise * 15n * 20n) / 10000n;
    const advanceAmount = (w.totalBudgetPaise * 15n * 60n) / 10000n;

    // Invoice 1: Booking Deposit
    const inv1Id = `demo-inv-${invCounter}`;
    const inv1Num = `INV-DEMO-2026-${String(invCounter).padStart(3, "0")}`;
    await prisma.clientInvoice.upsert({
      where: { invoiceNumber: inv1Num },
      update: {},
      create: {
        id: inv1Id,
        weddingId: w.id,
        invoiceNumber: inv1Num,
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(w.startDate.getTime() - 85 * 24 * 3600 * 1000),
        subtotalPaise: depositAmount,
        taxPaise: 0n,
        extraChargesPaise: 0n,
        totalAmountPaise: depositAmount,
        status: "PAID"
      }
    });

    await prisma.clientInvoiceMilestone.upsert({
      where: { invoiceId_milestoneId: { invoiceId: inv1Id, milestoneId: `demo-ms-${w.id}-1` } },
      update: {},
      create: { invoiceId: inv1Id, milestoneId: `demo-ms-${w.id}-1` }
    });

    await prisma.clientPayment.upsert({
      where: { transactionReference: `TX-DEMO-DEP-${w.id}` },
      update: {},
      create: {
        id: `demo-pay-${invCounter}`,
        clientInvoiceId: inv1Id,
        amountPaise: depositAmount,
        paymentMethod: "NEFT_RTGS",
        transactionReference: `TX-DEMO-DEP-${w.id}`,
        status: "CLEARED",
        clearedAt: new Date(w.startDate.getTime() - 84 * 24 * 3600 * 1000),
        notes: "Cleared via HDFC Corporate RTGS"
      }
    });
    invCounter++;

    // Invoice 2: Advance Payment (PAID for completed, PAID for active)
    const inv2Id = `demo-inv-${invCounter}`;
    const inv2Num = `INV-DEMO-2026-${String(invCounter).padStart(3, "0")}`;
    const inv2Paid = isCompleted;

    await prisma.clientInvoice.upsert({
      where: { invoiceNumber: inv2Num },
      update: {},
      create: {
        id: inv2Id,
        weddingId: w.id,
        invoiceNumber: inv2Num,
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(w.startDate.getTime() - 25 * 24 * 3600 * 1000),
        subtotalPaise: advanceAmount,
        taxPaise: 0n,
        extraChargesPaise: 0n,
        totalAmountPaise: advanceAmount,
        status: inv2Paid ? "PAID" : "ISSUED"
      }
    });

    await prisma.clientInvoiceMilestone.upsert({
      where: { invoiceId_milestoneId: { invoiceId: inv2Id, milestoneId: `demo-ms-${w.id}-2` } },
      update: {},
      create: { invoiceId: inv2Id, milestoneId: `demo-ms-${w.id}-2` }
    });

    if (inv2Paid) {
      await prisma.clientPayment.upsert({
        where: { transactionReference: `TX-DEMO-ADV-${w.id}` },
        update: {},
        create: {
          id: `demo-pay-${invCounter}`,
          clientInvoiceId: inv2Id,
          amountPaise: advanceAmount,
          paymentMethod: "NEFT_RTGS",
          transactionReference: `TX-DEMO-ADV-${w.id}`,
          status: "CLEARED",
          clearedAt: new Date(w.startDate.getTime() - 24 * 24 * 3600 * 1000),
          notes: "Advance payment cleared in full"
        }
      });
    } else {
      await prisma.clientPayment.upsert({
        where: { transactionReference: `TX-DEMO-ADV-${w.id}` },
        update: {},
        create: {
          id: `demo-pay-${invCounter}`,
          clientInvoiceId: inv2Id,
          amountPaise: advanceAmount,
          paymentMethod: "NEFT_RTGS",
          transactionReference: `TX-DEMO-ADV-${w.id}`,
          status: "PENDING",
          notes: "Awaiting bank verification"
        }
      });
    }
    invCounter++;
  }

  // 16. Additional Charges (5)
  console.log("16. Seeding 5 Additional Charges...");
  const chargesData = [
    { id: "demo-chg-1", weddingId: "demo-w-1", desc: "Emergency all-weather canopy trussing on lake promenade", reason: "INCIDENT_RESOLUTION", cost: 15000000n },
    { id: "demo-chg-2", weddingId: "demo-w-2", desc: "Silent diesel generator reserve deployment", reason: "INCIDENT_RESOLUTION", cost: 8500000n },
    { id: "demo-chg-3", weddingId: "demo-w-3", desc: "Express floral transport reserve mobilization", reason: "INCIDENT_RESOLUTION", cost: 4500000n },
    { id: "demo-chg-4", weddingId: "demo-w-4", desc: "Additional 50 VIP midnight dessert spreads", reason: "EXTRA_GUESTS", cost: 12500000n },
    { id: "demo-chg-5", weddingId: "demo-w-5", desc: "Citadel ramp lighting augmentation", reason: "EXTENDED_HOURS", cost: 6500000n }
  ];
  for (const chg of chargesData) {
    await prisma.additionalCharge.upsert({
      where: { id: chg.id },
      update: {},
      create: {
        id: chg.id,
        weddingId: chg.weddingId,
        description: chg.desc,
        reasonType: chg.reason,
        quantityScaledUnits: 1000n,
        unitCostPaise: chg.cost,
        totalCostPaise: chg.cost,
        billedToClient: true,
        status: "SETTLED"
      }
    });
  }

  // 17. Vendor Bills & Vendor Payments (5 Bills, 5 Payments)
  console.log("17. Seeding 5 Vendor Bills & Vendor Payments...");
  for (let b = 1; b <= 5; b++) {
    const wvId = `demo-wv-${b}`;
    const billId = `demo-vbill-${b}`;
    const billNum = `BILL-DEMO-2026-${String(b).padStart(3, "0")}`;
    const billAmount = 200000000n; // ₹20 Lakhs
    const isCompleted = b <= 2;

    await prisma.vendorBill.upsert({
      where: { weddingVendorId_billNumber: { weddingVendorId: wvId, billNumber: billNum } },
      update: {},
      create: {
        id: billId,
        weddingVendorId: wvId,
        billNumber: billNum,
        baseAmountPaise: billAmount,
        extraAmountPaise: 0n,
        totalBilledPaise: billAmount,
        status: isCompleted ? "PAID" : "APPROVED",
        reconciled: true,
        reconciliationNotes: "Audited against palace delivery challans and RFQ award"
      }
    });

    await prisma.vendorPayment.upsert({
      where: { transactionReference: `TX-VPAY-DEMO-${b}` },
      update: {},
      create: {
        id: `demo-vpay-${b}`,
        vendorBillId: billId,
        paymentType: "ADVANCE",
        amountPaise: billAmount,
        paymentMethod: "NEFT_RTGS",
        transactionReference: `TX-VPAY-DEMO-${b}`,
        status: isCompleted ? "CLEARED" : "PENDING",
        clearedAt: isCompleted ? new Date("2026-10-18") : null,
        notes: isCompleted ? "Approved by Finance Director" : "Pending final clearance"
      }
    });
  }

  // 18. Internal Planning Labor Logs (6: 1 per wedding)
  console.log("18. Seeding 6 Internal Planning Work Logs...");
  for (let l = 1; l <= 6; l++) {
    const wId = `demo-w-${l}`;
    const hours = 25.0;
    const rate = 250000n; // ₹2,500/hr
    const totalLabor = BigInt(Math.round(hours)) * rate;

    await prisma.teamWorkLog.upsert({
      where: { id: `demo-worklog-${l}` },
      update: {},
      create: {
        id: `demo-worklog-${l}`,
        weddingId: wId,
        userId: (await prisma.user.findUnique({ where: { email: "lead.planner@royalknot.in" } }))!.id,
        date: new Date("2026-09-15"),
        hoursWorked: hours,
        hourlyRatePaise: rate,
        totalLaborCostPaise: totalLabor,
        taskDescription: "Strategic vendor lock, palace walkthrough, and tasting coordination"
      }
    });
  }

  // 19. Audit Logs (5)
  console.log("19. Seeding 5 Compliance Audit Logs...");
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@royalknot.in" } });
  for (let a = 1; a <= 5; a++) {
    await prisma.auditLog.upsert({
      where: { id: `demo-audit-${a}` },
      update: {},
      create: {
        id: `demo-audit-${a}`,
        entityName: "VendorPayment",
        entityId: `demo-vpay-${a}`,
        action: "APPROVE_PAYMENT",
        performedBy: adminUser!.id,
        detailsJson: JSON.stringify({
          auditor: "admin@royalknot.in",
          verifiedAgainstRFQ: true,
          anomalyCheck: "PASSED_ZERO_DISCREPANCY"
        }),
        timestamp: new Date("2026-10-15")
      }
    });
  }

  console.log("SUCCESS: Isolated demonstration dataset seeded successfully.");
}

seedDemoData()
  .catch((err) => {
    console.error("FATAL ERROR during demo seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
