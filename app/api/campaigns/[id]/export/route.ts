import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, campaigns, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if campaign exists and belongs to user
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, params.id),
          eq(campaigns.userId, session.user.id)
        )
      )
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get detailed message data for this campaign
    const messagesData = await db
      .select({
        id: messages.id,
        customerPhone: customers.phone,
        customerName: customers.name,
        customerEmail: customers.email,
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
      .innerJoin(customers, eq(messages.customerId, customers.id))
      .where(eq(messages.campaignId, params.id))
      .orderBy(sql`messages.created_at DESC`);

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        message: campaign.message,
        targetState: campaign.targetState,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      messages: messagesData,
      exportInfo: {
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalMessages: messagesData.length,
        exportDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error exporting campaign data:", error);
    return NextResponse.json(
      { error: "Failed to export campaign data" },
      { status: 500 }
    );
  }
}