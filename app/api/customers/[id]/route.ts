import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { updateCustomerSchema } from "@/lib/validations/sms";

// GET /api/customers/[id] - Get a specific customer
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

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, params.id),
          eq(customers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update a customer
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
    const updateData = updateCustomerSchema.parse(body);

    // Check if customer exists and belongs to user
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, params.id),
          eq(customers.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingCustomer.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // If phone number is being updated, check for duplicates
    if (updateData.phone && updateData.phone !== existingCustomer[0].phone) {
      const duplicateCustomer = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.phone, updateData.phone),
            eq(customers.userId, session.user.id),
            // Exclude current customer from duplicate check
            // Note: Drizzle doesn't support neq directly, so we'll handle this in the app logic
          )
        )
        .limit(1);

      // Filter out the current customer from results
      const actualDuplicate = duplicateCustomer.filter(c => c.id !== params.id);

      if (actualDuplicate.length > 0) {
        return NextResponse.json(
          { error: "A customer with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, params.id),
          eq(customers.userId, session.user.id)
        )
      )
      .returning();

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid data", details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a customer
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

    // Check if customer exists and belongs to user
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, params.id),
          eq(customers.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingCustomer.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, params.id),
          eq(customers.userId, session.user.id)
        )
      );

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}