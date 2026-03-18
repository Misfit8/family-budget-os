"use client";

import { useState } from "react";
import Link from "next/link";

interface FAQItem {
  term: string;
  short: string;
  long: string;
}

const SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: "Income & Earnings",
    items: [
      {
        term: "Net earnings",
        short: "What you actually take home.",
        long: "Net earnings = gross pay minus platform fees. For gig workers: gross − Uber/DoorDash fees. Tips are counted as income. This is the money that actually lands in your pocket.",
      },
      {
        term: "Gross earnings",
        short: "Total before fees are taken out.",
        long: "The amount the platform shows before deducting their cut. For Uber Eats this includes trip fares + tips before the Uber service fee is removed.",
      },
      {
        term: "Weekly target",
        short: "The income goal you set for the week.",
        long: "A weekly earnings goal to help you stay on track. The progress bar shows how close you are. It resets every Monday.",
      },
      {
        term: "7-Day daily average",
        short: "Your average daily net over the past week.",
        long: "Adds up your net earnings from the last 7 days and divides by 7. Useful for spotting trends — is your daily income going up or down?",
      },
    ],
  },
  {
    title: "Buffer & Runway",
    items: [
      {
        term: "Buffer",
        short: "Your emergency cash reserve.",
        long: "A dedicated savings pool kept separate from spending money. The idea: when income is unpredictable, your buffer absorbs slow weeks so bills still get paid. Think of it as your household's financial cushion.",
      },
      {
        term: "Runway",
        short: "How many days your buffer can cover expenses.",
        long: "Runway = buffer balance ÷ average daily spending. If you have $700 in your buffer and spend $50/day on average, your runway is 14 days. Green = 14+ days. Yellow = 7–14 days. Red = under 7 days.",
      },
      {
        term: "Average daily burn",
        short: "How much you spend per day on average.",
        long: "Calculated from your last 30 days of buffer withdrawals. Used to estimate how long your buffer will last.",
      },
    ],
  },
  {
    title: "Taxes (Gig Workers)",
    items: [
      {
        term: "SE tax / Self-employment tax",
        short: "The 15% tax gig workers pay instead of payroll tax.",
        long: "Regular employees split Social Security and Medicare taxes with their employer (7.65% each). As a gig worker, you pay both sides yourself — about 15% of net taxable income. This is separate from income tax.",
      },
      {
        term: "Net taxable income",
        short: "The income the IRS taxes after deductions.",
        long: "Gross earnings minus your mileage deduction. The IRS lets gig workers deduct miles driven for work at $0.67/mile (2025 rate), which lowers your taxable income.",
      },
      {
        term: "Mileage deduction",
        short: "A tax break for miles driven during deliveries.",
        long: "You can deduct $0.67 for every mile driven for gig work. Log your miles accurately — this deduction adds up significantly over a year and directly reduces your tax bill.",
      },
      {
        term: "Quarterly taxes",
        short: "Tax payments due 4 times a year.",
        long: "Gig workers don't have taxes withheld automatically. Instead, you're expected to pay the IRS quarterly: April 15, June 15, September 15, and January 15. Underpaying can result in penalties.",
      },
      {
        term: "Set aside",
        short: "Money you've saved specifically for your tax bill.",
        long: "The amount you've put away to cover your quarterly tax payment. The tracker shows how much you've saved vs. your estimated tax owed so you're never caught short.",
      },
    ],
  },
  {
    title: "SSI (Supplemental Security Income)",
    items: [
      {
        term: "Countable assets",
        short: "Money and property the SSA counts toward your $2,000 limit.",
        long: "SSI has a strict rule: if your countable assets exceed $2,000 (single) you can lose benefits. Countable assets include cash, bank accounts, and most savings. Some items are excluded — like your home and one car. This is not legal advice; consult SSA or a benefits counselor for your situation.",
      },
      {
        term: "ABLE account",
        short: "A special savings account that doesn't count toward the SSI limit.",
        long: "ABLE (Achieving a Better Life Experience) accounts let people with disabilities save money without it being counted as a countable asset for SSI purposes. Up to $100,000 can be saved. A powerful tool for building financial security without risking benefits. This is not legal advice.",
      },
      {
        term: "SSI payment date",
        short: "When your SSI check arrives.",
        long: "SSI is paid on the 1st of each month. If the 1st falls on a weekend or federal holiday, payment is made the prior business day.",
      },
    ],
  },
  {
    title: "Debt",
    items: [
      {
        term: "Snowball method",
        short: "Pay off smallest debt first.",
        long: "You put any extra money toward your smallest balance first, regardless of interest rate. When it's paid off, you roll that payment into the next smallest. Research shows this method works well psychologically — the quick wins keep you motivated.",
      },
      {
        term: "Avalanche method",
        short: "Pay off highest-interest debt first.",
        long: "You put extra money toward the debt with the highest interest rate first. Mathematically, this saves the most money in interest over time. Better if you're disciplined and focused on minimizing total cost.",
      },
      {
        term: "Freedom date",
        short: "The projected month you'll be debt-free.",
        long: "Based on your current balances, minimum payments, and any extra payment you add — the simulator projects the month and year when your last debt will be paid off. Adjust the 'Extra / Month' slider to see how more payments accelerate the date.",
      },
      {
        term: "Minimum payment",
        short: "The least you must pay each month to stay current.",
        long: "The minimum required payment to avoid late fees and keep your account in good standing. Paying only minimums on high-interest debt means most of your payment goes to interest, not principal.",
      },
    ],
  },
  {
    title: "W-2 & Steady Income",
    items: [
      {
        term: "Net take-home",
        short: "Your actual paycheck amount after taxes.",
        long: "The deposit that hits your bank account. This is your gross salary minus federal/state income tax, Social Security, Medicare, and any benefits deductions (health insurance, 401k, etc.).",
      },
      {
        term: "Pay cycle",
        short: "How often you get paid.",
        long: "Biweekly = every 2 weeks (26 paychecks/year). Semimonthly = twice a month on fixed dates like the 1st and 15th (24 paychecks/year). The progress bar shows where you are in the current pay period.",
      },
    ],
  },
  {
    title: "Weekly Digest",
    items: [
      {
        term: "Weekly Digest",
        short: "A short AI-written summary of your week.",
        long: "Once a week, Claude looks at your recent activity — runs logged, buffer balance, runway — and writes a short, plain-language summary. It highlights what's working, what to watch, and one concrete thing to focus on. It's not financial advice, just an honest mirror.",
      },
    ],
  },
];

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="text-zinc-400 text-sm">← Home</Link>
        <h1 className="text-lg font-semibold text-zinc-800">Help & Glossary</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Plain-language explanations of every term and feature in the app.
      </p>

      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => {
          const isOpen = openSection === section.title;
          return (
            <div key={section.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpenSection(isOpen ? null : section.title)}
              >
                <span className="text-sm font-semibold text-zinc-800">{section.title}</span>
                <span className="text-zinc-400 text-lg">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-100">
                  {section.items.map((item) => {
                    const key = `${section.title}:${item.term}`;
                    const itemOpen = openItem === key;
                    return (
                      <div key={item.term} className="border-b border-zinc-50 last:border-0">
                        <button
                          className="w-full flex items-start justify-between px-5 py-3 text-left"
                          onClick={() => setOpenItem(itemOpen ? null : key)}
                        >
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{item.term}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">{item.short}</p>
                          </div>
                          <span className="text-zinc-300 ml-3 flex-shrink-0 mt-0.5">{itemOpen ? "▲" : "▼"}</span>
                        </button>
                        {itemOpen && (
                          <p className="px-5 pb-4 text-sm text-zinc-600 leading-relaxed bg-zinc-50">
                            {item.long}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400 text-center mt-6">
        Nothing in this app is financial, legal, or tax advice.
        Always consult a professional for your specific situation.
      </p>
    </div>
  );
}
