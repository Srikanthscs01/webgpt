import { PrismaClient, SiteStatus, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const SITE_KEY = 'ezypharma-pos';

// Comprehensive content about PharmaCare/EzyPharma POS
const EZYPHARMA_CONTENT = [
  {
    url: 'https://ezypharma.vercel.app/overview',
    title: 'PharmaCare POS Overview',
    content: `PharmaCare POS is a comprehensive Pharmacy Management System designed for modern pharmacies. It provides an all-in-one solution for managing pharmacy operations including point of sale, inventory management, customer management, sales tracking, and reporting. The system is cloud-based and accessible from any device with an internet connection. Key features include real-time inventory tracking, prescription management, customer loyalty programs, and detailed analytics.`,
    headingPath: 'Overview',
  },
  {
    url: 'https://ezypharma.vercel.app/pos',
    title: 'Point of Sale (POS)',
    content: `The PharmaCare POS module allows pharmacists to quickly process sales transactions. Features include barcode scanning for fast product lookup, automatic price calculation, multiple payment methods (cash, card, digital wallets), receipt printing, and customer lookup. The POS interface is designed for speed and efficiency, with quick-add buttons for common items. It supports split payments, discounts, returns, and refunds. Tax calculations are automatic based on product categories.`,
    headingPath: 'POS',
  },
  {
    url: 'https://ezypharma.vercel.app/inventory',
    title: 'Inventory Management',
    content: `PharmaCare provides powerful inventory management capabilities. Track stock levels in real-time, set reorder points for automatic low-stock alerts, manage multiple suppliers, and track batch numbers and expiry dates. The system supports barcode scanning for quick stock counts. Features include: product categories, SKU management, cost tracking, markup calculation, stock transfer between locations, and inventory valuation reports. Expiring medications are highlighted automatically to prevent waste.`,
    headingPath: 'Inventory',
  },
  {
    url: 'https://ezypharma.vercel.app/products',
    title: 'Product Management',
    content: `Manage your pharmacy products with ease. Add new products with details like name, SKU, barcode, category, cost price, selling price, tax rate, and supplier. Support for different unit types (tablets, bottles, boxes, strips). Track generic and brand name medications. Set up product variants for different strengths and pack sizes. Import products in bulk using CSV files. Product images can be uploaded for easy identification. Search products by name, barcode, category, or supplier.`,
    headingPath: 'Products',
  },
  {
    url: 'https://ezypharma.vercel.app/customers',
    title: 'Customer Management',
    content: `Build strong customer relationships with the customer management module. Store customer details including name, phone, email, address, and purchase history. Track customer prescriptions and medication history. Set up customer loyalty programs with points accumulation. Send SMS and email notifications for prescription refills. View customer purchase patterns and spending analytics. Manage customer credit accounts and outstanding balances. Search customers by name, phone number, or prescription ID.`,
    headingPath: 'Customers',
  },
  {
    url: 'https://ezypharma.vercel.app/prescriptions',
    title: 'Prescription Management',
    content: `Handle prescriptions efficiently with PharmaCare. Enter prescription details including doctor name, patient information, medications, dosage, and refill count. Track prescription status (pending, filled, partially filled, expired). Set up automatic refill reminders. Store prescription images for reference. Check drug interactions and allergies. Print prescription labels with dosage instructions. Manage controlled substances with proper logging and compliance reporting.`,
    headingPath: 'Prescriptions',
  },
  {
    url: 'https://ezypharma.vercel.app/sales',
    title: 'Sales Tracking',
    content: `Monitor your pharmacy sales with comprehensive sales tracking. View daily, weekly, monthly, and yearly sales summaries. Track sales by product, category, customer, and staff member. Analyze best-selling products and slow-moving items. View hourly sales patterns to optimize staffing. Track gross profit margins and profitability by product. Export sales data to Excel or PDF. Compare sales performance across different time periods. Real-time sales dashboard with key metrics.`,
    headingPath: 'Sales',
  },
  {
    url: 'https://ezypharma.vercel.app/reports',
    title: 'Reports & Analytics',
    content: `Generate detailed reports for business insights. Available reports include: Daily Sales Summary, Inventory Valuation, Stock Movement, Expiry Report, Customer Purchase History, Staff Performance, Profit & Loss, Tax Report, Supplier Payment Report, and Low Stock Alert. Reports can be filtered by date range, category, supplier, or custom criteria. Export reports to PDF, Excel, or CSV format. Schedule automated reports to be emailed daily or weekly. Custom report builder for specific needs.`,
    headingPath: 'Reports',
  },
  {
    url: 'https://ezypharma.vercel.app/suppliers',
    title: 'Supplier Management',
    content: `Manage your pharmacy suppliers effectively. Store supplier contact details, payment terms, and product catalogs. Track purchase orders and delivery status. Manage supplier invoices and payments. Compare prices across suppliers for best deals. View supplier performance metrics including delivery time and order accuracy. Set preferred suppliers for automatic reorder suggestions. Import supplier catalogs for easy product matching.`,
    headingPath: 'Suppliers',
  },
  {
    url: 'https://ezypharma.vercel.app/purchase-orders',
    title: 'Purchase Orders',
    content: `Streamline your purchasing with the purchase order module. Create purchase orders from low-stock alerts or manually. Add products with quantities and expected prices. Send purchase orders to suppliers via email. Track order status (draft, sent, partially received, completed). Receive goods against purchase orders with quantity verification. Handle partial deliveries and backorders. Automatic cost price updates when goods are received.`,
    headingPath: 'Purchase Orders',
  },
  {
    url: 'https://ezypharma.vercel.app/staff',
    title: 'Staff Management',
    content: `Manage your pharmacy staff with role-based access control. Create user accounts for pharmacists, cashiers, and managers. Assign permissions based on job role - cashiers can only process sales, while managers can view reports and modify settings. Track staff login times and activity logs. View individual staff sales performance. Set up staff commissions and targets. Manage shift schedules and attendance.`,
    headingPath: 'Staff',
  },
  {
    url: 'https://ezypharma.vercel.app/settings',
    title: 'Settings & Configuration',
    content: `Configure PharmaCare POS to match your pharmacy needs. Settings include: Store information (name, address, phone, logo), Tax rates and rules, Receipt customization, Payment methods, Low stock thresholds, Notification preferences, Backup settings, and Integration configurations. Set up multiple store locations with centralized management. Configure printer settings for receipts and labels. Customize invoice templates with your branding.`,
    headingPath: 'Settings',
  },
  {
    url: 'https://ezypharma.vercel.app/billing',
    title: 'Billing & Invoicing',
    content: `Generate professional invoices and manage billing. Create invoices for credit customers with payment terms. Track outstanding payments and send payment reminders. Accept partial payments and track payment history. Generate statements for credit customers. Support for different invoice formats (retail, wholesale). Apply discounts at invoice or line item level. Manage GST/tax invoices with proper compliance.`,
    headingPath: 'Billing',
  },
  {
    url: 'https://ezypharma.vercel.app/dashboard',
    title: 'Dashboard Overview',
    content: `The PharmaCare dashboard provides a quick overview of your pharmacy business. Key metrics displayed include: Today's Sales, Weekly Revenue, Monthly Profit, Pending Orders, Low Stock Items, Expiring Products, Customer Count, and Recent Transactions. Interactive charts show sales trends, top products, and category performance. Quick action buttons for common tasks like new sale, add product, or generate report. Notifications for important alerts and reminders.`,
    headingPath: 'Dashboard',
  },
  {
    url: 'https://ezypharma.vercel.app/help',
    title: 'Help & Support',
    content: `Get help with PharmaCare POS. Access the user manual and video tutorials for all features. Contact support via email or live chat during business hours. Browse frequently asked questions for quick answers. Report issues or suggest new features. Training resources available for new staff. Regular webinars on best practices and new feature updates. Community forum for discussing tips with other pharmacy owners.`,
    headingPath: 'Help & Support',
  },
  {
    url: 'https://ezypharma.vercel.app/login',
    title: 'Getting Started',
    content: `To get started with PharmaCare POS, sign in with your email and password at the login page. New users can sign up for a free trial. After logging in, you'll be directed to the dashboard. First-time setup includes: entering your pharmacy details, adding products to inventory, setting up staff accounts, configuring payment methods, and customizing receipts. The setup wizard guides you through each step. Import existing product data from spreadsheets to save time.`,
    headingPath: 'Login',
  },
];

async function main() {
  console.log('\n🚀 Adding EzyPharma/PharmaCare POS Content\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) throw new Error('No workspace');

  // Get or create site
  let site = await prisma.site.findUnique({ where: { siteKey: SITE_KEY } });

  if (!site) {
    site = await prisma.site.create({
      data: {
        workspaceId: workspace.id,
        name: 'EzyPharma POS',
        domain: 'ezypharma.vercel.app',
        baseUrl: 'https://ezypharma.vercel.app',
        siteKey: SITE_KEY,
        status: SiteStatus.CRAWLING,
        crawlConfig: {},
      },
    });
  } else {
    await prisma.chunk.deleteMany({ where: { siteId: site.id } });
    await prisma.page.deleteMany({ where: { siteId: site.id } });
  }

  console.log(`✅ Site: ${site.siteKey}`);

  // Widget config
  const widgetConfig = await prisma.widgetConfig.findUnique({ where: { siteId: site.id } });
  if (!widgetConfig) {
    await prisma.widgetConfig.create({
      data: {
        workspaceId: workspace.id,
        siteId: site.id,
        theme: {
          primaryColor: '#0D9488',
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          borderRadius: 12,
          position: 'bottom-right',
          offsetX: 20,
          offsetY: 20,
        },
        greeting: 'Hi! I can help you with PharmaCare POS. Ask me about inventory, sales, prescriptions, or any feature!',
        placeholder: 'Ask about POS features...',
        brandName: 'PharmaCare',
        allowedDomains: ['localhost', '127.0.0.1', 'ezypharma.vercel.app'],
        rateLimit: { rpm: 60, burst: 10 },
      },
    });
    console.log('✅ Widget config created');
  }

  let totalChunks = 0;

  for (const item of EZYPHARMA_CONTENT) {
    console.log(`\n📄 ${item.title}`);

    try {
      // Create page
      const page = await prisma.page.create({
        data: {
          workspaceId: workspace.id,
          siteId: site.id,
          url: item.url,
          title: item.title,
          contentHash: `${Date.now()}`,
          status: PageStatus.FETCHED,
        },
      });

      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: item.content,
      });

      const embeddingStr = `[${response.data[0].embedding.join(',')}]`;
      const tokenCount = response.usage?.total_tokens || 0;

      await prisma.$executeRaw`
        INSERT INTO chunks (id, "workspaceId", "siteId", "pageId", url, title, content, "tokenCount", "headingPath", embedding, "createdAt")
        VALUES (gen_random_uuid(), ${workspace.id}, ${site.id}, ${page.id}, ${item.url}, ${item.title}, ${item.content}, ${tokenCount}, ${item.headingPath}, ${embeddingStr}::vector, NOW())
      `;

      await prisma.page.update({
        where: { id: page.id },
        data: { status: PageStatus.EMBEDDED },
      });

      totalChunks++;
      console.log(`   ✅ Embedded (${tokenCount} tokens)`);

      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.error(`   ❌ Error: ${(e as Error).message}`);
    }
  }

  await prisma.site.update({
    where: { id: site.id },
    data: { status: SiteStatus.READY },
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 Done! Added ${totalChunks} content chunks`);
  console.log(`\n💡 Test the widget:`);
  console.log(`   http://localhost:5173?siteKey=${SITE_KEY}`);
  console.log(`\n📝 Sample questions to try:`);
  console.log(`   - "How do I manage inventory?"`)
  console.log(`   - "What reports are available?"`)
  console.log(`   - "How do I add a new product?"`)
  console.log(`   - "How does prescription management work?"`)
  console.log(`   - "What payment methods are supported?"`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

