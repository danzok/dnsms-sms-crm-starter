import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, messages, customers } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";
import { sendBulkSMS } from "@/lib/twilio";

// This endpoint should be secured in production with proper authentication
// For example, using cron secrets or API keys
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key";

// POST /api/cron/campaigns - Process scheduled campaigns
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron job
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting scheduled campaign processing...");

    // Find campaigns that are scheduled and ready to send
    const scheduledCampaigns = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.status, "scheduled"),
          lt(campaigns.scheduleTime, new Date())
        )
      );

    if (scheduledCampaigns.length === 0) {
      console.log("No scheduled campaigns to process");
      return NextResponse.json({
        message: "No scheduled campaigns to process",
        processed: 0,
      });
    }

    console.log(`Found ${scheduledCampaigns.length} scheduled campaigns to process`);

    const results = [];

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`Processing campaign: ${campaign.id} - ${campaign.name}`);

        // Update campaign status to sending
        await db
          .update(campaigns)
          .set({
            status: "sending",
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaign.id));

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
              eq(messages.campaignId, campaign.id),
              eq(messages.status, "pending")
            )
          );

        if (pendingMessages.length === 0) {
          console.log(`No pending messages for campaign ${campaign.id}`);
          await db
            .update(campaigns)
            .set({
              status: "sent",
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, campaign.id));
          continue;
        }

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
          .where(eq(campaigns.id, campaign.id));

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalRecipients: pendingMessages.length,
          success: sendResults.success,
          sentCount: sendResults.results.filter(r => r.success).length,
          failedCount: sendResults.results.filter(r => !r.success).length,
        });

        console.log(`Completed processing campaign ${campaign.id}: ${sendResults.success ? "Success" : "Failed"}`);

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);

        // Mark campaign as failed
        await db
          .update(campaigns)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaign.id));

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.length - successCount;

    console.log(`Campaign processing completed. Success: ${successCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      message: "Campaign processing completed",
      processed: results.length,
      successCount,
      failedCount,
      results,
    });

  } catch (error) {
    console.error("Error in campaign processing cron job:", error);
    return NextResponse.json(
      { error: "Failed to process scheduled campaigns" },
      { status: 500 }
    );
  }
}

// GET /api/cron/campaigns - Health check for the cron endpoint
export async function GET() {
  return NextResponse.json({
    message: "Campaign processing cron endpoint is active",
    timestamp: new Date().toISOString(),
  });
}