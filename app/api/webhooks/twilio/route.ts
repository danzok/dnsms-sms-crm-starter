import { NextRequest, NextResponse } from "next/server";
import { processTwilioWebhook } from "@/lib/twilio";

// POST /api/webhooks/twilio - Handle Twilio status callbacks
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract webhook data from Twilio
    const webhookData = {
      MessageSid: formData.get("MessageSid") as string,
      MessageStatus: formData.get("MessageStatus") as string,
      ErrorCode: formData.get("ErrorCode") as string,
      ErrorMessage: formData.get("ErrorMessage") as string,
    };

    if (!webhookData.MessageSid || !webhookData.MessageStatus) {
      return NextResponse.json(
        { error: "Missing required webhook data" },
        { status: 400 }
      );
    }

    // Process the webhook update
    await processTwilioWebhook(webhookData);

    // Return a 200 OK response to Twilio
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error processing Twilio webhook:", error);
    // Still return 200 to Twilio to avoid retries, but log the error
    return new NextResponse(null, { status: 200 });
  }
}