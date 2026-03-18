export interface DebtInput {
  id: number;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
}

export interface PayoffResult {
  months: number;
  freedom_date: string; // YYYY-MM
  total_interest: number;
  order: number[]; // debt ids in payoff order
}

export function simulatePayoff(
  debts: DebtInput[],
  monthlyExtra: number,
  strategy: "snowball" | "avalanche"
): PayoffResult {
  if (debts.length === 0) {
    return { months: 0, freedom_date: new Date().toISOString().slice(0, 7), total_interest: 0, order: [] };
  }

  // Deep clone
  let remaining = debts.map((d) => ({
    id: d.id,
    balance: d.balance,
    minimum_payment: d.minimum_payment,
    monthly_rate: d.interest_rate / 100 / 12,
  }));

  let months = 0;
  let totalInterest = 0;
  const payoffOrder: number[] = [];
  const MAX_MONTHS = 600;

  while (remaining.some((d) => d.balance > 0) && months < MAX_MONTHS) {
    months++;

    // Accrue interest
    remaining.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * d.monthly_rate;
        totalInterest += interest;
        d.balance += interest;
      }
    });

    // Pay minimums — freed minimums from paid-off debts cascade as extra
    let freed = 0;
    remaining.forEach((d) => {
      if (d.balance <= 0) { freed += d.minimum_payment; return; }
      const payment = Math.min(d.balance, d.minimum_payment);
      d.balance -= payment;
      if (d.balance <= 0) {
        d.balance = 0;
        payoffOrder.push(d.id);
        freed += d.minimum_payment;
      }
    });

    // Apply extra + freed minimums to target debt
    const extra = monthlyExtra + freed - remaining.filter(d => d.balance <= 0).reduce((s, d) => s + d.minimum_payment, 0);
    const active = remaining.filter((d) => d.balance > 0);
    if (active.length > 0) {
      active.sort((a, b) =>
        strategy === "snowball"
          ? a.balance - b.balance
          : b.monthly_rate - a.monthly_rate
      );
      const target = active[0];
      const payment = Math.min(target.balance, Math.max(0, monthlyExtra));
      target.balance -= payment;
      if (target.balance <= 0) {
        target.balance = 0;
        if (!payoffOrder.includes(target.id)) payoffOrder.push(target.id);
      }
    }
  }

  const freedomDate = new Date();
  freedomDate.setMonth(freedomDate.getMonth() + months);

  return {
    months,
    freedom_date: freedomDate.toISOString().slice(0, 7),
    total_interest: Math.round(totalInterest * 100) / 100,
    order: payoffOrder,
  };
}
