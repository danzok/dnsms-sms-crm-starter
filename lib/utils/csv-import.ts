import { createCustomerSchema } from "@/lib/validations/sms";

interface ParsedCustomer {
  name: string;
  phone: string;
  email?: string;
  state: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

interface ImportResult {
  validCustomers: ParsedCustomer[];
  errors: ImportError[];
}

export function parseCSVContent(csvContent: string): ImportResult {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    return {
      validCustomers: [],
      errors: [{ row: 0, field: 'file', message: 'CSV file must contain at least a header and one data row', data: null }]
    };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const validCustomers: ParsedCustomer[] = [];
  const errors: ImportError[] = [];

  // Validate required headers
  const requiredHeaders = ['name', 'phone', 'state'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

  if (missingHeaders.length > 0) {
    return {
      validCustomers: [],
      errors: [{
        row: 1,
        field: 'headers',
        message: `Missing required headers: ${missingHeaders.join(', ')}`,
        data: { headers, requiredHeaders }
      }]
    };
  }

  // Get column indices
  const nameIndex = headers.indexOf('name');
  const phoneIndex = headers.indexOf('phone');
  const emailIndex = headers.indexOf('email');
  const stateIndex = headers.indexOf('state');

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Remove quotes

    if (values.length < requiredHeaders.length) {
      errors.push({
        row: i + 1,
        field: 'format',
        message: 'Row does not have enough columns',
        data: { values: values.slice(0, 3) }
      });
      continue;
    }

    const customerData = {
      name: values[nameIndex]?.trim() || '',
      phone: values[phoneIndex]?.trim() || '',
      email: values[emailIndex]?.trim() || undefined,
      state: values[stateIndex]?.trim() || '',
    };

    // Validate the row data
    const validationResult = createCustomerSchema.safeParse(customerData);

    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();

      // Add errors for each invalid field
      Object.entries(formattedErrors).forEach(([field, error]) => {
        if (field !== '_errors' && typeof error === 'object' && error !== null && '_errors' in error) {
          errors.push({
            row: i + 1,
            field,
            message: (error as any)._errors.join(', ') || 'Invalid value',
            data: { [field]: customerData[field as keyof ParsedCustomer] }
          });
        }
      });

      continue;
    }

    validCustomers.push(validationResult.data);
  }

  return { validCustomers, errors };
}

export function validatePhoneNumbers(phoneNumbers: string[]): { valid: string[], invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  phoneNumbers.forEach(phone => {
    // Basic phone number validation - can be enhanced based on requirements
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    if (cleanPhone.length >= 10 && (cleanPhone.startsWith('+') || /^\d+$/.test(cleanPhone))) {
      valid.push(cleanPhone);
    } else {
      invalid.push(phone);
    }
  });

  return { valid, invalid };
}

export function formatCustomerForImport(customer: ParsedCustomer) {
  return {
    ...customer,
    phone: customer.phone.replace(/[^\d+]/g, ''), // Clean phone number
  };
}