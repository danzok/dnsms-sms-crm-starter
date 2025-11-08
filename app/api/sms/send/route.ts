import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSMS, validateTwilioConfig, validatePhoneNumber } from "@/lib/twilio";
import { sendImmediateMessageSchema } from "@/lib/validations/sms";

// POST /api/sms/send - Send an immediate SMS message
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { phone, message } = sendImmediateMessageSchema.parse(body);

    // Validate phone number
    if (!validatePhoneNumber(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Send the SMS
    const result = await sendSMS(phone, message);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "SMS sent successfully",
        sid: result.sid,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send SMS",
          details: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}