import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, messages, customers } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get detailed campaign data for export
    const campaignsData = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        message: campaigns.message,
        targetState: campaigns.targetState,
        totalRecipients: campaigns.totalRecipients,
        sentCount: campaigns.sentCount,
        deliveredCount: campaigns.deliveredCount,
        failedCount: campaigns.failedCount,
        scheduleTime: campaigns.scheduleTime,
        createdAt: campaigns.createdAt,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(and(
        eq(campaigns.userId, session.user.id),
        gte(campaigns.createdAt, startDate)
      ))
      .orderBy(sql`created_at DESC`);

    // Calculate success rates for campaigns
    const campaignsWithSuccessRate = campaignsData.map(campaign => ({
      ...campaign,
      successRate: campaign.totalRecipients > 0
        ? (campaign.deliveredCount / campaign.totalRecipients) * 100
        : 0,
    }));

    // Get detailed message data for export
    const messagesData = await db
      .select({
        id: messages.id,
        campaignId: messages.campaignId,
        campaignName: campaigns.name,
        customerPhone: customers.phone,
        customerName: customers.name,
        customerState: customers.state,
        message: messages.message,
        status: messages.status,
        twilioSid: messages.twilioSid,
        twilioStatus: messages.twilioStatus,
        errorCode: messages.errorCode,
        errorMessage: messages.errorMessage,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .innerJoin(customers, eq(messages.customerId, customers.id))
      .where(and(
        eq(campaigns.userId, session.user.id),
        gte(messages.createdAt, startDate)
      ))
      .orderBy(sql`messages.created_at DESC`);

    return NextResponse.json({
      campaigns: campaignsWithSuccessRate,
      messages: messagesData,
      exportInfo: {
        timeRange,
        startDate,
        endDate: now,
        totalCampaigns: campaignsWithSuccessRate.length,
        totalMessages: messagesData.length,
      },
    });
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}