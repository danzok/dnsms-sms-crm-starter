# App Flow Document

## Onboarding and Sign-In/Sign-Up

When a brand-new user first arrives at the DNsms application, they land on a simple public landing page that briefly describes the core features and offers prominent buttons to sign up or sign in. If the user chooses to create a new account, they are directed to the sign-up page, where they enter their email address, choose a password, and confirm the password. They then click the register button, which creates their account and sends a verification email. Once the email is verified, the user gains full access to the platform. Existing users click the sign-in link and provide their email and password. If they forget their password, they use the “Forgot Password” link to request a reset email, receive a time-limited link, and set a new password on the reset page. After successful sign-in, the system creates a secure session and redirects the user to the main dashboard. At any point, users can sign out by clicking their avatar in the header and selecting the sign-out action, which ends the session and returns them to the sign-in page.

## Main Dashboard or Home Page

Once a user logs in, they arrive at the dashboard home page, which features a persistent sidebar on the left and a header across the top. The sidebar lists links labeled Dashboard, Customers, Campaigns, Analytics, and Settings. The header shows the application logo on the left and the user’s avatar or name on the right. In the main content area, users first see the dashboard overview, which presents summary cards for total customers, active campaigns, messages sent today, and recent activity. Each summary card is interactive, allowing the user to click to drill down into the relevant section. The sidebar remains visible on all internal pages, providing consistent navigation. From this main dashboard, users move to customer management, campaign workflows, analytics pages, or settings simply by clicking the corresponding sidebar link.

## Detailed Feature Flows and Page Transitions

### Customer Management

When the user selects Customers from the sidebar, they are taken to the customer list page, which displays a searchable, paginated table of imported or manually added contacts. From here, the user can click an Add Customer button to open a new customer form page. On that form, they enter the contact’s name, phone number, optional email, and any tags or group labels, then submit to save the record and return to the updated list. Alternatively, the user can click an Import CSV button to upload a CSV file. After selecting a file, the app displays a mapping preview page where each column is matched to a customer field. The user confirms the mapping, clicks import, and then sees a success screen that lists how many records were added or flagged with errors. To edit an existing contact, the user clicks the table row, navigates to the customer detail page, updates fields in an edit form, and saves changes. Deletion is handled through a confirmation dialog on the detail page before the contact is removed.

### Campaign Creation and Execution

Clicking Campaigns in the sidebar navigates the user to a page showing existing campaigns with their current status. To create a new campaign, the user clicks New Campaign and enters a name and message body in a first step. The app supports message templating by allowing placeholders like {{customer_name}}. After writing the message, the user proceeds to the recipient selection step, where they choose one or more customer segments or individual contacts. The next step is scheduling: the user selects Send Now or Schedule for Later, and if scheduling, picks a future date and time. A final review page summarizes the campaign details, recipients, and schedule, and the user confirms by clicking Launch Campaign. Behind the scenes, the app calls a campaign API route that either enqueues a background job or directly invokes the Twilio service module to send messages. Upon successful initiation, the user is redirected back to the campaign list, where the new campaign appears with a status such as Pending, Sending, or Scheduled.

### Twilio Webhook Handling

After sending begins, Twilio posts delivery updates to a webhook endpoint in the application. The app receives each status callback, verifies the Twilio signature for security, and updates the corresponding message record in the database. Users monitoring a campaign can click on a campaign in the list, which takes them to a detailed campaign report page. That page displays charts and a delivery log table that fetch up-to-date status information for each message, including timestamps for sent, delivered, or failed events.

### Analytics Flow

From the sidebar, selecting Analytics brings the user to a page of visual reports. The page contains interactive charts showing metrics such as total messages sent over time, delivery rates, and failure reasons. The user can adjust a date range filter at the top, select specific campaigns to compare, and export the chart data as CSV. When a user hovers over a data point or clicks a bar, they see detailed tooltip information or navigate to a list of messages matching that metric.

### Admin and Advanced Workflows

If the signed-in user holds an administrator role, an additional Admin link appears in the sidebar. Clicking Admin directs the user to a user management panel where they can invite new team members by email, assign roles, deactivate existing accounts, or view audit logs. Premium or enterprise customers may see a Teams section where they manage workspace settings and member permissions.

## Settings and Account Management

The Settings section lives under the sidebar and opens to a profile page where users update their display name, email address, and password. A secondary tab labeled Notifications allows users to toggle on or off email alerts for campaign milestones or system updates. If the application is configured with billing, a Billing tab shows the current subscription plan, next billing date, and credit card details. Users can update payment information, change plans, or view past invoices. Saving changes in any settings area returns the user to the settings overview or, if they choose, they can navigate back to the main dashboard via the sidebar.

## Error States and Alternate Paths

When a user submits invalid data in any form—such as an improperly formatted phone number or missing required field—the app highlights the field in error and displays a concise validation message below it. During sign-in, if the credentials are incorrect, the signature box shows an error prompt. If the password reset token is expired or invalid, the user sees a message that the link has expired and a prompt to request a new reset. If the Twilio API returns an error during sending—due to invalid credentials or insufficient account balance—a failure notification appears on the campaign review page or in a toast message, and each affected message record is marked with the error reason. Should the user lose network connectivity, a banner appears at the top of the screen indicating they are offline and disables further form submissions until connectivity is restored. Attempting to access protected routes without authentication triggers an automatic redirect to the sign-in page. Unauthorized attempts to reach admin pages display an Access Denied page with a link back to the dashboard.

## Conclusion and Overall App Journey

From their very first visit to the landing page through every subsequent step, the user experience guides the DNsms user smoothly through account creation, authentication, and into a unified dashboard where they manage customer data, build and schedule SMS campaigns, and analyze performance. Settings and billing controls ensure users can tailor their account preferences and payment options at any time, while built-in validation and error handling keep the workflow clear and safe. Administrators and advanced users benefit from dedicated management panels. Together, these interconnected pages and flows form a seamless journey from onboarding to daily usage goals such as sending high-impact messages, monitoring campaign success, and maintaining accurate customer information.