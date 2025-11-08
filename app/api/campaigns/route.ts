import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, customers, messages } from "@/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignQuerySchema
} from "@/lib/validations/sms";
import { sendBulkSMS, validateTwilioConfig } from "@/lib/twilio";

// GET /api/campaigns - List campaigns
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = campaignQuerySchema.parse(Object.fromEntries(searchParams));

    const { status, page = 1, limit = 20 } = queryParams;
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(campaigns.userId, session.user.id)];

    if (status) {
      conditions.push(eq(campaigns.status, status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count for pagination
    const totalCount = await db
      .select({ count: campaigns.id })
      .from(campaigns)
      .where(whereClause);

    // Get campaigns with pagination
    const campaignsList = await db
      .select()
      .from(campaigns)
      .where(whereClause)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      campaigns: campaignsList,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Create a new campaign
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
    const campaignData = createCampaignSchema.parse(body);

    const newCampaign = {
      ...campaignData,
      id: nanoid(),
      userId: session.user.id,
      status: campaignData.scheduleTime ? "scheduled" : "draft",
    };

    const [insertedCampaign] = await db
      .insert(campaigns)
      .values(newCampaign)
      .returning();

    // If customerIds are provided, create message records
    if (campaignData.customerIds && campaignData.customerIds.length > 0) {
      // Get customers for the provided IDs
      const selectedCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.userId, session.user.id),
            // Note: In a real implementation, you'd want to use 'in' operator
            // This is simplified for the example
          )
        );

      // Filter to only include customers that were requested
      const validCustomers = selectedCustomers.filter(customer =>
        campaignData.customerIds!.includes(customer.id)
      );

      // Create message records
      const messageRecords = validCustomers.map(customer => ({
        id: nanoid(),
        campaignId: insertedCampaign.id,
        customerId: customer.id,
        phone: customer.phone,
        message: campaignData.message,
        status: "pending" as const,
      }));

      if (messageRecords.length > 0) {
        await db.insert(messages).values(messageRecords);

        // Update campaign with recipient count
        await db
          .update(campaigns)
          .set({
            totalRecipients: messageRecords.length,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, insertedCampaign.id));
      }
    }
    // If targetState is provided, create message records for all customers in that state
    else if (campaignData.targetState) {
      const stateCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.userId, session.user.id),
            eq(customers.state, campaignData.targetState)
          )
        );

      const messageRecords = stateCustomers.map(customer => ({
        id: nanoid(),
        campaignId: insertedCampaign.id,
        customerId: customer.id,
        phone: customer.phone,
        message: campaignData.message,
        status: "pending" as const,
      }));

      if (messageRecords.length > 0) {
        await db.insert(messages).values(messageRecords);

        await db
          .update(campaigns)
          .set({
            totalRecipients: messageRecords.length,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, insertedCampaign.id));
      }
    }

    return NextResponse.json(insertedCampaign, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}