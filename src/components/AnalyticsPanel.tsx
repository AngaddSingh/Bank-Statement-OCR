import React from "react";
import { Transaction } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  RotateCcw,
  Percent,
  Coins,
  Scale
} from "lucide-react";

interface AnalyticsPanelProps {
  transactions: Transaction[];
}

export default function AnalyticsPanel({ transactions }: AnalyticsPanelProps) {
  // Compute key totals
  const totals = React.useMemo(() => {
    let income = 0;
    let expenses = 0;
    const categories: Record<string, number> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (amt >= 0) {
        income += amt;
      } else {
        expenses += Math.abs(amt);
        const catLower = tx.category.toLowerCase() || "other";
        categories[catLower] = (categories[catLower] || 0) + Math.abs(amt);
      }
    });

    const net = income - expenses;

    // Convert categories to array and sort by value desc
    const sortedCategories = Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      income,
      expenses,
      net,
      categories: sortedCategories,
    };
  }, [transactions]);

  // Format currencies beautifully
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  const getCategoryProgressColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "groceries":
        return "bg-purple-500";
      case "dining":
        return "bg-amber-400";
      case "transport":
        return "bg-sky-500";
      case "bills":
        return "bg-rose-500";
      case "entertainment":
        return "bg-indigo-500";
      case "shopping":
        return "bg-pink-500";
      case "health":
        return "bg-teal-500";
      case "fees":
        return "bg-orange-500";
      case "transfer":
        return "bg-blue-500";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div id="analytics-panel-root" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Quick Stats Metric Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Income Card */}
        <div id="stat-income-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <span className="p-1 px-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totals.income)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">From paycheck & credits</p>
          </div>
        </div>

        {/* Expenses Card */}
        <div id="stat-expenses-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <span className="p-1 px-1.5 rounded-md bg-rose-50 text-rose-600">
              <TrendingDown className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totals.expenses)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">From debits & charges</p>
          </div>
        </div>

        {/* Net Change Card */}
        <div id="stat-net-card" className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Change</span>
            <span className={`p-1 px-1.5 rounded-md ${
              totals.net >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}>
              <Scale className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold tracking-tight ${
              totals.net >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {totals.net >= 0 ? "+" : ""}{formatCurrency(totals.net)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Savings or loss balance</p>
          </div>
        </div>

        {/* Mini Breakdown Graph (Pure Visual Bars Matrix) */}
        <div className="sm:col-span-3 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs mt-1">
          <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-slate-500" />
            Flow Comparison
          </h4>
          
          <div className="space-y-4">
            {/* Income Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Income Cash Inflow</span>
                <span>{formatCurrency(totals.income)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totals.income + totals.expenses === 0 ? 0 : (totals.income / (totals.income + totals.expenses)) * 100}%` }}
                />
              </div>
            </div>

            {/* Expenses Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
                <span>Expenses Cash Outflow</span>
                <span>{formatCurrency(totals.expenses)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${totals.income + totals.expenses === 0 ? 0 : (totals.expenses / (totals.income + totals.expenses)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Spend By Category Donut/Bar list Card */}
      <div id="stat-category-breakdown" className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          Spend By Category
        </h3>

        {totals.categories.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <p className="text-sm text-slate-400">No expense records categorized yet.</p>
            <p className="text-xs text-slate-300 mt-1">Income rows are excluded from expense categories.</p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[250px] pr-1">
            {totals.categories.map((cat) => {
              const totalExp = totals.expenses || 1; // avoid divide by zero
              const percentage = Math.round((cat.value / totalExp) * 100);
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span className="capitalize">{cat.name}</span>
                    <span className="font-mono text-slate-600">
                      {formatCurrency(cat.value)} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getCategoryProgressColor(cat.name)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
