import { Transaction } from "../types";

export interface SampleStatement {
  id: string;
  name: string;
  bankName: string;
  period: string;
  transactions: Transaction[];
}

export const SAMPLE_STATEMENTS: SampleStatement[] = [
  {
    id: "premium-checking",
    name: "Chase Private Client Checking",
    bankName: "Chase Bank",
    period: "October 1, 2026 – October 31, 2026",
    transactions: [
      {
        id: "chase-1",
        date: "2026-10-01",
        description: "DIRECT DEPOSIT RETROTECH SALARY",
        amount: 4850.00,
        category: "salary",
        notes: "Monthly primary pay direct deposit"
      },
      {
        id: "chase-2",
        date: "2026-10-02",
        description: "SAFEWAY STORE #2451 OAKLAND CA",
        amount: -142.34,
        category: "groceries",
        notes: "Weekly family grocery shopping"
      },
      {
        id: "chase-3",
        date: "2026-10-04",
        description: "COMCAST XFINITY DIGITAL BILL PAY",
        amount: -89.99,
        category: "bills",
        notes: "Residential broadband internet bill"
      },
      {
        id: "chase-4",
        date: "2026-10-05",
        description: "STARBUCKS #11054 BERKELEY CA",
        amount: -12.45,
        category: "dining",
        notes: "Coffee and pastries breakfast"
      },
      {
        id: "chase-5",
        date: "2026-10-08",
        description: "UBER TRIP RED CROSS RIDE",
        amount: -24.50,
        category: "transport",
        notes: "Commute ride to corporate office"
      },
      {
        id: "chase-6",
        date: "2026-10-12",
        description: "INTEREST PAYMENT ACCOUNT BALANCE",
        amount: 2.45,
        category: "other",
        notes: "Monthly checking relationship interest accrued"
      },
      {
        id: "chase-7",
        date: "2026-10-15",
        description: "PG&E UTILITIES WEB PAYMENT",
        amount: -210.40,
        category: "bills",
        notes: "Electric & gas monthly utility invoice"
      },
      {
        id: "chase-8",
        date: "2026-10-18",
        description: "TRADER JOE'S #342 EMERYVILLE CA",
        amount: -88.12,
        category: "groceries",
        notes: "Mid-month organic groceries"
      },
      {
        id: "chase-9",
        date: "2026-10-20",
        description: "NETFLIX SERVICES INT RENEWAL",
        amount: -15.49,
        category: "entertainment",
        notes: "Premium streaming monthly renewal"
      },
      {
        id: "chase-10",
        date: "2026-10-24",
        description: "APPLE ONLINE STORE STORE.APPLE.COM",
        amount: -249.00,
        category: "shopping",
        notes: "AirPods replacement purchase"
      },
      {
        id: "chase-11",
        date: "2026-10-28",
        description: "RAMEN SHOP RESTAURANT OAKLAND CA",
        amount: -62.50,
        category: "dining",
        notes: "Extracted: Gourmet dinner out"
      },
      {
        id: "chase-12",
        date: "2026-10-29",
        description: "SHELL SERVICE STATION CALISTOGA CA",
        amount: -45.00,
        category: "transport",
        notes: "Fuel fill-up for roadtrip commute"
      }
    ]
  },
  {
    id: "gold-credit-card",
    name: "Amex Gold Card Statement",
    bankName: "American Express",
    period: "November 5, 2026 – December 4, 2026",
    transactions: [
      {
        id: "amex-1",
        date: "2026-11-06",
        description: "THE CHEESEBOARD COLLECTIVE BERKELEY CA",
        amount: -44.00,
        category: "dining",
        notes: "Cooperative pizzeria pizza purchase"
      },
      {
        id: "amex-2",
        date: "2026-11-10",
        description: "WHOLE FOODS OAKLAND #10123",
        amount: -195.40,
        category: "groceries",
        notes: "Weekly organic high-end groceries"
      },
      {
        id: "amex-3",
        date: "2026-11-14",
        description: "SHELL OIL #90842 BERKELEY CA",
        amount: -55.00,
        category: "transport",
        notes: "Vehicle premium fuel refill"
      },
      {
        id: "amex-4",
        date: "2026-11-18",
        description: "AMZN MKTP US*SH73P81A AMAZON.COM",
        amount: -32.80,
        category: "shopping",
        notes: "Household goods delivery order"
      },
      {
        id: "amex-5",
        date: "2026-11-20",
        description: "RECURRING PAYMENT: SPOTIFY MUSIC",
        amount: -10.99,
        category: "entertainment",
        notes: "Family premium audio stream monthly subscription"
      },
      {
        id: "amex-6",
        date: "2026-11-25",
        description: "BLUE BOTTLE COFFEE OAKLAND CA",
        amount: -8.75,
        category: "dining",
        notes: "Espresso drink single charge"
      },
      {
        id: "amex-7",
        date: "2026-11-30",
        description: "CASHBACK REWARD EARNING CREDIT",
        amount: 50.00,
        category: "other",
        notes: "Extracted statement promotion credit"
      },
      {
        id: "amex-8",
        date: "2026-12-01",
        description: "SUTTER HEALTH CLINIC OAKLAND CA",
        amount: -35.00,
        category: "health",
        notes: "General practitioner appointment copay"
      },
      {
        id: "amex-9",
        date: "2026-12-02",
        description: "ELECTRONIC AUTO-PAYMENT CHASE BAL",
        amount: 380.94,
        category: "transfer",
        notes: "Payment from linked Checking"
      }
    ]
  },
  {
    id: "freelancer-statement",
    name: "Wells Fargo Business Checking",
    bankName: "Wells Fargo",
    period: "January 10, 2026 – February 9, 2026",
    transactions: [
      {
        id: "wf-1",
        date: "2026-01-12",
        description: "RECURRING ACME DESIGN CLIENT retainer",
        amount: 3500.00,
        category: "salary",
        notes: "Design freelance services monthly retainer"
      },
      {
        id: "wf-2",
        date: "2026-01-15",
        description: "GITHUB INC DEV COMPILER SAN FRANCISCO",
        amount: -19.00,
        category: "bills",
        notes: "Enterprise cloud subscription charge"
      },
      {
        id: "wf-3",
        date: "2026-01-18",
        description: "OFFICE DEPOT #281 SAN JOSE CA",
        amount: -112.50,
        category: "shopping",
        notes: "Office accessories, markers and printer paper"
      },
      {
        id: "wf-4",
        date: "2026-01-20",
        description: "DIGITALOCEAN CLOUD COMPUTING SERVICE",
        amount: -45.00,
        category: "bills",
        notes: "Dev VPS staging server hosting fee"
      },
      {
        id: "wf-5",
        date: "2026-01-25",
        description: "SWEETGREEN RESTAURANTS REDWOOD CA",
        amount: -18.75,
        category: "dining",
        notes: "Client lunch meeting healthy salad meal"
      },
      {
        id: "wf-6",
        date: "2026-01-28",
        description: "CALTRAIN COMMUTE SAN JOSE SAN FRANC",
        amount: -14.20,
        category: "transport",
        notes: "Transit ticket fare to visit agency"
      },
      {
        id: "wf-7",
        date: "2026-02-02",
        description: "WEBFLOW PLATFORM BILL RENEWAL",
        amount: -29.00,
        category: "bills",
        notes: "Portfolio CMS hosting subscription"
      },
      {
        id: "wf-8",
        date: "2026-02-05",
        description: "BUSINESS OVERDRAFT RELATIONSHIP FEE",
        amount: -15.00,
        category: "fees",
        notes: "Extracted statement fee item"
      }
    ]
  }
];
