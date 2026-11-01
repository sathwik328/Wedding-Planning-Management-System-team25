import { PrismaClient, Wedding, Task, WeddingDay } from "@prisma/client";
import { executeTaskGenerationWithTargetedRetry } from "./taskAutomation.service.js";

export interface CreateWeddingInput {
  coupleId: string;
  title: string;
  packageType: "FULL_SERVICE" | "PARTIAL_DAY_OF";
  startDate: string | Date;
  endDate: string | Date;
  primaryCity: string;
  venueName: string;
  targetGuestCount?: number;
  totalBudgetPaise: string | bigint;
}

export interface UpdateTaskInput {
  stage?: string;
  priority?: string;
  assignedToId?: string | null;
  dueDate?: string | Date;
  title?: string;
}

export interface CreateCustomTaskInput {
  weddingId: string;
  title: string;
  category: string;
  priority?: string;
  dueDate: string | Date;
  assignedToId?: string;
}

export class WeddingOpsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create wedding dossier, generate wedding days, and trigger automatic task milestones
   */
  async createWedding(input: CreateWeddingInput): Promise<Wedding> {
    const couple = await this.prisma.couple.findUnique({
      where: { id: input.coupleId },
      include: { wedding: true, serviceAgreement: true }
    });

    if (!couple) {
      throw new Error(`Couple with ID "${input.coupleId}" not found.`);
    }

    if (couple.wedding) {
      throw new Error(`Couple "${couple.partnerOneName} & ${couple.partnerTwoName}" already has an active wedding project.`);
    }

    const budgetBigInt = typeof input.totalBudgetPaise === "bigint"
      ? input.totalBudgetPaise
      : BigInt(input.totalBudgetPaise);

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (end < start) {
      throw new Error("End date cannot precede start date.");
    }

    // Calculate number of wedding days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const dayCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const wedding = await this.prisma.$transaction(async (tx) => {
      const created = await tx.wedding.create({
        data: {
          coupleId: input.coupleId,
          title: input.title.trim(),
          packageType: input.packageType,
          startDate: start,
          endDate: end,
          primaryCity: input.primaryCity.trim(),
          venueName: input.venueName.trim(),
          targetGuestCount: input.targetGuestCount ?? 400,
          totalBudgetPaise: budgetBigInt,
          status: "PLANNING",
          tasksGenerated: false,
          milestones: {
            create: {
              type: "BOOKING_DEPOSIT",
              title: "Confirmed Booking Deposit",
              dueDate: new Date(),
              targetAmountPaise: budgetBigInt / 10n,
              status: "PAID"
            }
          }
        }
      });

      // Create multi-day wedding itinerary days
      for (let i = 0; i < Math.min(dayCount, 7); i++) {
        const dayDate = new Date(start);
        dayDate.setDate(start.getDate() + i);

        const dayTitles = [
          "Day 1: Royal Welcome, Mehendi & Sangeet Gala",
          "Day 2: Auspicious Haldi, Baraat & Pheras Ceremony",
          "Day 3: Grand Reception & Royal Feast",
          "Day 4: Farewell Brunch & Royal Escort"
        ];

        await tx.weddingDay.create({
          data: {
            weddingId: created.id,
            dayNumber: i + 1,
            date: dayDate,
            title: dayTitles[i] || `Day ${i + 1}: Celebrations`
          }
        });
      }

      return created;
    });

    // Automatically trigger task generation
    await executeTaskGenerationWithTargetedRetry(this.prisma, wedding.id);

    // Return wedding with generated days and tasks
    return this.prisma.wedding.findUniqueOrThrow({
      where: { id: wedding.id },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        tasks: { orderBy: { dueDate: "asc" } }
      }
    });
  }

  /**
   * List all luxury weddings with couple, progress metrics, and task stats
   */
  async listWeddings(): Promise<any[]> {
    const weddings = await this.prisma.wedding.findMany({
      orderBy: { startDate: "asc" },
      include: {
        couple: true,
        days: { orderBy: { dayNumber: "asc" } },
        tasks: {
          select: {
            id: true,
            stage: true,
            priority: true
          }
        }
      }
    });

    return weddings.map((w) => {
      const totalTasks = w.tasks.length;
      const completedTasks = w.tasks.filter((t) => t.stage === "DONE").length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...w,
        totalTasks,
        completedTasks,
        progressPercent
      };
    });
  }

  /**
   * Get single wedding dossier with days, schedule, and tasks
   */
  async getWeddingById(id: string): Promise<Wedding | null> {
    return this.prisma.wedding.findUnique({
      where: { id },
      include: {
        couple: {
          include: { serviceAgreement: true }
        },
        days: {
          orderBy: { dayNumber: "asc" },
          include: {
            schedules: {
              orderBy: { startTime: "asc" },
              include: { coordinator: true }
            }
          }
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          include: { assignedTo: true }
        },
        incidents: {
          orderBy: { reportedAt: "desc" }
        }
      }
    });
  }

  /**
   * List tasks for a wedding with stage, priority, and assignment filters
   */
  async listTasks(
    weddingId: string,
    filter?: { stage?: string; priority?: string; category?: string; assignedToId?: string }
  ): Promise<Task[]> {
    const where: any = { weddingId };

    if (filter?.stage && filter.stage !== "ALL") where.stage = filter.stage;
    if (filter?.priority && filter.priority !== "ALL") where.priority = filter.priority;
    if (filter?.category && filter.category !== "ALL") where.category = filter.category;
    if (filter?.assignedToId) where.assignedToId = filter.assignedToId;

    return this.prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      include: { assignedTo: true }
    });
  }

  /**
   * Update task stage, priority, assignee, or due date
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    const data: any = {};
    if (input.stage) data.stage = input.stage;
    if (input.priority) data.priority = input.priority;
    if (input.assignedToId !== undefined) data.assignedToId = input.assignedToId;
    if (input.dueDate) data.dueDate = new Date(input.dueDate);
    if (input.title) data.title = input.title.trim();

    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: { assignedTo: true }
    });
  }

  /**
   * Add a custom bespoke milestone task to a wedding
   */
  async createCustomTask(input: CreateCustomTaskInput): Promise<Task> {
    const templateKey = `CUSTOM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return this.prisma.task.create({
      data: {
        weddingId: input.weddingId,
        templateKey,
        title: input.title.trim(),
        category: input.category,
        stage: "TO_PLAN",
        priority: input.priority || "MEDIUM",
        dueDate: new Date(input.dueDate),
        assignedToId: input.assignedToId,
        isCustom: true
      },
      include: { assignedTo: true }
    });
  }

  /**
   * Re-run task verification and backfill missing templates
   */
  async triggerTaskBackfill(weddingId: string): Promise<any> {
    const wedding = await this.prisma.wedding.findUniqueOrThrow({
      where: { id: weddingId }
    });
    return executeTaskGenerationWithTargetedRetry(this.prisma, wedding.id);
  }
}
