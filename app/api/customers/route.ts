import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";
import {
  createCustomerSchema,
  updateCustomerSchema,
  importCustomersSchema,
  customerQuerySchema
} from "@/lib/validations/sms";

// GET /api/customers - List and search customers
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = customerQuerySchema.parse(Object.fromEntries(searchParams));

    const { search, state, page = 1, limit = 20 } = queryParams;
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(customers.userId, session.user.id)];

    if (search) {
      conditions.push(
        ilike(customers.name, `%${search}%`)
      );
    }

    if (state) {
      conditions.push(eq(customers.state, state));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Get total count for pagination
    const totalCount = await db
      .select({ count: customers.id })
      .from(customers)
      .where(whereClause);

    // Get customers with pagination
    const customersList = await db
      .select()
      .from(customers)
      .where(whereClause)
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      customers: customersList,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Handle both single customer creation and bulk import
    if (body.customers && Array.isArray(body.customers)) {
      // Bulk import
      const importData = importCustomersSchema.parse(body);
      const { customers: customersData, skipDuplicates } = importData;

      // Check for existing phone numbers if skipDuplicates is true
      let customersToInsert = customersData;
      if (skipDuplicates) {
        const existingPhones = await db
          .select({ phone: customers.phone })
          .from(customers)
          .where(eq(customers.userId, session.user.id));

        const existingPhoneSet = new Set(existingPhones.map(c => c.phone));
        customersToInsert = customersData.filter(c => !existingPhoneSet.has(c.phone));
      }

      if (customersToInsert.length === 0) {
        return NextResponse.json({
          message: "No new customers to import",
          imported: 0,
          skipped: customersData.length,
        });
      }

      const newCustomers = customersToInsert.map(customer => ({
        ...customer,
        id: nanoid(),
        userId: session.user.id,
      }));

      await db.insert(customers).values(newCustomers);

      return NextResponse.json({
        message: "Customers imported successfully",
        imported: newCustomers.length,
        skipped: customersData.length - newCustomers.length,
      });
    } else {
      // Single customer creation
      const customerData = createCustomerSchema.parse(body);

      // Check for existing phone number
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.phone, customerData.phone),
            eq(customers.userId, session.user.id)
          )
        )
        .limit(1);

      if (existingCustomer.length > 0) {
        return NextResponse.json(
          { error: "A customer with this phone number already exists" },
          { status: 409 }
        );
      }

      const newCustomer = {
        ...customerData,
        id: nanoid(),
        userId: session.user.id,
      };

      const [insertedCustomer] = await db
        .insert(customers)
        .values(newCustomer)
        .returning();

      return NextResponse.json(insertedCustomer, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}