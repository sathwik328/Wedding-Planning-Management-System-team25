import { PrismaClient, ServiceAgreement } from "@prisma/client";
import crypto from "crypto";

export interface CreateAgreementInput {
  coupleId: string;
  packageType: "FULL_SERVICE" | "PARTIAL_DAY_OF";
  agreedFeePaise: string | bigint;
  paymentTerms: string;
}

export interface SignAgreementInput {
  signatureDataUrl: string;
  signedByName: string;
  clientIp?: string;
}

export class AgreementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate SHA-256 checksum of canonical agreement terms
   */
  private computeAgreementHash(coupleId: string, packageType: string, feePaise: string, paymentTerms: string, version: number): string {
    const payload = `couple:${coupleId}|pkg:${packageType}|fee:${feePaise}|terms:${paymentTerms}|v:${version}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Create or update draft Service Agreement for a Couple
   */
  async createOrUpdateAgreement(input: CreateAgreementInput): Promise<ServiceAgreement> {
    const couple = await this.prisma.couple.findUnique({
      where: { id: input.coupleId },
      include: { serviceAgreement: true }
    });

    if (!couple) {
      throw new Error(`Couple with ID "${input.coupleId}" not found.`);
    }

    const feeBigInt = typeof input.agreedFeePaise === "bigint"
      ? input.agreedFeePaise
      : BigInt(input.agreedFeePaise);

    const version = couple.serviceAgreement ? couple.serviceAgreement.version + 1 : 1;
    const agreementHash = this.computeAgreementHash(
      couple.id,
      input.packageType,
      feeBigInt.toString(),
      input.paymentTerms,
      version
    );

    if (couple.serviceAgreement) {
      if (couple.serviceAgreement.isExecuted) {
        throw new Error("Cannot alter an already executed Service Agreement. Please create an amendment.");
      }

      return this.prisma.serviceAgreement.update({
        where: { id: couple.serviceAgreement.id },
        data: {
          packageType: input.packageType,
          agreedFeePaise: feeBigInt,
          paymentTerms: input.paymentTerms,
          version,
          agreementHash
        }
      });
    }

    return this.prisma.serviceAgreement.create({
      data: {
        coupleId: input.coupleId,
        packageType: input.packageType,
        agreedFeePaise: feeBigInt,
        paymentTerms: input.paymentTerms,
        version: 1,
        agreementHash,
        isExecuted: false
      }
    });
  }

  /**
   * Retrieve agreement by Couple ID
   */
  async getAgreementByCoupleId(coupleId: string): Promise<ServiceAgreement | null> {
    return this.prisma.serviceAgreement.findUnique({
      where: { coupleId },
      include: {
        couple: {
          include: {
            enquiry: true,
            wedding: true
          }
        }
      }
    });
  }

  /**
   * Execute digital signature capture on agreement
   */
  async signAgreement(agreementId: string, input: SignAgreementInput): Promise<ServiceAgreement> {
    const agreement = await this.prisma.serviceAgreement.findUnique({
      where: { id: agreementId },
      include: { couple: true }
    });

    if (!agreement) {
      throw new Error(`Agreement with ID "${agreementId}" not found.`);
    }

    if (agreement.isExecuted) {
      throw new Error("This agreement has already been executed and signed.");
    }

    if (!input.signatureDataUrl || !input.signatureDataUrl.startsWith("data:image/")) {
      throw new Error("Invalid signature format. Expected base64 image data URL.");
    }

    if (!input.signedByName || input.signedByName.trim().length < 2) {
      throw new Error("Signer name must be provided.");
    }

    const ipHash = input.clientIp
      ? crypto.createHash("sha256").update(input.clientIp).digest("hex")
      : null;

    return this.prisma.$transaction(async (tx) => {
      const executed = await tx.serviceAgreement.update({
        where: { id: agreementId },
        data: {
          signatureDataUrl: input.signatureDataUrl,
          signedByName: input.signedByName.trim(),
          signedAt: new Date(),
          signerIpAddressHash: ipHash,
          isExecuted: true
        }
      });

      // If couple is linked to an enquiry, ensure enquiry status reflects agreement execution
      if (agreement.couple.enquiryId) {
        await tx.enquiry.update({
          where: { id: agreement.couple.enquiryId },
          data: { status: "CONVERTED" }
        });
      }

      // Record audit log
      await tx.auditLog.create({
        data: {
          entityName: "ServiceAgreement",
          entityId: agreement.id,
          action: "DIGITAL_SIGNATURE_EXECUTED",
          performedBy: input.signedByName.trim(),
          detailsJson: JSON.stringify({
            version: agreement.version,
            agreementHash: agreement.agreementHash,
            signerIpHash: ipHash,
            timestamp: new Date().toISOString()
          })
        }
      });

      return executed;
    });
  }
}
