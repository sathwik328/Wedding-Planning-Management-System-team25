import { PrismaClient } from "@prisma/client";

export interface LogTeamWorkInput {
  weddingId: string;
  userId: string;
  date: Date;
  hoursWorked: number;
  taskDescription: string;
}

export class TeamLaborService {
  constructor(private readonly prisma: PrismaClient) {}

  async listWorkLogsForWedding(weddingId: string) {
    return this.prisma.teamWorkLog.findMany({
      where: { weddingId },
      include: {
        user: true
      },
      orderBy: { date: "desc" }
    });
  }

  async recordWorkLog(data: LogTeamWorkInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId }
    });

    if (!user) {
      throw new Error(`Team member with ID "${data.userId}" not found`);
    }

    // Exact labor calculation: hoursWorked * user.hourlyRatePaise
    // To maintain integer precision: Math.round(hoursWorked * 1000) * rate / 1000n
    const hoursScaled = BigInt(Math.round(data.hoursWorked * 1000));
    const totalLaborCostPaise = (hoursScaled * user.hourlyRatePaise) / 1000n;

    return this.prisma.teamWorkLog.create({
      data: {
        weddingId: data.weddingId,
        userId: data.userId,
        date: data.date,
        hoursWorked: data.hoursWorked,
        hourlyRatePaise: user.hourlyRatePaise,
        totalLaborCostPaise,
        taskDescription: data.taskDescription
      },
      include: {
        user: true
      }
    });
  }

  async getWeddingLaborSummary(weddingId: string) {
    const logs = await this.prisma.teamWorkLog.findMany({
      where: { weddingId },
      include: { user: true }
    });

    let totalHours = 0;
    let totalLaborCostBig = 0n;

    for (const log of logs) {
      totalHours += log.hoursWorked;
      totalLaborCostBig += log.totalLaborCostPaise;
    }

    return {
      weddingId,
      totalHours,
      totalLaborCostPaise: totalLaborCostBig.toString(),
      logCount: logs.length,
      logs
    };
  }
}
