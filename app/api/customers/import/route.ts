import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCSVContent, validatePhoneNumbers, formatCustomerForImport } from "@/lib/utils/csv-import";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const skipDuplicates = formData.get("skipDuplicates") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: "Only CSV files are allowed" }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB" }, { status: 400 });
    }

    const csvContent = await file.text();

    // Parse CSV content
    const { validCustomers, errors } = parseCSVContent(csvContent);

    if (errors.length > 0) {
      return NextResponse.json({
        error: "CSV validation failed",
        validationErrors: errors,
        validCount: validCustomers.length,
        errorCount: errors.length,
      }, { status: 400 });
    }

    if (validCustomers.length === 0) {
      return NextResponse.json({
        error: "No valid customers found in CSV file",
        validationErrors: errors,
      }, { status: 400 });
    }

    // Extract phone numbers for validation
    const phoneNumbers = validCustomers.map(c => c.phone);
    const { valid: validPhones, invalid: invalidPhones } = validatePhoneNumbers(phoneNumbers);

    if (invalidPhones.length > 0) {
      return NextResponse.json({
        error: "Invalid phone numbers found",
        invalidPhones,
        validCount: validPhones.length,
        invalidCount: invalidPhones.length,
      }, { status: 400 });
    }

    // Check for existing phone numbers if skipDuplicates is enabled
    let customersToInsert = validCustomers;
    if (skipDuplicates) {
      const existingPhones = await db
        .select({ phone: customers.phone })
        .from(customers)
        .where(eq(customers.userId, session.user.id));

      const existingPhoneSet = new Set(existingPhones.map(c => c.phone));
      customersToInsert = validCustomers.filter(c => !existingPhoneSet.has(c.phone.replace(/[^\d+]/g, '')));
    }

    if (customersToInsert.length === 0) {
      return NextResponse.json({
        message: "No new customers to import (all duplicates)",
        imported: 0,
        skipped: validCustomers.length,
        total: validCustomers.length,
      });
    }

    // Format customers for database insertion
    const newCustomers = customersToInsert.map(customer => ({
      ...formatCustomerForImport(customer),
      id: nanoid(),
      userId: session.user.id,
    }));

    // Insert customers in batches (to handle large imports)
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < newCustomers.length; i += batchSize) {
      const batch = newCustomers.slice(i, i + batchSize);
      await db.insert(customers).values(batch);
      insertedCount += batch.length;
    }

    return NextResponse.json({
      message: "Customers imported successfully",
      imported: insertedCount,
      skipped: validCustomers.length - insertedCount,
      total: validCustomers.length,
      duplicatesSkipped: skipDuplicates ? (validCustomers.length - insertedCount) : 0,
    });

  } catch (error) {
    console.error("Error importing customers:", error);
    return NextResponse.json(
      { error: "Failed to import customers" },
      { status: 500 }
    );
  }
}