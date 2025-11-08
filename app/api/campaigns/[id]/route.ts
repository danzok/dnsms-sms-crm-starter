import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, messages, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updateCampaignSchema } from "@/lib/validations/sms";

// GET /api/campaigns/[id] - Get a specific campaign
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

    // Get message statistics for this campaign
    const messageStats = await db
      .select({
        status: messages.status,
        count: messages.id,
      })
      .from(messages)
      .where(eq(messages.campaignId, params.id));

    // Aggregate statistics
    const stats = messageStats.reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      ...campaign,
      statistics: {
        total: Object.values(stats).reduce((sum, count) => sum + count, 0),
        pending: stats.pending || 0,
        sent: stats.sent || 0,
        delivered: stats.delivered || 0,
        failed: stats.failed || 0,
        undelivered: stats.undelivered || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update a campaign
export async function PUT(
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

    const body = await request.json();
    const updateData = updateCampaignSchema.parse(body);

    // Check if campaign exists and belongs to user
    const existingCampaign = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, params.id),
          eq(campaigns.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingCampaign.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Prevent updating campaigns that are already sent or sending
    if (["sent", "sending"].includes(existingCampaign[0].status)) {
      return NextResponse.json(
        { error: "Cannot update campaign that has been sent" },
        { status: 400 }
      );
    }

    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        ...updateData,
        updatedAt: new Date(),
        // Update status based on schedule time
        status: updateData.scheduleTime ? "scheduled" : "draft",
      })
      .where(
        and(
          eq(campaigns.id, params.id),
          eq(campaigns.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error("Error updating campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete a campaign
export async function DELETE(
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
    const existingCampaign = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, params.id),
          eq(campaigns.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingCampaign.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Prevent deleting campaigns that are currently sending
    if (existingCampaign[0].status === "sending") {
      return NextResponse.json(
        { error: "Cannot delete campaign that is currently sending" },
        { status: 400 }
      );
    }

    // Delete related messages first (due to foreign key constraint)
    await db
      .delete(messages)
      .where(eq(messages.campaignId, params.id));

    // Delete the campaign
    await db
      .delete(campaigns)
      .where(
        and(
          eq(campaigns.id, params.id),
          eq(campaigns.userId, session.user.id)
        )
      );

    return NextResponse.json({ message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}