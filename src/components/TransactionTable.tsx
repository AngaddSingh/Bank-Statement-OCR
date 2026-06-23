import React, { useState, useMemo } from "react";
import { Transaction } from "../types";
import { 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Undo,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle
} from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  onUpdateTransaction: (id: string, updated: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: () => void;
  onResetTransactions: () => void;
}

const CATEGORIES = [
  "salary",
  "groceries",
  "dining",
  "transport",
  "bills",
  "entertainment",
  "shopping",
  "health",
  "transfer",
  "fees",
  "other"
];

export default function TransactionTable({
  transactions,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
  onResetTransactions
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Get category badge color class
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "salary":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "groceries":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "dining":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "transport":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "bills":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "entertainment":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "shopping":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "health":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "transfer":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "fees":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleSort = (field: "date" | "amount" | "description") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(lower) ||
          t.notes.toLowerCase().includes(lower)
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === "amount") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, searchTerm, selectedCategory, sortBy, sortOrder]);

  return (
    <div id="transaction-table-root" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header and filters */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="search-input"
            type="text"
            placeholder="Search descriptions or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filter & Reset Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700">
            <Filter className="h-4.5 w-4.5 text-slate-400" />
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-0 focus:outline-hidden text-sm font-medium text-slate-700 cursor-pointer pr-1"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            id="add-custom-btn"
            onClick={onAddTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </button>

          <button
            id="reset-statement-btn"
            onClick={onResetTransactions}
            title="Reload initial statement extraction"
            className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer"
          >
            <Undo className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5 text-sm">Reset</span>
          </button>
        </div>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
            <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
            <p className="font-medium text-slate-700">No transactions match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search terms or choosing a different category.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[150px]" onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-1.5">
                    Date
                    {sortBy === "date" && (
                      <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors" onClick={() => handleSort("description")}>
                  <div className="flex items-center gap-1.5">
                    Description
                    {sortBy === "description" && (
                      <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[140px]" onClick={() => handleSort("amount")}>
                  <div className="flex items-center gap-1.5">
                    Amount
                    {sortBy === "amount" && (
                      <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 w-[160px]">Category</th>
                <th className="px-4 py-3">Notes / Insights</th>
                <th className="px-4 py-3 w-[60px] text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.map((tx) => (
                <tr
                  key={tx.id}
                  className={`hover:bg-slate-50/60 transition-colors group ${
                    tx.isNew ? "bg-blue-50/30 font-medium" : ""
                  }`}
                >
                  {/* Date Input */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <input
                        id={`date-${tx.id}`}
                        type="date"
                        value={tx.date}
                        onChange={(e) => onUpdateTransaction(tx.id, { date: e.target.value })}
                        className="bg-transparent hover:bg-white focus:bg-white border-0 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 roundedpx-1 py-1 text-sm text-slate-800 w-full transition-all cursor-pointer"
                      />
                    </div>
                  </td>

                  {/* Description Input */}
                  <td className="px-4 py-2">
                    <input
                      id={`desc-${tx.id}`}
                      type="text"
                      value={tx.description}
                      onChange={(e) => onUpdateTransaction(tx.id, { description: e.target.value })}
                      placeholder="Transaction description"
                      className="bg-transparent hover:bg-white focus:bg-white border-0 font-medium text-slate-800 text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 rounded-lg px-2 py-1 w-full transition-all"
                    />
                  </td>

                  {/* Amount Input */}
                  <td className="px-4 py-2">
                    <div className="flex items-center relative">
                      <span className={`text-sm font-semibold mr-1.5 ${tx.amount >= 0 ? "text-emerald-600" : "text-slate-600"}`}>
                        {tx.amount >= 0 ? "+" : ""}
                      </span>
                      <input
                        id={`amount-${tx.id}`}
                        type="number"
                        step="0.01"
                        value={tx.amount}
                        onChange={(e) => onUpdateTransaction(tx.id, { amount: parseFloat(e.target.value) || 0 })}
                        className={`bg-transparent hover:bg-white focus:bg-white border-0 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 font-semibold text-sm rounded-lg px-1.5 py-1 w-full transition-all ${
                          tx.amount >= 0 ? "text-emerald-700 font-semibold" : "text-slate-700"
                        }`}
                      />
                    </div>
                  </td>

                  {/* Category Pill Dropdown */}
                  <td className="px-4 py-2">
                    <div className={`inline-flex items-center border rounded-full px-2 py-0.5 text-xs font-semibold ${getCategoryColor(tx.category)}`}>
                      <select
                        id={`category-${tx.id}`}
                        value={tx.category.toLowerCase()}
                        onChange={(e) => onUpdateTransaction(tx.id, { category: e.target.value })}
                        className="bg-transparent border-0 font-semibold pr-4 cursor-pointer focus:outline-hidden focus:ring-0 text-xs text-inherit focus:text-slate-900"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat} className="text-slate-800 bg-white">
                            {cat.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Notes Helper */}
                  <td className="px-4 py-2">
                    <input
                      id={`notes-${tx.id}`}
                      type="text"
                      value={tx.notes}
                      onChange={(e) => onUpdateTransaction(tx.id, { notes: e.target.value })}
                      placeholder="Add an explanatory bank audit audit annotation..."
                      className="bg-transparent hover:bg-white focus:bg-white border-0 text-xs text-slate-500 focus:text-slate-800 pb-1 pt-1 font-mono focus:ring-1 focus:ring-blue-400 focus:border-blue-400 rounded-lg px-2 w-full transition-all"
                    />
                  </td>

                  {/* Delete Row button */}
                  <td className="px-4 py-2 text-center">
                    <button
                      id={`delete-btn-${tx.id}`}
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 px-1.5 text-slate-400 hover:text-red-600 rounded-lg bg-transparent hover:bg-red-50 transition-colors inline-block cursor-pointer"
                      title="Remove transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span className="font-mono">
          Showing {filteredAndSorted.length} of {transactions.length} rows extracted
        </span>
        <span className="text-slate-500 max-w-md text-right text-[11px]">
          🖊️ Tip: Double click any cell to edit dates, descriptions, or amounts directly.
        </span>
      </div>
    </div>
  );
}
