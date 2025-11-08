import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, messages, customers } from "@/db/schema";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

interface AnalyticsQuery {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

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

    // Get overview statistics
    const [totalCampaignsResult] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(eq(campaigns.userId, session.user.id));

    const [activeCampaignsResult] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.userId, session.user.id),
          sql`status IN ('sending', 'scheduled')`
        )
      );

    const [totalCustomersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.userId, session.user.id));

    const [totalMessagesResult] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .where(eq(campaigns.userId, session.user.id));

    const [deliveredMessagesResult] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .where(
        and(
          eq(campaigns.userId, session.user.id),
          eq(messages.status, "delivered")
        )
      );

    const totalMessages = totalMessagesResult.count;
    const deliveredMessages = deliveredMessagesResult.count;
    const successRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

    // Get campaign performance data
    const campaignsData = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        status: campaigns.status,
        totalRecipients: campaigns.totalRecipients,
        sentCount: campaigns.sentCount,
        deliveredCount: campaigns.deliveredCount,
        failedCount: campaigns.failedCount,
        createdAt: campaigns.createdAt,
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

    // Get state-wise analytics
    const stateAnalytics = await db
      .select({
        state: customers.state,
        customers: count(customers.id),
        campaigns: count(campaigns.id),
        messages: count(messages.id),
        deliveredMessages: count(sql`CASE WHEN ${messages.status} = 'delivered' THEN 1 END`),
      })
      .from(customers)
      .leftJoin(campaigns, eq(customers.state, campaigns.targetState))
      .leftJoin(messages, eq(campaigns.id, messages.campaignId))
      .where(and(
        eq(customers.userId, session.user.id),
        gte(customers.createdAt, startDate)
      ))
      .groupBy(customers.state)
      .orderBy(sql`customers DESC`);

    const stateAnalyticsWithSuccessRate = stateAnalytics.map(state => ({
      state: state.state,
      customers: state.customers,
      campaigns: state.campaigns || 0,
      messages: state.messages || 0,
      successRate: state.messages > 0 ? (state.deliveredMessages / state.messages) * 100 : 0,
    }));

    // Get time series data (daily)
    const timeSeriesData = await db
      .select({
        date: sql`DATE(${campaigns.createdAt})::text`.as("date"),
        campaigns: count(campaigns.id),
        messages: count(messages.id),
        deliveredMessages: count(sql`CASE WHEN ${messages.status} = 'delivered' THEN 1 END`),
      })
      .from(campaigns)
      .leftJoin(messages, eq(campaigns.id, messages.campaignId))
      .where(and(
        eq(campaigns.userId, session.user.id),
        gte(campaigns.createdAt, startDate)
      ))
      .groupBy(sql`DATE(${campaigns.createdAt})`)
      .orderBy(sql`DATE(${campaigns.createdAt})`);

    const timeSeriesDataWithSuccessRate = timeSeriesData.map(day => ({
      date: day.date,
      campaigns: day.campaigns,
      messages: day.messages || 0,
      successRate: day.messages > 0 ? (day.deliveredMessages / day.messages) * 100 : 0,
    }));

    // Get message status distribution
    const messageStatusData = await db
      .select({
        status: messages.status,
        count: count(messages.id),
      })
      .from(messages)
      .innerJoin(campaigns, eq(messages.campaignId, campaigns.id))
      .where(and(
        eq(campaigns.userId, session.user.id),
        gte(messages.createdAt, startDate)
      ))
      .groupBy(messages.status);

    const totalStatusMessages = messageStatusData.reduce((sum, status) => sum + status.count, 0);
    const messageStatusWithPercentage = messageStatusData.map(status => ({
      status: status.status,
      count: status.count,
      percentage: totalStatusMessages > 0 ? (status.count / totalStatusMessages) * 100 : 0,
    }));

    const analyticsData = {
      overview: {
        totalCampaigns: totalCampaignsResult.count,
        totalMessages,
        totalCustomers: totalCustomersResult.count,
        successRate,
        activeCampaigns: activeCampaignsResult.count,
      },
      campaigns: campaignsWithSuccessRate,
      stateAnalytics: stateAnalyticsWithSuccessRate,
      timeSeriesData: timeSeriesDataWithSuccessRate,
      messageStatusData: messageStatusWithPercentage,
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}