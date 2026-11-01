import { PrismaClient, EventSchedule, VendorCheckIn, Incident } from "@prisma/client";

export interface CreateScheduleInput {
  weddingDayId: string;
  subEvent: string;
  activityName: string;
  startTime: string | Date;
  endTime: string | Date;
  location: string;
  coordinatorId?: string;
  notes?: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  reportedBy: string;
}

export class DayOfOpsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * List all minute-by-minute schedules for a wedding grouped by day
   */
  async getSchedules(weddingId: string): Promise<EventSchedule[]> {
    return this.prisma.eventSchedule.findMany({
      where: { weddingId },
      orderBy: { startTime: "asc" },
      include: {
        coordinator: {
          select: { id: true, name: true, phone: true, role: true }
        },
        weddingDay: {
          select: { id: true, dayNumber: true, title: true, date: true }
        }
      }
    });
  }

  /**
   * Create a minute-by-minute activity schedule
   */
  async createSchedule(weddingId: string, input: CreateScheduleInput): Promise<EventSchedule> {
    const wedding = await this.prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw new Error(`Wedding "${weddingId}" not found.`);

    const start = new Date(input.startTime);
    const end = new Date(input.endTime);
    if (end < start) {
      throw new Error("Activity end time cannot precede start time.");
    }

    return this.prisma.eventSchedule.create({
      data: {
        weddingId,
        weddingDayId: input.weddingDayId,
        subEvent: input.subEvent,
        activityName: input.activityName.trim(),
        startTime: start,
        endTime: end,
        location: input.location.trim(),
        coordinatorId: input.coordinatorId,
        notes: input.notes?.trim()
      },
      include: { coordinator: true, weddingDay: true }
    });
  }

  /**
   * Delete an event schedule entry
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.prisma.eventSchedule.delete({ where: { id: scheduleId } });
  }

  /**
   * Retrieve vendor arrival radar and check-in statuses
   */
  async getVendorCheckIns(weddingId: string): Promise<any[]> {
    // Ensure all contracted wedding vendors have a check-in anchor
    await this.syncVendorCheckInAnchors(weddingId);

    const checkIns = await this.prisma.vendorCheckIn.findMany({
      where: {
        weddingVendor: { weddingId }
      },
      include: {
        weddingVendor: {
          include: {
            vendor: true
          }
        }
      },
      orderBy: { scheduledArrival: "asc" }
    });

    const now = new Date();

    // Dynamically evaluate delay flags for expected vendors
    return checkIns.map((ci) => {
      let dynamicStatus = ci.status;
      let delayMinutes = ci.delayMinutes;

      if (ci.status === "EXPECTED" && ci.scheduledArrival) {
        if (now > ci.scheduledArrival) {
          dynamicStatus = "DELAYED";
          delayMinutes = Math.floor((now.getTime() - ci.scheduledArrival.getTime()) / (1000 * 60));
        }
      }

      return {
        ...ci,
        status: dynamicStatus,
        delayMinutes
      };
    });
  }

  /**
   * Ensure check-in record exists for every contracted wedding vendor
   */
  private async syncVendorCheckInAnchors(weddingId: string): Promise<void> {
    const weddingVendors = await this.prisma.weddingVendor.findMany({
      where: { weddingId },
      include: { checkIns: true, vendor: true }
    });

    const wedding = await this.prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        days: {
          include: {
            schedules: { orderBy: { startTime: "asc" } }
          }
        }
      }
    });

    if (!wedding) return;

    for (const wv of weddingVendors) {
      if (wv.checkIns.length === 0) {
        // Category-specific arrival matching
        let scheduledArrival: Date | null = null;
        let initialStatus = "UNSCHEDULED";

        const category = wv.serviceCategory || wv.vendor.category;
        const allSchedules = wedding.days.flatMap((d) => d.schedules);

        // Find relevant schedule activity based on vendor category
        let targetSchedule = allSchedules.find((s) => {
          if (category === "CATERING") return s.activityName.toLowerCase().includes("feast") || s.activityName.toLowerCase().includes("dinner") || s.activityName.toLowerCase().includes("reception");
          if (category === "DECOR_FLORAL") return s.activityName.toLowerCase().includes("mandap") || s.activityName.toLowerCase().includes("sangeet") || s.activityName.toLowerCase().includes("decor");
          if (category === "SOUND_LIGHT" || category === "DJ_ENTERTAINMENT") return s.subEvent === "SANGEET" || s.subEvent === "BARAAT";
          if (category === "PHOTOGRAPHY") return s.subEvent === "BARAAT" || s.subEvent === "PHERAS";
          return false;
        });

        if (!targetSchedule && allSchedules.length > 0) {
          targetSchedule = allSchedules[0];
        }

        if (targetSchedule) {
          // Offsets: Decor arrives 3h before, Catering 2h before, Music/Photo 1h before
          let offsetMinutes = 60;
          if (category === "DECOR_FLORAL") offsetMinutes = 180;
          if (category === "CATERING") offsetMinutes = 120;

          scheduledArrival = new Date(targetSchedule.startTime.getTime() - offsetMinutes * 60 * 1000);
          initialStatus = "EXPECTED";
        }

        await this.prisma.vendorCheckIn.create({
          data: {
            weddingVendorId: wv.id,
            scheduledArrival,
            status: initialStatus,
            delayMinutes: 0
          }
        });
      }
    }
  }

  /**
   * Log live vendor arrival check-in
   */
  async checkInVendor(checkInId: string, checkedInBy: string, notes?: string): Promise<VendorCheckIn> {
    const checkIn = await this.prisma.vendorCheckIn.findUnique({
      where: { id: checkInId }
    });

    if (!checkIn) throw new Error(`Check-in record "${checkInId}" not found.`);

    const now = new Date();
    let delayMinutes = 0;
    if (checkIn.scheduledArrival && now > checkIn.scheduledArrival) {
      delayMinutes = Math.floor((now.getTime() - checkIn.scheduledArrival.getTime()) / (1000 * 60));
    }

    return this.prisma.vendorCheckIn.update({
      where: { id: checkInId },
      data: {
        actualArrival: now,
        status: "ARRIVED",
        delayMinutes,
        checkedInBy: checkedInBy.trim(),
        notes: notes ? `${checkIn.notes ? checkIn.notes + " | " : ""}${notes}` : checkIn.notes
      },
      include: {
        weddingVendor: {
          include: { vendor: true }
        }
      }
    });
  }

  /**
   * List incidents logged during wedding execution
   */
  async getIncidents(weddingId: string): Promise<Incident[]> {
    return this.prisma.incident.findMany({
      where: { weddingId },
      orderBy: { reportedAt: "desc" }
    });
  }

  /**
   * Log a new live operations incident
   */
  async createIncident(weddingId: string, input: CreateIncidentInput): Promise<Incident> {
    return this.prisma.incident.create({
      data: {
        weddingId,
        title: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity,
        reportedBy: input.reportedBy.trim(),
        status: "OPEN"
      }
    });
  }

  /**
   * Resolve an open operations incident
   */
  async resolveIncident(incidentId: string, resolutionNotes: string): Promise<Incident> {
    return this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionNotes: resolutionNotes.trim()
      }
    });
  }

  /**
   * Compile operations dashboard summary (roster, active delays, open incidents)
   */
  async getOperationsCockpit(weddingId: string): Promise<any> {
    const wedding = await this.prisma.wedding.findUniqueOrThrow({
      where: { id: weddingId },
      include: {
        days: {
          include: {
            schedules: {
              include: { coordinator: true },
              orderBy: { startTime: "asc" }
            }
          }
        },
        tasks: {
          include: { assignedTo: true }
        },
        incidents: true
      }
    });

    const vendorCheckIns = await this.getVendorCheckIns(weddingId);

    const onScheduleVendors = vendorCheckIns.filter((v) => v.status === "ARRIVED" || v.status === "EXPECTED").length;
    const delayedVendors = vendorCheckIns.filter((v) => v.status === "DELAYED");
    const openIncidents = wedding.incidents.filter((i) => i.status !== "RESOLVED");

    // Aggregate staff roster from assigned tasks and coordinated schedules
    const staffMap = new Map<string, { user: any; taskCount: number; scheduleCount: number }>();

    for (const t of wedding.tasks) {
      if (t.assignedTo) {
        const existing = staffMap.get(t.assignedTo.id) || { user: t.assignedTo, taskCount: 0, scheduleCount: 0 };
        existing.taskCount++;
        staffMap.set(t.assignedTo.id, existing);
      }
    }

    for (const d of wedding.days) {
      for (const s of d.schedules) {
        if (s.coordinator) {
          const existing = staffMap.get(s.coordinator.id) || { user: s.coordinator, taskCount: 0, scheduleCount: 0 };
          existing.scheduleCount++;
          staffMap.set(s.coordinator.id, existing);
        }
      }
    }

    return {
      wedding: {
        id: wedding.id,
        title: wedding.title,
        venueName: wedding.venueName,
        primaryCity: wedding.primaryCity,
        startDate: wedding.startDate,
        endDate: wedding.endDate
      },
      stats: {
        totalSchedules: wedding.days.reduce((acc, d) => acc + d.schedules.length, 0),
        onScheduleVendors,
        delayedVendorCount: delayedVendors.length,
        openIncidentCount: openIncidents.length,
        criticalIncidentCount: openIncidents.filter((i) => i.severity === "CRITICAL").length
      },
      delayedVendors,
      openIncidents,
      staffRoster: Array.from(staffMap.values())
    };
  }
}
