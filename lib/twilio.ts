import { Twilio } from 'twilio';
import { db } from '@/db';
import { messages, campaigns, customers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Twilio client initialization
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Twilio configuration
export const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
  webhookUrl: process.env.TWILIO_WEBHOOK_URL!,
};

// Phone number validation
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  // Basic validation - should start with + and have 10-15 digits
  return /^\+?\d{10,15}$/.test(cleanPhone);
}

// Format phone number for Twilio (ensure it starts with +)
export function formatPhoneNumberForTwilio(phone: string): string {
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }

  // If no country code, assume US (you can modify this based on your needs)
  if (cleanPhone.length === 10) {
    return `+1${cleanPhone}`;
  }

  // If it has a country code but no +, add it
  return `+${cleanPhone}`;
}

// Send a single SMS message
export async function sendSMS(
  to: string,
  message: string,
  campaignId?: string,
  customerId?: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const formattedTo = formatPhoneNumberForTwilio(to);

    if (!validatePhoneNumber(formattedTo)) {
      return { success: false, error: 'Invalid phone number format' };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_CONFIG.phoneNumber,
      to: formattedTo,
      statusCallback: TWILIO_CONFIG.webhookUrl,
    });

    // Update message record in database if campaignId and customerId are provided
    if (campaignId && customerId) {
      await db
        .update(messages)
        .set({
          twilioSid: result.sid,
          twilioStatus: result.status,
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messages.campaignId, campaignId),
            eq(messages.customerId, customerId)
          )
        );
    }

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update message record with error if campaignId and customerId are provided
    if (campaignId && customerId) {
      await db
        .update(messages)
        .set({
          status: 'failed',
          errorMessage,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(messages.campaignId, campaignId),
            eq(messages.customerId, customerId)
          )
        );
    }

    return { success: false, error: errorMessage };
  }
}

// Send SMS to multiple recipients (for campaigns)
export async function sendBulkSMS(
  recipients: Array<{ phone: string; customerId: string }>,
  message: string,
  campaignId: string
): Promise<{ success: boolean; results: Array<{ customerId: string; success: boolean; sid?: string; error?: string }> }> {
  const results = [];

  // Process in batches to respect rate limits
  const batchSize = 10; // Twilio rate limit is typically 1 message per second
  const delayBetweenBatches = 1000; // 1 second delay

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const batchPromises = batch.map(async (recipient) => {
      const result = await sendSMS(
        recipient.phone,
        message,
        campaignId,
        recipient.customerId
      );

      return {
        customerId: recipient.customerId,
        success: result.success,
        sid: result.sid,
        error: result.error,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Update campaign statistics
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.length - successCount;

  await db
    .update(campaigns)
    .set({
      sentCount: successCount,
      failedCount,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return { success: true, results };
}

// Get message status from Twilio
export async function getMessageStatus(messageSid: string): Promise<{
  status: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  try {
    const message = await twilioClient.messages(messageSid).fetch();

    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
    };
  } catch (error) {
    console.error('Error fetching message status:', error);
    return {
      status: 'unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process webhook updates from Twilio
export async function processTwilioWebhook(data: {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}): Promise<void> {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = data;

    // Update message record in database
    const updateData: any = {
      twilioStatus: MessageStatus,
      updatedAt: new Date(),
    };

    // Map Twilio status to our status
    switch (MessageStatus) {
      case 'delivered':
        updateData.status = 'delivered';
        updateData.deliveredAt = new Date();
        break;
      case 'failed':
      case 'undelivered':
        updateData.status = MessageStatus === 'failed' ? 'failed' : 'undelivered';
        if (ErrorCode) updateData.errorCode = ErrorCode;
        if (ErrorMessage) updateData.errorMessage = ErrorMessage;
        break;
      case 'sent':
        updateData.status = 'sent';
        updateData.sentAt = new Date();
        break;
      default:
        updateData.status = MessageStatus;
    }

    // Update the message
    const [updatedMessage] = await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.twilioSid, MessageSid))
      .returning();

    // Update campaign statistics if message was updated
    if (updatedMessage) {
      await updateCampaignStatistics(updatedMessage.campaignId);
    }
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
  }
}

// Update campaign statistics based on message statuses
async function updateCampaignStatistics(campaignId: string): Promise<void> {
  try {
    const stats = await db
      .select({
        total: { count: messages.id },
        sent: { count: messages.id },
        delivered: { count: messages.id },
        failed: { count: messages.id },
      })
      .from(messages)
      .where(eq(messages.campaignId, campaignId));

    // This is a simplified approach - in a real implementation you'd need more complex queries
    // to get accurate counts for each status
    const totalCount = await db
      .select({ count: messages.id })
      .from(messages)
      .where(eq(messages.campaignId, campaignId));

    const sentCount = await db
      .select({ count: messages.id })
      .from(messages)
      .where(and(eq(messages.campaignId, campaignId), eq(messages.status, 'sent')));

    const deliveredCount = await db
      .select({ count: messages.id })
      .from(messages)
      .where(and(eq(messages.campaignId, campaignId), eq(messages.status, 'delivered')));

    const failedCount = await db
      .select({ count: messages.id })
      .from(messages)
      .where(and(eq(messages.campaignId, campaignId), eq(messages.status, 'failed')));

    await db
      .update(campaigns)
      .set({
        totalRecipients: totalCount.length,
        sentCount: sentCount.length,
        deliveredCount: deliveredCount.length,
        failedCount: failedCount.length,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));
  } catch (error) {
    console.error('Error updating campaign statistics:', error);
  }
}

// Validate Twilio configuration
export function validateTwilioConfig(): { valid: boolean; error?: string } {
  if (!TWILIO_CONFIG.accountSid) {
    return { valid: false, error: 'TWILIO_ACCOUNT_SID is required' };
  }

  if (!TWILIO_CONFIG.authToken) {
    return { valid: false, error: 'TWILIO_AUTH_TOKEN is required' };
  }

  if (!TWILIO_CONFIG.phoneNumber) {
    return { valid: false, error: 'TWILIO_PHONE_NUMBER is required' };
  }

  if (!TWILIO_CONFIG.webhookUrl) {
    return { valid: false, error: 'TWILIO_WEBHOOK_URL is required' };
  }

  return { valid: true };
}

// Get Twilio account information
export async function getTwilioAccountInfo() {
  try {
    const account = await twilioClient.api.accounts(TWILIO_CONFIG.accountSid).fetch();

    return {
      accountSid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
      dateCreated: account.dateCreated,
      type: account.type,
    };
  } catch (error) {
    console.error('Error fetching Twilio account info:', error);
    throw error;
  }
}