import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, messages, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendBulkSMS, validateTwilioConfig } from "@/lib/twilio";

// POST /api/campaigns/[id]/send - Launch a campaign
export async function POST(
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

    // Validate Twilio configuration
    const twilioValidation = validateTwilioConfig();
    if (!twilioValidation.valid) {
      return NextResponse.json(
        { error: "Twilio not configured", details: twilioValidation.error },
        { status: 400 }
      );
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

    // Check if campaign is in a valid state to be sent
    if (!["draft", "scheduled"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Campaign has already been sent or is currently sending" },
        { status: 400 }
      );
    }

    // Get all pending messages for this campaign
    const pendingMessages = await db
      .select({
        id: messages.id,
        phone: messages.phone,
        customerId: messages.customerId,
      })
      .from(messages)
      .where(
        and(
          eq(messages.campaignId, params.id),
          eq(messages.status, "pending")
        )
      );

    if (pendingMessages.length === 0) {
      return NextResponse.json(
        { error: "No messages to send for this campaign" },
        { status: 400 }
      );
    }

    // Update campaign status to sending
    await db
      .update(campaigns)
      .set({
        status: "sending",
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, params.id));

    try {
      // Send bulk SMS
      const sendResults = await sendBulkSMS(
        pendingMessages,
        campaign.message,
        campaign.id
      );

      // Update campaign status based on results
      const finalStatus = sendResults.success ? "sent" : "failed";
      await db
        .update(campaigns)
        .set({
          status: finalStatus,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, params.id));

      return NextResponse.json({
        message: "Campaign sent successfully",
        campaignId: campaign.id,
        totalRecipients: pendingMessages.length,
        results: sendResults.results,
      });
    } catch (sendError) {
      console.error("Error sending campaign:", sendError);

      // Update campaign status to failed
      await db
        .update(campaigns)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, params.id));

      return NextResponse.json(
        { error: "Failed to send campaign" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error launching campaign:", error);
    return NextResponse.json(
      { error: "Failed to launch campaign" },
      { status: 500 }
    );
  }
}