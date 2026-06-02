import { useState, useEffect, useCallback, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = "";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysUntil = (d) => { if (!d) return null; return Math.ceil((new Date(d + "T00:00:00") - new Date(new Date().toDateString())) / 86400000); };
const isOverdue = (d) => { const n = daysUntil(d); return n !== null && n < 0; };
const isDueSoon = (d, days = 7) => { const n = daysUntil(d); return n !== null && n >= 0 && n <= days; };
const last6Months = () => { const arr = []; const d = new Date(); for (let i = 5; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); arr.push(monthKey(m)); } return arr; };

const CATS = ["Food", "Transport", "Shopping", "Utilities", "Rent", "Health", "Education", "Entertainment", "Other"];
const INC_CATS = ["Salary", "Part-time", "Business", "Freelance", "Investment", "Gift", "Other"];
const PAY_METHODS = ["Cash", "Bank Transfer", "Card", "Mobile Money", "Cheque", "Other"];
const ACCOUNT_TYPES = ["Bank", "Revolut", "Wise", "Cash", "Credit Card", "PayPal", "Savings", "Crypto", "Other"];
const BILL_REPEATS = ["Monthly", "Weekly", "Yearly", "One-time"];
const CURRENCIES = ["USD","EUR","GBP","AED","SAR","NGN","KES","GHS","ZAR","INR","PKR","BDT","PHP","MYR","THB","IDR","CAD","AUD","CHF","JPY","BRL","MXN","EGP","MAD","TZS","UGX","Custom"];
const CAT_COLORS = { Food:"#f87171", Transport:"#fb923c", Shopping:"#fbbf24", Utilities:"#a3e635", Rent:"#34d399", Health:"#22d3ee", Education:"#818cf8", Entertainment:"#e879f9", Other:"#94a3b8" };
const ACC_TYPE_ICONS = { Bank:"🏦", Revolut:"💜", Wise:"🌍", Cash:"💵", "Credit Card":"💳", PayPal:"🅿️", Savings:"🏧", Crypto:"₿", Other:"💰" };

// ─── Account balance calculator ───────────────────────────────────────────────
function getAccountBalance(account, expenses, income, debts, lending, bills) {
  let bal = Number(account.initialBalance || 0);
  income.forEach(i => { if (i.accountId === account.id) bal += Number(i.amount || 0); });
  expenses.forEach(e => { if (e.accountId === account.id) bal -= Number(e.amount || 0); });
  bills.forEach(b => (b.payments || []).forEach(p => { if (p.accountId === account.id) bal -= Number(p.amount || 0); }));
  debts.forEach(d => (d.payments || []).forEach(p => { if (p.accountId === account.id) bal -= Number(p.amount || 0); }));
  lending.forEach(l => (l.payments || []).forEach(p => { if (p.accountId === account.id) bal += Number(p.amount || 0); }));
  return bal;
}

function getTotalBalance(accounts, expenses, income, debts, lending, bills) {
  return accounts.reduce((s, a) => s + getAccountBalance(a, expenses, income, debts, lending, bills), 0);
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#080f0a", card: "#101a12", cardBorder: "#1c2e1f",
  green: "#22c55e", greenDark: "#16a34a", greenLight: "#4ade80",
  teal: "#14b8a6", blue: "#38bdf8", red: "#f87171",
  orange: "#fb923c", yellow: "#fbbf24", purple: "#a78bfa",
  text: "#f0fdf4", muted: "#4d7a55", mutedLight: "#7aaa80",
  surface: "#141f16", surfaceHover: "#1a2b1d",
};

const S = {
  app: { background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Nunito', 'DM Sans', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px", position: "sticky", top: 0, zIndex: 10, background: `linear-gradient(180deg, ${C.bg} 85%, transparent)` },
  card: { background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "14px 16px", marginBottom: 10 },
  btn: (col = C.green, ghost = false) => ({ background: ghost ? "transparent" : col, color: ghost ? col : (col === C.green ? "#061009" : "#fff"), border: ghost ? `1.5px solid ${col}` : "none", borderRadius: 12, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8 }),
  btnSm: (col = C.green, ghost = false) => ({ background: ghost ? "transparent" : col, color: ghost ? col : (col === C.green ? "#061009" : "#fff"), border: ghost ? `1px solid ${col}` : "none", borderRadius: 8, padding: "5px 11px", fontWeight: 700, fontSize: 12, cursor: "pointer" }),
  input: { background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" },
  label: { fontSize: 11, color: C.muted, marginBottom: 4, display: "block", fontWeight: 700 },
  row: { display: "flex", gap: 10, marginBottom: 0 },
  tag: (col) => ({ background: col + "22", color: col, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" }),
  empty: { textAlign: "center", color: C.muted, padding: "36px 20px", fontSize: 14 },
  nav: { position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", width: "100%", background: C.card, borderTop: `1px solid ${C.cardBorder}`, display: "flex", zIndex: 100 },
  navItem: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "9px 4px 5px", cursor: "pointer", gap: 2, background: "transparent", border: "none", color: a ? C.greenLight : C.muted }),
};

// ─── Storage ──────────────────────────────────────────────────────────────────
function useStore(key, init) {
  const [val, setVal] = useState(init);
  useEffect(() => { window.storage?.get(key).then(r => { if (r?.value) setVal(JSON.parse(r.value)); }).catch(() => {}); }, [key]);
  const save = useCallback((v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next); window.storage?.set(key, JSON.stringify(next)).catch(() => {}); return next;
  }, [key, val]);
  return [val, save];
}

// ─── Icon ─────────────────────────────────────────────────────────────────────
const PATHS = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  expense: "M17 9V7a5 5 0 00-10 0v2M3 9h18l-1.5 12H4.5zM9 13v3m6-3v3",
  income: "M7 10l5-6 5 6M7 14l5 6 5-6",
  bills: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z",
};
const Icon = ({ name, size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(PATHS[name] || "").split("M").filter(Boolean).map((p, i) => <path key={i} d={"M" + p} />)}
  </svg>
);

// Main App Component
export default function App() {
  const [page, setPage] = useState("home");
  const [expenses, setExpenses] = useStore("mrAI_expenses", []);
  const [income, setIncome] = useStore("mrAI_income", []);
  const [accounts, setAccounts] = useStore("mrAI_accounts", []);
  const [debts, setDebts] = useStore("mrAI_debts", []);
  const [lending, setLending] = useStore("mrAI_lending", []);
  const [bills, setBills] = useStore("mrAI_bills", []);
  const [settings, setSettings] = useStore("mrAI_settings", { name: "User", currency: "USD" });

  const curSym = settings.currency === "Custom" ? (settings.customSymbol || "$") : { USD: "$", EUR: "€", GBP: "£", AED: "د.إ", SAR: "﷼", NGN: "₦", KES: "KSh", GHS: "₵", ZAR: "R", INR: "₹", PKR: "₨", BDT: "৳", PHP: "₱", MYR: "RM", THB: "฿", IDR: "Rp", CAD: "$", AUD: "$", CHF: "CHF", JPY: "¥", BRL: "R$", MXN: "$", EGP: "£", MAD: "د.م.", TZS: "TSh", UGX: "USh" }[settings.currency] || "$";

  const totalBalance = getTotalBalance(accounts, expenses, income, debts, lending, bills);
  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthKey())).reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthIncome = income.filter(i => i.date?.startsWith(monthKey())).reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.topBar}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.greenLight }}>💰 Money Reminder</div>
        <button style={{ background: C.green, border: "none", borderRadius: 8, width: 36, height: 36, cursor: "pointer", color: "#061009", fontWeight: 800 }}>+</button>
      </div>

      {/* Content */}
      <div style={{ padding: "14px" }}>
        {page === "home" && (
          <div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Hello, {settings.name}! 👋</div>
            
            {/* Balance Card */}
            <div style={{ ...S.card, background: `linear-gradient(135deg, ${C.green}22 0%, ${C.teal}11 100%)`, border: `1px solid ${C.green}40`, marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>TOTAL BALANCE</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: totalBalance >= 0 ? C.greenLight : C.red, marginTop: 8 }}>
                {totalBalance < 0 ? "-" : ""}{curSym}{fmt(Math.abs(totalBalance))}
              </div>
              <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "SPENT THIS MONTH", val: monthExpenses, color: C.red, prefix: "-" },
                { label: "INCOME THIS MONTH", val: monthIncome, color: C.green, prefix: "+" },
              ].map(({ label, val, color, prefix }) => (
                <div key={label} style={{ background: color + "12", border: `1px solid ${color}25`, borderRadius: 16, padding: "14px" }}>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 8 }}>{prefix}{curSym}{fmt(val)}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 40 }}>
              <button style={{ ...S.btn(C.red), margin: 0 }} onClick={() => setPage("expense")}>💸 Add Expense</button>
              <button style={{ ...S.btn(C.green), margin: 0 }} onClick={() => setPage("income")}>💵 Add Income</button>
            </div>
          </div>
        )}

        {page === "expense" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Add Expense</h2>
            <input style={{ ...S.input, marginBottom: 10 }} type="number" placeholder="Amount" />
            <select style={{ ...S.input, marginBottom: 10 }}>
              <option>Select Category</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input style={{ ...S.input, marginBottom: 10 }} type="date" />
            <button style={S.btn(C.red)} onClick={() => setPage("home")}>Save Expense</button>
            <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={() => setPage("home")}>Cancel</button>
          </div>
        )}

        {page === "income" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Add Income</h2>
            <input style={{ ...S.input, marginBottom: 10 }} type="number" placeholder="Amount" />
            <select style={{ ...S.input, marginBottom: 10 }}>
              <option>Select Source</option>
              {INC_CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input style={{ ...S.input, marginBottom: 10 }} type="date" />
            <button style={S.btn(C.green)} onClick={() => setPage("home")}>Save Income</button>
            <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={() => setPage("home")}>Cancel</button>
          </div>
        )}

        {page === "bills" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Bills</h2>
            <div style={S.empty}>No bills yet</div>
            <button style={S.btn()} onClick={() => setPage("home")}>← Back</button>
          </div>
        )}

        {page === "settings" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Settings</h2>
            <div style={S.card}>
              <label style={S.label}>Your Name</label>
              <input style={S.input} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
            </div>
            <div style={S.card}>
              <label style={S.label}>Currency</label>
              <select style={S.input} value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button style={S.btn()} onClick={() => setPage("home")}>← Back</button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav style={S.nav}>
        <button style={S.navItem(page === "home")} onClick={() => setPage("home")}>
          <Icon name="home" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Home</span>
        </button>
        <button style={S.navItem(page === "expense")} onClick={() => setPage("expense")}>
          <Icon name="expense" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Expense</span>
        </button>
        <button style={S.navItem(page === "income")} onClick={() => setPage("income")}>
          <Icon name="income" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Income</span>
        </button>
        <button style={S.navItem(page === "bills")} onClick={() => setPage("bills")}>
          <Icon name="bills" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Bills</span>
        </button>
        <button style={S.navItem(page === "settings")} onClick={() => setPage("settings")}>
          <Icon name="settings" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>Settings</span>
        </button>
      </nav>
    </div>
  );
}
