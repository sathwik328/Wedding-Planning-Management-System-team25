import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

const PALACE_VENUES = [
  { name: "The Oberoi Udaivilas", city: "Udaipur" },
  { name: "Rambagh Palace", city: "Jaipur" },
  { name: "City Palace & Jagmandir Island", city: "Udaipur" },
  { name: "Taj Lake Palace", city: "Udaipur" },
  { name: "Alila Fort Bishangarh", city: "Jaipur" },
  { name: "The Leela Palace", city: "Udaipur" },
  { name: "Fairmont Palace", city: "Jaipur" },
  { name: "Samode Palace & Haveli", city: "Jaipur" },
  { name: "Shiv Niwas Palace", city: "Udaipur" },
  { name: "Jai Mahal Palace", city: "Jaipur" }
];

const COUPLE_NAMES = [
  ["Aaditya Singhania", "Radhika Merchant"],
  ["Vikramaditya Rathore", "Ananya Sharma"],
  ["Yuvraj Shekhawat", "Devika Kumari"],
  ["Rohan Agarwal", "Pooja Kothari"],
  ["Kabir Mehra", "Nisha Bafna"],
  ["Arjun Jaipuria", "Tara Mittal"],
  ["Siddharth Lodha", "Meera Darda"],
  ["Aditya Birla", "Sanaya Kasliwal"],
  ["Karan Godawat", "Ishita Rungta"],
  ["Raghav Bhandari", "Simran Chordia"],
  ["Pranav Morarka", "Avani Jhunjhunwala"],
  ["Devraj Singh", "Gayatri Devi"],
  ["Varun Somani", "Kavya Poddar"],
  ["Harshvardhan Bangur", "Tanvi Dhoot"],
  ["Keshav Taparia", "Divya Oswal"],
  ["Rishi Jalan", "Rhea Goenka"],
  ["Jaiwardhan Khaitan", "Rupali Dalmia"],
  ["Manish Surana", "Priyanka Baid"],
  ["Gaurav Khandelwal", "Swati Toshniwal"],
  ["Dhruv Mohta", "Shreya Singhi"],
  ["Nakul Sarda", "Anushka Patni"],
  ["Bhavya Sethi", "Kritika Chhabra"],
  ["Shaurya Maroo", "Vidhi Kankaria"],
  ["Rajat Lunia", "Sneha Golechha"],
  ["Aayush Bhansali", "Saloni Bothra"]
];

/**
 * Validate the execution environment for seeding.
 * Fails immediately if executed in production or if DEMO_USER_PASSWORD is missing or blank.
 */
export function validateSeedEnvironment(env: { NODE_ENV?: string; DEMO_USER_PASSWORD?: string } = process.env): string {
  if (env.NODE_ENV === "production") {
    throw new Error("Seeding demo accounts is strictly prohibited in production environments (NODE_ENV=production).");
  }

  const demoUserPassword = env.DEMO_USER_PASSWORD;
  if (!demoUserPassword || demoUserPassword.trim() === "") {
    throw new Error(
      "Missing required environment variable DEMO_USER_PASSWORD. A non-empty DEMO_USER_PASSWORD is required to seed demonstration user accounts."
    );
  }

  return demoUserPassword;
}

async function main() {
  const demoUserPassword = validateSeedEnvironment(process.env);
  console.log("Seeding The Royal Knot demonstration database...");

  // 1. Seed Team Members / Users
  const defaultPasswordHash = hashPassword(demoUserPassword);

  const leadPlanner = await prisma.user.upsert({
    where: { email: "lead.planner@royalknot.in" },
    update: {
      role: "LEAD_PLANNER",
      passwordHash: defaultPasswordHash
    },
    create: {
      name: "Ananya Singhal",
      email: "lead.planner@royalknot.in",
      role: "LEAD_PLANNER",
      passwordHash: defaultPasswordHash,
      phone: "+919829011111",
      hourlyRatePaise: 250000n // ₹2,500/hr
    }
  });

  const coordinator = await prisma.user.upsert({
    where: { email: "operations@royalknot.in" },
    update: {
      role: "COORDINATOR",
      passwordHash: defaultPasswordHash
    },
    create: {
      name: "Rajesh Chouhan",
      email: "operations@royalknot.in",
      role: "COORDINATOR",
      passwordHash: defaultPasswordHash,
      phone: "+919829022222",
      hourlyRatePaise: 150000n // ₹1,500/hr
    }
  });

  const financeDirector = await prisma.user.upsert({
    where: { email: "finance@royalknot.in" },
    update: {
      role: "FINANCE_DIRECTOR",
      passwordHash: defaultPasswordHash
    },
    create: {
      name: "Vikram Rathore",
      email: "finance@royalknot.in",
      role: "FINANCE_DIRECTOR",
      passwordHash: defaultPasswordHash,
      phone: "+919829033333",
      hourlyRatePaise: 300000n // ₹3,000/hr
    }
  });

  await prisma.user.upsert({
    where: { email: "founder@royalknot.in" },
    update: {
      role: "FOUNDER",
      passwordHash: defaultPasswordHash
    },
    create: {
      name: "Devika Rajyashree",
      email: "founder@royalknot.in",
      role: "FOUNDER",
      passwordHash: defaultPasswordHash,
      phone: "+919829000000",
      hourlyRatePaise: 500000n // ₹5,000/hr
    }
  });

  // 2. Seed Master Luxury Vendors
  const catererVendor = await prisma.vendor.upsert({
    where: { id: "vendor-royal-jaipur-caterers" },
    update: {},
    create: {
      id: "vendor-royal-jaipur-caterers",
      businessName: "Royal Rajputana Hospitality & Banquets",
      category: "CATERING",
      contactPerson: "Chef Mahendra Singh",
      phone: "+919829100001",
      email: "contact@rajputanacatering.com",
      city: "Jaipur",
      notes: "Specializes in royal haveli thalis, dal baati churma, and multi-cuisine spreads for 400+ guests"
    }
  });

  const decorVendor = await prisma.vendor.upsert({
    where: { id: "vendor-udaivilas-decor" },
    update: {},
    create: {
      id: "vendor-udaivilas-decor",
      businessName: "Mewar Palace Floral & Heritage Decorators",
      category: "DECOR_FLORAL",
      contactPerson: "Sunita Mewari",
      phone: "+919829100002",
      email: "info@mewardecor.com",
      city: "Udaipur",
      notes: "Premier floral structural rigging, royal haveli lighting grids, and mandap stylings"
    }
  });

  const soundVendor = await prisma.vendor.upsert({
    where: { id: "vendor-rajasthan-sound" },
    update: {},
    create: {
      id: "vendor-rajasthan-sound",
      businessName: "Jaipur Stagecraft & Soundworks",
      category: "SOUND_LIGHT",
      contactPerson: "Kunal Sound",
      phone: "+919829100003",
      email: "kunal@jaipursoundworks.com",
      city: "Jaipur",
      notes: "Concert line arrays, lake terrace trussing, and acoustic limiters"
    }
  });

  // 3. Seed 25 Synthetic Demo Weddings
  for (let i = 0; i < 25; i++) {
    const [p1, p2] = COUPLE_NAMES[i];
    const venue = PALACE_VENUES[i % PALACE_VENUES.length];
    const budgetCrores = 2 + (i % 4); // 2 to 5 Crores
    const budgetPaise = BigInt(budgetCrores) * 1000000000n; // Crore to paise
    const startDate = new Date(2026, 10 + (i % 3), 5 + (i % 20));
    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3-day wedding

    const email = `${p1.toLowerCase().replace(/\s+/g, ".")}.${i}@demowedding.in`;
    const weddingTitle = `The Royal Wedding of ${p1} & ${p2}`;

    const enquiry = await prisma.enquiry.upsert({
      where: { id: `demo-enquiry-${i + 1}` },
      update: {},
      create: {
        id: `demo-enquiry-${i + 1}`,
        coupleNames: `${p1} & ${p2}`,
        primaryEmail: email,
        primaryPhone: `+919829${String(100000 + i)}`,
        source: i % 3 === 0 ? "INSTAGRAM" : i % 3 === 1 ? "WHATSAPP" : "PHONE_CALL",
        roughDate: startDate,
        estimatedGuests: 400 + (i * 10),
        themePreference: i % 2 === 0 ? "ROYAL_HERITAGE" : "PALACE_REGAL",
        budgetCeilingPaise: budgetPaise,
        status: "CONVERTED",
        isDemoData: true
      }
    });

    const couple = await prisma.couple.upsert({
      where: { id: `demo-couple-${i + 1}` },
      update: {},
      create: {
        id: `demo-couple-${i + 1}`,
        enquiryId: enquiry.id,
        partnerOneName: p1,
        partnerTwoName: p2,
        email: email,
        phone: `+919829${String(100000 + i)}`
      }
    });

    const agreementFeePaise = (budgetPaise * 15n) / 100n; // 15% agency planning fee
    await prisma.serviceAgreement.upsert({
      where: { coupleId: couple.id },
      update: {},
      create: {
        coupleId: couple.id,
        packageType: i % 4 === 0 ? "PARTIAL_DAY_OF" : "FULL_SERVICE",
        agreedFeePaise: agreementFeePaise,
        paymentTerms: "20% Booking Deposit, 60% Advance Payment 30 Days Prior, 20% Post-Event Settlement",
        isExecuted: true,
        signedByName: p1,
        signedAt: new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000)
      }
    });

    const wedding = await prisma.wedding.upsert({
      where: { coupleId: couple.id },
      update: {},
      create: {
        coupleId: couple.id,
        title: weddingTitle,
        packageType: i % 4 === 0 ? "PARTIAL_DAY_OF" : "FULL_SERVICE",
        startDate,
        endDate,
        primaryCity: venue.city,
        venueName: venue.name,
        targetGuestCount: 400 + (i * 10),
        totalBudgetPaise: budgetPaise,
        status: i < 5 ? "COMPLETED" : i < 15 ? "ACTIVE_EXECUTION" : "PLANNING",
        tasksGenerated: true,
        isDemoData: true
      }
    });

    // Seed 3 Wedding Days
    for (let day = 1; day <= 3; day++) {
      const dayDate = new Date(startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000);
      const dayTitle = day === 1 ? "Day 1: Royal Arrival & Welcome Mehendi" : day === 2 ? "Day 2: Royal Sangeet & Cocktail Night" : "Day 3: Baraat, Vows & Grand Reception";
      await prisma.weddingDay.upsert({
        where: { id: `demo-day-${wedding.id}-${day}` },
        update: {},
        create: {
          id: `demo-day-${wedding.id}-${day}`,
          weddingId: wedding.id,
          dayNumber: day,
          date: dayDate,
          title: dayTitle
        }
      });
    }

    // Seed Staged Client Invoices & Milestones
    const depositPaise = (agreementFeePaise * 20n) / 100n;
    const advancePaise = (agreementFeePaise * 60n) / 100n;
    const finalPaise = agreementFeePaise - depositPaise - advancePaise;

    const milestone1 = await prisma.paymentMilestone.upsert({
      where: { id: `demo-milestone-${wedding.id}-1` },
      update: {},
      create: {
        id: `demo-milestone-${wedding.id}-1`,
        weddingId: wedding.id,
        type: "BOOKING_DEPOSIT",
        title: "Immediate Booking Deposit (20%)",
        dueDate: new Date(startDate.getTime() - 85 * 24 * 60 * 60 * 1000),
        targetAmountPaise: depositPaise,
        status: "PAID"
      }
    });

    const inv1 = await prisma.clientInvoice.upsert({
      where: { invoiceNumber: `INV-DEMO-${i + 1}-01` },
      update: {},
      create: {
        weddingId: wedding.id,
        invoiceNumber: `INV-DEMO-${i + 1}-01`,
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(startDate.getTime() - 85 * 24 * 60 * 60 * 1000),
        subtotalPaise: depositPaise,
        totalAmountPaise: depositPaise,
        status: "PAID"
      }
    });

    await prisma.clientPayment.upsert({
      where: { transactionReference: `TX-CLEARED-DEP-${i + 1}` },
      update: {},
      create: {
        clientInvoiceId: inv1.id,
        amountPaise: depositPaise,
        paymentMethod: "NEFT_RTGS",
        transactionReference: `TX-CLEARED-DEP-${i + 1}`,
        status: "CLEARED",
        clearedAt: new Date(startDate.getTime() - 84 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log("SUCCESS: 25 Synthetic demo weddings and master vendors seeded successfully.");
}

const isDirectExecution = process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"));
if (isDirectExecution) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
