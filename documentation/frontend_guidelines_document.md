# Frontend Guideline Document

This document outlines the frontend setup for the DNsms SMS-CRM Starter project. It covers the architecture, design principles, styling, component structure, state management, routing, performance, testing, and a final summary. By following these guidelines, anyone on the team can understand how the frontend works and build new features consistently.

## 1. Frontend Architecture

### Frameworks and Libraries
- **Next.js (App Router)**: Handles page routing, server-side rendering, and API routes all in one. We use Server Components for data fetching and Client Components for interactive UI.
- **TypeScript**: Provides type safety for JavaScript code, reducing bugs and improving developer experience.
- **Tailwind CSS**: A utility-first CSS framework for rapid and consistent styling.
- **shadcn/ui**: A library of prebuilt, accessible React components styled with Tailwind.
- **Better Auth**: Manages user signup, login, and session security out of the box.
- **Drizzle ORM**: A type-safe way to define database schemas and run SQL queries against PostgreSQL.
- **Docker & Docker Compose**: Standardize the local dev environment (Node.js and PostgreSQL) so setup is quick and consistent.

### Scalability, Maintainability, Performance
- **Modular File Structure**: Separates pages (`/app`), reusable UI (`/components`), business logic (`/lib`), and database schemas (`/db`). This clear separation makes it easy to locate and extend functionality.
- **Server vs. Client Components**: Leverages Next.js’s built-in code splitting. Only the interactive parts of the UI load extra JavaScript, keeping initial loads fast.
- **Type Safety**: TypeScript plus Drizzle ORM helps catch errors early, so large teams can work confidently without breaking shared code.
- **Containerization**: Ensures everyone runs the same versions of Node.js and PostgreSQL, which prevents environment drift and deployment surprises.

## 2. Design Principles

### Usability
- Keep interfaces simple and intuitive—labels, buttons, and navigation should be straightforward.
- Guide users step by step (e.g., wizard-style campaign creation).

### Accessibility
- Use semantic HTML elements and ARIA attributes where needed.
- All interactive elements (buttons, links, form fields) are keyboard-navigable.
- Maintain proper color contrast for text and UI elements.

### Responsiveness
- Mobile-first approach: design components to adapt to small screens first, then enhance for larger screens.
- Use Tailwind’s responsive utilities (`sm:`, `md:`, `lg:`) to adjust layouts.

### Consistency
- Reuse UI components from shadcn/ui and custom components to ensure a uniform look and behavior.
- Follow established naming and styling conventions (see Component Structure and Styling sections).

## 3. Styling and Theming

### Styling Approach
- **Utility-First**: We use Tailwind CSS for styling. This minimizes custom CSS and keeps styles co-located in the markup.
- **Component Library**: shadcn/ui components come pre-styled with Tailwind, ensuring accessibility and consistency.
- **Custom CSS**: For edge cases, we add CSS in dedicated files or via Tailwind’s `@apply` directive in SCSS/Tailwind config.

### Theming
- **Tailwind Config** (`tailwind.config.js`): Central place to define and override colors, fonts, and other design tokens.
- **CSS Variables**: For dynamic theming (dark/light mode), define root variables and toggle with a small JS utility.

### Visual Style
- **Style**: Modern flat design with subtle shadows and clean borders.
- **Glassmorphism**: Used sparingly on cards for visual depth (e.g., dashboard widgets).

### Color Palette
- Primary: `#3B82F6` (blue)
- Secondary: `#9333EA` (purple)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (yellow)
- Danger: `#EF4444` (red)
- Background: `#F3F4F6` (light gray)
- Surface: `#FFFFFF` (white)
- Text Primary: `#111827` (dark gray)
- Text Secondary: `#6B7280` (gray)

### Fonts
- Primary Font: **Inter** (clean, highly legible for UI)
- Font Weights: 400 (regular), 500 (medium), 700 (bold)

## 4. Component Structure

### Organization
- `/components/ui`: Low-level, reusable UI pieces (buttons, form fields, modals).
- `/components/dashboard`: Higher-level composites used in the dashboard (CustomerTable, CampaignWizard).
- `/components/shared`: Utility components shared across pages (Layout, Header, Sidebar).

### Reusability
- Each component has its own folder with:
  - `Component.tsx` (the React code)
  - `Component.test.tsx` (unit tests)
  - `styles.css` or inline Tailwind classes
- Follow the **Single Responsibility Principle**: a component should do one thing well.

### Benefits
- Makes it easy to find, update, and reuse pieces of UI.
- Reduces duplication and inconsistency across the app.

## 5. State Management

### Client State
- **React Context API**: For global data like user session, theme, and notifications.
- **useState / useReducer**: For local state inside components (form fields, modals).

### Server State / Data Fetching
- **Next.js Server Components**: Fetch data in server code when rendering pages for public and authenticated data.
- **SWR or React Query (optional)**: For client-side data fetching, caching, and synchronization, especially when polling or mutating data (e.g., live analytics).

### Flow
1. User logs in → session stored in Context.
2. Dashboard page fetches customers and campaigns on the server.
3. Interactive components use mutations (via API routes) and update SWR/React Query caches for instant UI feedback.

## 6. Routing and Navigation

### File-Based Routing
- **/app/page.tsx**: Home or redirect to `/sign-in` if not authenticated.
- **/app/sign-in**, **/app/sign-up**: Authentication pages.
- **/app/dashboard**: Protected root for all CRM features.
- **Nested routes**: `/app/dashboard/customers`, `/app/dashboard/campaigns`, `/app/dashboard/analytics`.

### Linking and Guards
- Use Next.js `<Link>` for client-side navigation.
- Protect routes with a server middleware or client guard that checks session from Better Auth and redirects to sign-in if needed.

## 7. Performance Optimization

### Built-In Next.js
- **Image Optimization**: `next/image` for responsive and lazy-loaded images.
- **Automatic Code Splitting**: Only loads the JS needed for each page.
- **Server Components**: Reduce client bundle size by keeping static or data-fetching parts on the server.

### Tailwind CSS
- **PurgeCSS**: Removes unused CSS classes in production, keeping the final CSS bundle small.

### Additional Strategies
- **Dynamic Imports**: Load heavy components (e.g., charts) lazily with `React.lazy` or Next.js `dynamic()`.
- **Caching and CDN**: Serve static assets via a CDN and set proper cache headers.
- **Pre-fetching**: Use Next.js Link prefetch to load code for off-screen routes when idle.

## 8. Testing and Quality Assurance

### Unit Testing
- **Jest** + **React Testing Library** for components and utility functions.
- Test pure functions, component rendering, and user interactions in isolation.

### Integration Testing
- Test API routes and database interactions with a test database (in Docker) using Drizzle.
- Mock external services like Twilio to simulate various responses.

### End-to-End (E2E) Testing
- **Playwright** or **Cypress** to automate flows:
  - Sign up / sign in
  - Customer import
  - Campaign creation and sending (mocked Twilio)
  - Analytics dashboard visualization

### Code Quality
- **ESLint** with TypeScript rules and Next.js plugin.
- **Prettier** for consistent code formatting.
- **Husky** + **lint-staged** to run linters on staged files before commits.

## 9. Conclusion and Overall Frontend Summary

This guideline covers the core aspects of the DNsms frontend: a scalable Next.js architecture, clear design principles, a utility-first styling approach, a systematic component hierarchy, flexible state management, intuitive routing, performance best practices, and a robust testing strategy.

By following these guidelines, you ensure that the frontend remains maintainable, performant, and user-friendly as the DNsms application grows. The combination of Next.js, TypeScript, Tailwind, shadcn/ui, Better Auth, and Drizzle ORM provides a strong foundation. The clear separation of concerns and consistent patterns make it easy for any developer—even without prior experience in the codebase—to contribute safely and effectively.