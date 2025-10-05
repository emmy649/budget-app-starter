
import React, { useEffect, useMemo, useState } from "react";
import { PlusCircle, Trash2, Calendar, Wallet, ArrowLeft, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const todayISO = () => new Date().toISOString().slice(0, 10);
const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};
const currency = (n) => (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const getMonthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function BudgetApp() {
  const [tab, setTab] = useState("input");
  const [transactions, setTransactions] = useState(() => loadLS("budget_tx", []));
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [monthCursor, setMonthCursor] = useState(() => getMonthKey(new Date()));

  // Mobile viewport fix
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  useEffect(() => saveLS("budget_tx", transactions), [transactions]);

  const totals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const monthDate = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [monthCursor]);
  const prevMonth = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() - 1); setMonthCursor(getMonthKey(d)); };
  const nextMonth = () => { const d = new Date(monthDate); d.setMonth(d.getMonth() + 1); setMonthCursor(getMonthKey(d)); };

  const txThisMonth = useMemo(() => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    return transactions.filter((t) => { const d = new Date(t.date); return d >= start && d <= end; });
  }, [transactions, monthDate]);

  const dailyExpenseData = useMemo(() => {
    const days = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const arr = Array.from({ length: days }, (_, i) => ({ day: i + 1, expense: 0 }));
    for (const t of txThisMonth) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date);
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < arr.length) arr[idx].expense += t.amount;
    }
    return arr;
  }, [txThisMonth, monthDate]);

  const monthTotals = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of txThisMonth) t.type === "income" ? (income += t.amount) : (expense += t.amount);
    return { income, expense, balance: income - expense };
  }, [txThisMonth]);

  const [chartHeight, setChartHeight] = useState(() => (window.innerWidth > window.innerHeight ? 260 : 220));
  useEffect(() => {
    const onResize = () => setChartHeight(window.innerWidth > window.innerHeight ? 260 : 220);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const addTransaction = (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const t = { id: crypto.randomUUID(), type, amount: amt, date, note };
    setTransactions((prev) => [t, ...prev]);
    setAmount("");
    setNote("");
  };

  const removeTx = (id) => setTransactions((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="w-full text-[#e5e7eb]" style={{ minHeight: "calc(var(--vh, 1vh) * 100)", backgroundColor: "#0b0f12" }}>
      <header className="sticky top-0 z-10 bg-[#0b0f12]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Личен бюджет
          </h1>
          <nav className="flex gap-2 text-sm">
            <button onClick={() => setTab('input')} className={`px-3 py-2 rounded-xl border ${tab === 'input' ? 'bg-white/10 border-white/20' : 'border-white/10 hover:bg-white/5'}`}>Въвеждане</button>
            <button onClick={() => setTab('analysis')} className={`px-3 py-2 rounded-xl border ${tab === 'analysis' ? 'bg-white/10 border-white/20' : 'border-white/10 hover:bg-white/5'}`}>Анализ</button>
          </nav>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 pb-28 overflow-y-auto">
        {tab === "input" ? (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard title="Приход" value={`+ ${currency(totals.income)} лв.`} subtle="text-emerald-300" />
              <StatCard title="Разход" value={`- ${currency(totals.expense)} лв.`} subtle="text-rose-300" />
              <StatCard title="Баланс" value={`${currency(totals.balance)} лв.`} subtle={totals.balance>=0?'text-sky-300':'text-amber-300'} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <form onSubmit={addTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <input type="radio" name="type" checked={type === "expense"} onChange={() => setType("expense")} /> Разход
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                    <input type="radio" name="type" checked={type === "income"} onChange={() => setType("income")} /> Приход
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                    <span>лв</span>
                    <input required inputMode="decimal" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} className="bg-transparent outline-none w-full text-base" />
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                    <Calendar className="w-4 h-4" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none w-full text-base" />
                  </div>
                </div>

                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Бележка (напр. кафе, бензин...)" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none text-base" />

                <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white/90 text-black py-3.5 font-semibold hover:bg-white active:scale-[0.99]">
                  <PlusCircle className="w-5 h-5" /> Запази
                </button>
              </form>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm uppercase tracking-wider text-white/60">Последни записи</h2>
              {transactions.length === 0 ? <p className="text-white/60 text-sm">Няма записи още.</p> : (
                <ul className="space-y-2">
                  {transactions.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === "income" ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20" : "bg-rose-400/10 text-rose-300 border border-rose-400/20"}`}>{t.type === "income" ? "Приход" : "Разход"}</span>
                        <span className="text-white/90">{currency(t.amount)} лв.</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-white/70">
                        <span className="max-w-[40vw] truncate">{t.note}</span>
                        <span className="whitespace-nowrap">{t.date}</span>
                        <button onClick={() => removeTx(t.id)} className="p-2 rounded-lg hover:bg-white/10 touch-manipulation"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="p-2 rounded-xl border border-white/10 hover:bg-white/10 active:scale-[0.98]"><ArrowLeft className="w-4 h-4"/></button>
                <h2 className="text-base font-semibold">{monthDate.toLocaleString(undefined, { month: "long", year: "numeric" })}</h2>
                <button onClick={nextMonth} className="p-2 rounded-xl border border-white/10 hover:bg-white/10 active:scale-[0.98]"><ArrowRight className="w-4 h-4"/></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatCard title="Приход (м.)" value={`+ ${currency(monthTotals.income)} лв.`} subtle="text-emerald-300"/>
                <StatCard title="Разход (м.)" value={`- ${currency(monthTotals.expense)} лв.`} subtle="text-rose-300"/>
                <StatCard title="Баланс (м.)" value={`${currency(monthTotals.balance)} лв.`} subtle={monthTotals.balance>=0?"text-sky-300":"text-amber-300"}/>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm uppercase tracking-wider text-white/70 mb-3">Разходи по дни</h3>
              <div className="w-full" style={{ height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="#94a3b8" interval={0} height={28} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ background: "#0b0f12", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e5e7eb" }} labelFormatter={(v) => `Ден ${v}`} formatter={(v) => [`${currency(v)} лв.`, "Разход"]} />
                    <Bar dataKey="expense" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-white/70">
                    <th className="px-3 py-2">Дата</th>
                    <th className="px-3 py-2">Тип</th>
                    <th className="px-3 py-2">Бележка</th>
                    <th className="px-3 py-2 text-right">Сума</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {txThisMonth.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-white/60">Няма записи през този месец.</td></tr>
                  ) : (
                    txThisMonth.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((t) => (
                      <tr key={t.id} className="border-t border-white/10">
                        <td className="px-3 py-2 text-white/80 whitespace-nowrap">{t.date}</td>
                        <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${t.type === "income" ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20" : "bg-rose-400/10 text-rose-300 border border-rose-400/20"}`}>{t.type === "income" ? "Приход" : "Разход"}</span></td>
                        <td className="px-3 py-2 text-white/80">{t.note}</td>
                        <td className="px-3 py-2 text-right">{currency(t.amount)} лв.</td>
                        <td className="px-3 py-2 text-right"><button onClick={() => removeTx(t.id)} className="p-2 rounded-lg hover:bg-white/10 touch-manipulation"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-[#0b0f12]/95 backdrop-blur border-t border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3 text-center text-xs text-white/60">Данните се пазят локално на устройството (localStorage).</div>
      </footer>
    </div>
  );
}

function StatCard({ title, value, subtle }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/60">{title}</div>
          <div className={`mt-1 text-base font-semibold ${subtle}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}
