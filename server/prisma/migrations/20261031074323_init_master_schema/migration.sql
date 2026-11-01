-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "hourlyRatePaise" BIGINT NOT NULL DEFAULT 150000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "detailsJson" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleNames" TEXT NOT NULL,
    "primaryEmail" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "roughDate" DATETIME NOT NULL,
    "estimatedGuests" INTEGER NOT NULL DEFAULT 400,
    "themePreference" TEXT,
    "budgetCeilingPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "consultationDate" DATETIME,
    "notes" TEXT,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enquiryId" TEXT,
    "partnerOneName" TEXT NOT NULL,
    "partnerTwoName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Couple_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceAgreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "agreedFeePaise" BIGINT NOT NULL,
    "paymentTerms" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "agreementHash" TEXT,
    "signatureDataUrl" TEXT,
    "signedByName" TEXT,
    "signedAt" DATETIME,
    "signerIpAddressHash" TEXT,
    "isExecuted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceAgreement_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "primaryCity" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "targetGuestCount" INTEGER NOT NULL DEFAULT 400,
    "totalBudgetPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "tasksGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isDemoData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wedding_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeddingDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeddingDay_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rsvpStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "dietaryNotes" TEXT,
    "tableAssigned" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'TO_PLAN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "dueDate" DATETIME NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "weddingDayId" TEXT NOT NULL,
    "subEvent" TEXT NOT NULL,
    "activityName" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "coordinatorId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSchedule_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSchedule_weddingDayId_fkey" FOREIGN KEY ("weddingDayId") REFERENCES "WeddingDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSchedule_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingVendorId" TEXT NOT NULL,
    "scheduledArrival" DATETIME,
    "actualArrival" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'EXPECTED',
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "checkedInBy" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorCheckIn_weddingVendorId_fkey" FOREIGN KEY ("weddingVendorId") REFERENCES "WeddingVendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "resolutionNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incident_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuotationRequestGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetGuestCount" INTEGER NOT NULL DEFAULT 400,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "awardedQuotationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationRequestGroup_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationRequestGroup_awardedQuotationId_fkey" FOREIGN KEY ("awardedQuotationId") REFERENCES "VendorQuotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationRequestGroupId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorRequest_quotationRequestGroupId_fkey" FOREIGN KEY ("quotationRequestGroupId") REFERENCES "QuotationRequestGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorQuotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorRequestId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quoteReference" TEXT NOT NULL,
    "menuDescription" TEXT,
    "pricePerPlatePaise" BIGINT,
    "baseAmountPaise" BIGINT NOT NULL,
    "extraHourRatePaise" BIGINT NOT NULL DEFAULT 0,
    "documentUrl" TEXT,
    "isSelectedWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorQuotation_vendorRequestId_fkey" FOREIGN KEY ("vendorRequestId") REFERENCES "VendorRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VendorQuotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityScaledUnits" BIGINT NOT NULL DEFAULT 1000,
    "unitPricePaise" BIGINT NOT NULL,
    "totalPricePaise" BIGINT NOT NULL,
    CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "VendorQuotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeddingVendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quotationRequestGroupId" TEXT NOT NULL,
    "serviceCategory" TEXT NOT NULL,
    "quotationId" TEXT,
    "agreedBaselineAmountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONTRACTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeddingVendor_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeddingVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeddingVendor_quotationRequestGroupId_fkey" FOREIGN KEY ("quotationRequestGroupId") REFERENCES "QuotationRequestGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeddingVendor_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "VendorQuotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "targetAmountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentMilestone_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "subtotalPaise" BIGINT NOT NULL,
    "taxPaise" BIGINT NOT NULL DEFAULT 0,
    "extraChargesPaise" BIGINT NOT NULL DEFAULT 0,
    "totalAmountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientInvoice_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientInvoiceMilestone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    CONSTRAINT "ClientInvoiceMilestone_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ClientInvoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientInvoiceMilestone_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PaymentMilestone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientInvoiceId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clearedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPayment_clientInvoiceId_fkey" FOREIGN KEY ("clientInvoiceId") REFERENCES "ClientInvoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdditionalCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reasonType" TEXT NOT NULL,
    "quantityScaledUnits" BIGINT NOT NULL DEFAULT 1000,
    "unitCostPaise" BIGINT NOT NULL,
    "totalCostPaise" BIGINT NOT NULL,
    "vendorId" TEXT,
    "weddingVendorId" TEXT,
    "incidentId" TEXT,
    "vendorBillId" TEXT,
    "clientInvoiceId" TEXT,
    "billedToClient" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdditionalCharge_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdditionalCharge_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdditionalCharge_weddingVendorId_fkey" FOREIGN KEY ("weddingVendorId") REFERENCES "WeddingVendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdditionalCharge_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdditionalCharge_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdditionalCharge_clientInvoiceId_fkey" FOREIGN KEY ("clientInvoiceId") REFERENCES "ClientInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectExpensePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "additionalChargeId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DirectExpensePayment_additionalChargeId_fkey" FOREIGN KEY ("additionalChargeId") REFERENCES "AdditionalCharge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingVendorId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "baseAmountPaise" BIGINT NOT NULL,
    "extraAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "totalBilledPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "varianceReason" TEXT,
    "reconciliationNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorBill_weddingVendorId_fkey" FOREIGN KEY ("weddingVendorId") REFERENCES "WeddingVendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorBillId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clearedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VendorPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamWorkLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weddingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "hoursWorked" REAL NOT NULL,
    "hourlyRatePaise" BIGINT NOT NULL,
    "totalLaborCostPaise" BIGINT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamWorkLog_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamWorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Couple_enquiryId_key" ON "Couple"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAgreement_coupleId_key" ON "ServiceAgreement"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_coupleId_key" ON "Wedding"("coupleId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_weddingId_templateKey_key" ON "Task"("weddingId", "templateKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationRequestGroup_awardedQuotationId_key" ON "QuotationRequestGroup"("awardedQuotationId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRequest_quotationRequestGroupId_vendorId_key" ON "VendorRequest"("quotationRequestGroupId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuotation_vendorRequestId_key" ON "VendorQuotation"("vendorRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingVendor_quotationId_key" ON "WeddingVendor"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingVendor_weddingId_vendorId_quotationRequestGroupId_key" ON "WeddingVendor"("weddingId", "vendorId", "quotationRequestGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoice_invoiceNumber_key" ON "ClientInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvoiceMilestone_invoiceId_milestoneId_key" ON "ClientInvoiceMilestone"("invoiceId", "milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPayment_transactionReference_key" ON "ClientPayment"("transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "DirectExpensePayment_transactionReference_key" ON "DirectExpensePayment"("transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_weddingVendorId_billNumber_key" ON "VendorBill"("weddingVendorId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayment_transactionReference_key" ON "VendorPayment"("transactionReference");
