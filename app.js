import { useState, useEffect, useCallback, useRef } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
// To enable Google Sign-in & Drive backup, replace with your Google OAuth Client ID
// Setup: console.cloud.google.com → APIs → OAuth 2.0 Client IDs
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
  btn: (col = C.green, ghost = false) => ({ background: ghost ? "transparent" : col, color: ghost ? col : (col === C.green ? "#061009" : "#fff"), border: ghost ? `1.5px solid ${col}` : "none", borderRadius: 12, padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer", width: "100%", marginTop: 8, letterSpacing: 0.2 }),
  btnSm: (col = C.green, ghost = false) => ({ background: ghost ? "transparent" : col, color: ghost ? col : (col === C.green ? "#061009" : "#fff"), border: ghost ? `1px solid ${col}` : "none", borderRadius: 8, padding: "5px 11px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }),
  input: { background: C.surface, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "11px 13px", color: C.text, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  label: { fontSize: 11, color: C.muted, marginBottom: 4, display: "block", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" },
  row: { display: "flex", gap: 10, marginBottom: 0 },
  tag: (col) => ({ background: col + "22", color: col, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" }),
  empty: { textAlign: "center", color: C.muted, padding: "36px 20px", fontSize: 14 },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.card, borderTop: `1px solid ${C.cardBorder}`, display: "flex", zIndex: 100 },
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
  debt: "M3 6h18M3 12h18M3 18h9",
  lend: "M12 2l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z",
  bills: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M12 12h.01M12 16h.01M9 12h.01M9 16h.01",
  budget: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  contacts: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  ai: "M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-5 0v-15A2.5 2.5 0 019.5 2z M14.5 2A2.5 2.5 0 0117 4.5v15a2.5 2.5 0 01-5 0",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  report: "M18 20V10M12 20V4M6 20v-6",
  account: "M3 10h18M3 6h18M3 14h10M3 18h7",
  wallet: "M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 13a1 1 0 110 2 1 1 0 010-2zM4 7V5a2 2 0 012-2h12a2 2 0 012 2v2",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  google: "M12 11v2h5.5a5.5 5.5 0 01-11 0 5.5 5.5 0 015.5-5.5c1.5 0 2.87.6 3.87 1.57L17.5 7.5A8 8 0 1020 12h-8z",
  menu: "M3 6h18M3 12h18M3 18h18",
  partial: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
};
const Icon = ({ name, size = 20, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(PATHS[name] || "").split("M").filter(Boolean).map((p, i) => <path key={i} d={"M" + p} />)}
  </svg>
);

// ─── UI primitives ────────────────────────────────────────────────────────────
const Field = ({ label, children, style }) => <div style={{ marginBottom: 12, ...style }}><label style={S.label}>{label}</label>{children}</div>;
const Input = ({ label, style: st, ...p }) => <Field label={label}><input style={{ ...S.input, ...st }} {...p} /></Field>;
const Textarea = ({ label, ...p }) => <Field label={label}><textarea style={{ ...S.input, resize: "none", minHeight: 60 }} {...p} /></Field>;
const Select = ({ label, options, ...p }) => (
  <Field label={label}>
    <select style={{ ...S.input, appearance: "none" }} {...p}>
      {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>{typeof o === "string" ? o : o.label}</option>)}
    </select>
  </Field>
);
const Progress = ({ pct, color = C.green, height = 8 }) => (
  <div style={{ background: C.surface, borderRadius: 99, height, overflow: "hidden" }}>
    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct >= 100 ? C.red : pct >= 80 ? C.orange : color, borderRadius: 99, transition: "width .4s ease" }} />
  </div>
);
const Badge = ({ text, color }) => <span style={S.tag(color)}>{text}</span>;

// ─── Account picker ───────────────────────────────────────────────────────────
function AccountPicker({ label = "Account", accounts, value, onChange, curSym, expenses, income, debts, lending, bills }) {
  const opts = [{ value: "", label: "— Select Account —" }, ...accounts.map(a => {
    const bal = getAccountBalance(a, expenses, income, debts, lending, bills);
    return { value: a.id, label: `${ACC_TYPE_ICONS[a.type] || "💰"} ${a.name} (${curSym}${fmt(bal)})` };
  })];
  return <Select label={label} options={opts} value={value || ""} onChange={e => onChange(e.target.value)} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-end" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: C.card, borderRadius: "20px 20px 0 0", padding: "20px 18px 40px", maxHeight: "92vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
const MH = ({ title, onClose }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
    <div style={{ fontSize: 17, fontWeight: 800 }}>{title}</div>
    <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
  </div>
);

// ─── FORMS ────────────────────────────────────────────────────────────────────
function AccountForm({ data, onSave, onClose }) {
  const [f, setF] = useState({ name: "", type: "Bank", bankName: "", initialBalance: "0", color: C.green, ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const COLORS = [C.green, C.teal, C.blue, C.orange, C.red, C.purple, C.yellow, "#ec4899"];
  return (
    <>
      <MH title={f.id ? "Edit Account" : "Add Account"} onClose={onClose} />
      <Input label="Account Name" placeholder="e.g. My Savings" value={f.name} onChange={e => set("name", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Select label="Account Type" options={ACCOUNT_TYPES} value={f.type} onChange={e => set("type", e.target.value)} /></div>
        {f.type === "Bank" && <div style={{ flex: 1 }}><Input label="Bank Name" placeholder="e.g. Chase" value={f.bankName} onChange={e => set("bankName", e.target.value)} /></div>}
      </div>
      <Input label="Opening Balance" type="number" placeholder="0.00" value={f.initialBalance} onChange={e => set("initialBalance", e.target.value)} />
      <Field label="Account Color">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => set("color", c)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: c, border: f.color === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </Field>
      <button style={S.btn()} onClick={() => f.name && onSave(f)}>Save Account</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function ExpenseForm({ data, onSave, onClose, curSym, accounts, expenses, income, debts, lending, bills }) {
  const [f, setF] = useState({ date: today(), category: "Food", paymentMethod: "Cash", amount: "", note: "", accountId: "", ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Expense" : "Add Expense"} onClose={onClose} />
      <Input label={`Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Select label="Category" options={CATS} value={f.category} onChange={e => set("category", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Input label="Date" type="date" value={f.date} onChange={e => set("date", e.target.value)} /></div>
      </div>
      {accounts.length > 0 && <AccountPicker label="Deduct From Account" accounts={accounts} value={f.accountId} onChange={v => set("accountId", v)} curSym={curSym} expenses={expenses} income={income} debts={debts} lending={lending} bills={bills} />}
      <Select label="Payment Method" options={PAY_METHODS} value={f.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} />
      <Textarea label="Note (optional)" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn(C.red)} onClick={() => f.amount && onSave(f)}>Save Expense</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function IncomeForm({ data, onSave, onClose, curSym, accounts, expenses, income, debts, lending, bills }) {
  const [f, setF] = useState({ date: today(), category: "Salary", paymentMethod: "Bank Transfer", amount: "", note: "", source: "", accountId: "", ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Income" : "Add Income"} onClose={onClose} />
      <Input label={`Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <Input label="Source / Payer" placeholder="e.g. Company name, Client..." value={f.source} onChange={e => set("source", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Select label="Income Type" options={INC_CATS} value={f.category} onChange={e => set("category", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Input label="Date" type="date" value={f.date} onChange={e => set("date", e.target.value)} /></div>
      </div>
      {accounts.length > 0 && <AccountPicker label="Credited To Account" accounts={accounts} value={f.accountId} onChange={v => set("accountId", v)} curSym={curSym} expenses={expenses} income={income} debts={debts} lending={lending} bills={bills} />}
      <Select label="Received Via" options={PAY_METHODS} value={f.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} />
      <Textarea label="Note (optional)" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn(C.teal)} onClick={() => f.amount && onSave(f)}>Save Income</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function DebtForm({ data, onSave, onClose, curSym }) {
  const [f, setF] = useState({ dueDate: "", amount: "", contactName: "", contactPhone: "", note: "", paid: false, payments: [], ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Debt" : "Add Debt"} onClose={onClose} />
      <div style={{ ...S.tag(C.orange), marginBottom: 12, fontSize: 12 }}>💸 Money YOU owe someone</div>
      <Input label={`Total Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Input label="Contact Name" value={f.contactName} onChange={e => set("contactName", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Input label="Phone" value={f.contactPhone} onChange={e => set("contactPhone", e.target.value)} /></div>
      </div>
      <Input label="Due Date" type="date" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} />
      <Textarea label="Note" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn(C.orange)} onClick={() => f.amount && onSave(f)}>Save Debt</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function LendingForm({ data, onSave, onClose, curSym }) {
  const [f, setF] = useState({ givenDate: today(), returnDate: "", amount: "", contactName: "", contactPhone: "", note: "", paid: false, payments: [], ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Lending" : "Add Lending"} onClose={onClose} />
      <div style={{ ...S.tag(C.blue), marginBottom: 12, fontSize: 12 }}>🤝 Money YOU lent out</div>
      <Input label={`Total Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Input label="Contact Name" value={f.contactName} onChange={e => set("contactName", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Input label="Phone" value={f.contactPhone} onChange={e => set("contactPhone", e.target.value)} /></div>
      </div>
      <div style={S.row}>
        <div style={{ flex: 1 }}><Input label="Date Given" type="date" value={f.givenDate} onChange={e => set("givenDate", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Input label="Return Date" type="date" value={f.returnDate} onChange={e => set("returnDate", e.target.value)} /></div>
      </div>
      <Textarea label="Note" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn(C.blue)} onClick={() => f.amount && onSave(f)}>Save Lending</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

// Partial payment form (shared for debt, lending, bill)
function PaymentForm({ title, maxAmount, onSave, onClose, curSym, accounts, expenses, income, debts, lending, bills, accentColor = C.green }) {
  const [f, setF] = useState({ amount: "", accountId: "", date: today(), note: "" });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={title} onClose={onClose} />
      {maxAmount !== undefined && <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Outstanding: {curSym}{fmt(maxAmount)}</div>}
      <Input label={`Payment Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <Input label="Date" type="date" value={f.date} onChange={e => set("date", e.target.value)} />
      {accounts.length > 0 && <AccountPicker label="From Account" accounts={accounts} value={f.accountId} onChange={v => set("accountId", v)} curSym={curSym} expenses={expenses} income={income} debts={debts} lending={lending} bills={bills} />}
      <Textarea label="Note (optional)" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn(accentColor)} onClick={() => f.amount && onSave({ ...f, id: uid() })}>Record Payment</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function BillForm({ data, onSave, onClose, curSym }) {
  const [f, setF] = useState({ title: "", amount: "", dueDate: "", repeat: "Monthly", reminderDays: 2, paid: false, payments: [], ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Bill" : "Add Bill"} onClose={onClose} />
      <Input label="Bill Title" placeholder="e.g. Room Rent, VAT, Internet..." value={f.title} onChange={e => set("title", e.target.value)} />
      <Input label={`Total Amount (${curSym})`} type="number" placeholder="0.00" value={f.amount} onChange={e => set("amount", e.target.value)} />
      <div style={S.row}>
        <div style={{ flex: 1 }}><Input label="Due Date" type="date" value={f.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
        <div style={{ flex: 1 }}><Select label="Repeat" options={BILL_REPEATS} value={f.repeat} onChange={e => set("repeat", e.target.value)} /></div>
      </div>
      <Input label="Remind (days before due)" type="number" min={0} max={30} value={f.reminderDays} onChange={e => set("reminderDays", Number(e.target.value))} />
      <Textarea label="Note" value={f.note || ""} onChange={e => set("note", e.target.value)} />
      <button style={S.btn()} onClick={() => f.title && f.amount && onSave(f)}>Save Bill</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function ContactForm({ data, onSave, onClose }) {
  const [f, setF] = useState({ name: "", phone: "", note: "", ...data });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <>
      <MH title={f.id ? "Edit Contact" : "Add Contact"} onClose={onClose} />
      <Input label="Name" placeholder="Full name" value={f.name} onChange={e => set("name", e.target.value)} />
      <Input label="Phone" placeholder="+1 234 567 8900" value={f.phone} onChange={e => set("phone", e.target.value)} />
      <Textarea label="Note" value={f.note} onChange={e => set("note", e.target.value)} />
      <button style={S.btn()} onClick={() => f.name && onSave(f)}>Save Contact</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

function BudgetForm({ budget, onSave, onClose, curSym }) {
  const [total, setTotal] = useState(budget.total || "");
  const [cats, setCats] = useState(budget.cats || {});
  return (
    <>
      <MH title="Set Budget" onClose={onClose} />
      <Input label={`Monthly Total Budget (${curSym})`} type="number" placeholder="0.00" value={total} onChange={e => setTotal(e.target.value)} />
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: "14px 0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>Category Budgets (optional)</div>
      {CATS.map(c => (
        <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 108, fontSize: 13, color: C.mutedLight }}>{c}</div>
          <input type="number" placeholder="0" style={{ ...S.input, flex: 1, padding: "8px 12px" }}
            value={cats[c] || ""} onChange={e => setCats(p => ({ ...p, [c]: e.target.value }))} />
        </div>
      ))}
      <button style={S.btn()} onClick={() => onSave({ total: Number(total), cats })}>Save Budget</button>
      <button style={{ ...S.btn(C.surface), color: C.muted, marginTop: 6 }} onClick={onClose}>Cancel</button>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard(p) {
  const { curSym, expenses, income, debts, lending, bills, budget, accounts, settings, openModal, navigate } = p;
  const mkm_ = monthKey();
  const mExp = expenses.filter(e => e.date?.startsWith(mkm_));
  const mInc = income.filter(i => i.date?.startsWith(mkm_));
  const totalSpent = mExp.reduce((s, e) => s + Number(e.amount), 0);
  const totalInc = mInc.reduce((s, i) => s + Number(i.amount), 0);
  const totalDebt = debts.filter(d => !d.paid).reduce((s, d) => s + Number(d.amount) - (d.payments || []).reduce((a, pp) => a + Number(pp.amount), 0), 0);
  const totalLend = lending.filter(l => !l.paid).reduce((s, l) => s + Number(l.amount) - (l.payments || []).reduce((a, pp) => a + Number(pp.amount), 0), 0);
  const totalBalance = getTotalBalance(accounts, expenses, income, debts, lending, bills);
  const bLeft = (budget.total || 0) - totalSpent;
  const bPct = budget.total ? (totalSpent / budget.total) * 100 : 0;
  const upcomingBills = bills.filter(b => !b.paid && isDueSoon(b.dueDate, 7)).sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
  const overdueBills = bills.filter(b => !b.paid && isOverdue(b.dueDate));
  const recentTx = [
    ...mExp.map(e => ({ ...e, _t: "expense" })),
    ...mInc.map(i => ({ ...i, _t: "income" }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <div>
      <div style={{ marginBottom: 18, paddingTop: 4 }}>
        <div style={{ fontSize: 14, color: C.muted }}>Hello, {settings.name || "there"}! 👋</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      {/* Total balance hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.green}22 0%, ${C.teal}11 100%)`, border: `1px solid ${C.green}40`, borderRadius: 20, padding: "22px 20px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Total Balance</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: totalBalance >= 0 ? C.greenLight : C.red, letterSpacing: -1, margin: "6px 0 4px" }}>{totalBalance < 0 ? "-" : ""}{curSym}{fmt(Math.abs(totalBalance))}</div>
        <div style={{ fontSize: 12, color: C.mutedLight }}>Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</div>
        {accounts.length === 0 && <button style={{ ...S.btnSm(C.green, true), marginTop: 10 }} onClick={() => navigate("accounts")}>+ Add Account</button>}
      </div>

      {/* Alerts */}
      {overdueBills.length > 0 && (
        <div onClick={() => navigate("bills")} style={{ background: C.red + "15", border: `1px solid ${C.red}35`, borderRadius: 14, padding: "11px 14px", marginBottom: 10, display: "flex", gap: 10, cursor: "pointer" }}>
          <Icon name="alert" size={17} color={C.red} />
          <div style={{ fontSize: 13 }}><b style={{ color: C.red }}>{overdueBills.length} overdue bill{overdueBills.length > 1 ? "s" : ""}!</b> <span style={{ color: C.muted }}>Tap to pay →</span></div>
        </div>
      )}
      {bPct >= 80 && budget.total > 0 && (
        <div style={{ background: C.orange + "15", border: `1px solid ${C.orange}35`, borderRadius: 14, padding: "11px 14px", marginBottom: 10, display: "flex", gap: 10 }}>
          <Icon name="alert" size={17} color={C.orange} />
          <div style={{ fontSize: 13, color: C.orange }}>⚠️ Budget {bPct >= 100 ? "exceeded" : `${Math.round(bPct)}% used`} — {curSym}{fmt(Math.abs(bLeft))} {bLeft >= 0 ? "left" : "over"}</div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "SPENT THIS MONTH", val: totalSpent, color: C.red, prefix: "-" },
          { label: "INCOME THIS MONTH", val: totalInc, color: C.green, prefix: "+" },
          { label: "TOTAL OWED", val: Math.max(totalDebt, 0), color: C.orange },
          { label: "TO RECEIVE", val: Math.max(totalLend, 0), color: C.blue },
        ].map(({ label, val, color, prefix }) => (
          <div key={label} style={{ background: color + "12", border: `1px solid ${color}25`, borderRadius: 16, padding: "14px 14px" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 4 }}>{prefix || ""}{curSym}{fmt(val)}</div>
          </div>
        ))}
      </div>

      {/* Account cards */}
      {accounts.length > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>My Accounts</div>
            <button style={S.btnSm(C.green, true)} onClick={() => navigate("accounts")}>Manage</button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {accounts.map(a => {
              const bal = getAccountBalance(a, expenses, income, debts, lending, bills);
              return (
                <div key={a.id} style={{ minWidth: 140, background: (a.color || C.green) + "18", border: `1px solid ${a.color || C.green}35`, borderRadius: 14, padding: "12px 14px", flexShrink: 0 }}>
                  <div style={{ fontSize: 18 }}>{ACC_TYPE_ICONS[a.type] || "💰"}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mutedLight, marginTop: 4 }}>{a.name}</div>
                  {a.bankName && <div style={{ fontSize: 11, color: C.muted }}>{a.bankName}</div>}
                  <div style={{ fontSize: 17, fontWeight: 900, color: bal >= 0 ? (a.color || C.green) : C.red, marginTop: 6 }}>{bal < 0 ? "-" : ""}{curSym}{fmt(Math.abs(bal))}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget bar */}
      {budget.total > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Monthly Budget</span>
            <span style={{ fontSize: 13, color: bLeft >= 0 ? C.green : C.red, fontWeight: 700 }}>{bLeft >= 0 ? `${curSym}${fmt(bLeft)} left` : `Over ${curSym}${fmt(Math.abs(bLeft))}`}</span>
          </div>
          <Progress pct={bPct} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginTop: 6 }}>
            <span>Spent {curSym}{fmt(totalSpent)}</span>
            <span>Budget {curSym}{fmt(budget.total)}</span>
          </div>
        </div>
      )}

      {/* Upcoming bills */}
      {upcomingBills.length > 0 && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>Upcoming Bills</span>
            <button style={S.btnSm(C.green, true)} onClick={() => navigate("bills")}>See all</button>
          </div>
          {upcomingBills.slice(0, 3).map(b => {
            const d = daysUntil(b.dueDate);
            const totalPaid = (b.payments || []).reduce((s, pp) => s + Number(pp.amount), 0);
            const remaining = Number(b.amount) - totalPaid;
            return (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: d <= 0 ? C.red : d <= 2 ? C.orange : C.muted }}>{d === 0 ? "Due Today!" : d < 0 ? "Overdue!" : `In ${d} day${d !== 1 ? "s" : ""}`}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={S.tag(d <= 1 ? C.red : d <= 3 ? C.orange : C.yellow)}>{curSym}{fmt(remaining)}</div>
                  {totalPaid > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{curSym}{fmt(totalPaid)} paid</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent transactions */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Recent Transactions</span>
          <button style={S.btnSm(C.green, true)} onClick={() => navigate("expenses")}>See all</button>
        </div>
        {recentTx.length === 0 && <div style={S.empty}>No transactions yet. Add your first expense!</div>}
        {recentTx.map(t => {
          const acc = accounts.find(a => a.id === t.accountId);
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t._t === "income" ? (t.source || t.category) : t.category}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{fmtDate(t.date)}{acc ? ` · ${ACC_TYPE_ICONS[acc.type] || ""} ${acc.name}` : ""}</div>
              </div>
              <span style={{ fontWeight: 800, color: t._t === "income" ? C.green : C.red, fontSize: 14 }}>
                {t._t === "income" ? "+" : "-"}{curSym}{fmt(t.amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button style={{ ...S.btn(C.red), margin: 0 }} onClick={() => openModal("expense", { date: today() })}>+ Expense</button>
        <button style={{ ...S.btn(C.teal), margin: 0 }} onClick={() => openModal("income", { date: today() })}>+ Income</button>
        <button style={{ ...S.btn(C.orange), margin: 0 }} onClick={() => openModal("debt")}>+ Debt</button>
        <button style={{ ...S.btn(C.blue), margin: 0 }} onClick={() => openModal("lending")}>+ Lending</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════
function AccountsPage({ accounts, setAccounts, expenses, income, debts, lending, bills, openModal, del, curSym }) {
  const totalBal = getTotalBalance(accounts, expenses, income, debts, lending, bills);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Accounts</div>
        <button style={S.btnSm()} onClick={() => openModal("account")}>+ Add</button>
      </div>
      <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Net Worth</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: totalBal >= 0 ? C.greenLight : C.red }}>{totalBal < 0 ? "-" : ""}{curSym}{fmt(Math.abs(totalBal))}</div>
      </div>
      {accounts.length === 0 && <div style={S.empty}>No accounts yet. Add a bank account, Revolut, Wise, or cash!</div>}
      {accounts.map(a => {
        const bal = getAccountBalance(a, expenses, income, debts, lending, bills);
        const expFromAcc = expenses.filter(e => e.accountId === a.id).reduce((s, e) => s + Number(e.amount), 0);
        const incToAcc = income.filter(i => i.accountId === a.id).reduce((s, i) => s + Number(i.amount), 0);
        return (
          <div key={a.id} style={{ ...S.card, borderLeft: `4px solid ${a.color || C.green}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{ACC_TYPE_ICONS[a.type] || "💰"}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{a.name}</div>
                    {a.bankName && <div style={{ fontSize: 11, color: C.muted }}>{a.bankName}</div>}
                    <div style={{ ...S.tag(a.color || C.green), marginTop: 4 }}>{a.type}</div>
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: bal >= 0 ? (a.color || C.green) : C.red, marginTop: 10 }}>{bal < 0 ? "-" : ""}{curSym}{fmt(Math.abs(bal))}</div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <div style={{ fontSize: 12 }}><span style={{ color: C.green }}>+{curSym}{fmt(incToAcc)}</span> <span style={{ color: C.muted }}>in</span></div>
                  <div style={{ fontSize: 12 }}><span style={{ color: C.red }}>-{curSym}{fmt(expFromAcc)}</span> <span style={{ color: C.muted }}>out</span></div>
                  <div style={{ fontSize: 12, color: C.muted }}>Opening: {curSym}{fmt(a.initialBalance)}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button style={S.btnSm(C.blue, true)} onClick={() => openModal("account", { ...a })}>Edit</button>
                <button style={S.btnSm(C.red, true)} onClick={() => del(setAccounts, a.id)}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: EXPENSES
// ═══════════════════════════════════════════════════════════════════════════════
function Expenses({ expenses, setExpenses, accounts, income, debts, lending, bills, openModal, del, curSym }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = expenses.filter(e => (filter === "All" || e.category === filter) && (!search || [e.note, e.category].some(x => x?.toLowerCase().includes(search.toLowerCase())))).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Expenses</div>
        <button style={S.btnSm(C.red)} onClick={() => openModal("expense", { date: today() })}>+ Add</button>
      </div>
      <input style={{ ...S.input, marginBottom: 10 }} placeholder="🔍 Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
        {["All", ...CATS].map(c => <button key={c} onClick={() => setFilter(c)} style={{ ...S.btnSm(filter === c ? C.red : C.surface, filter !== c), flexShrink: 0 }}>{c}</button>)}
      </div>
      <div style={{ ...S.card, display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: C.muted }}>{filtered.length} transactions</span>
        <span style={{ fontWeight: 800, color: C.red }}>{curSym}{fmt(total)}</span>
      </div>
      {filtered.length === 0 && <div style={S.empty}>No expenses found</div>}
      {filtered.map(e => {
        const acc = accounts.find(a => a.id === e.accountId);
        return (
          <div key={e.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <Badge text={e.category} color={CAT_COLORS[e.category] || C.red} />
                  {acc && <Badge text={`${ACC_TYPE_ICONS[acc.type] || ""} ${acc.name}`} color={acc.color || C.green} />}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.red }}>{curSym}{fmt(e.amount)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtDate(e.date)} · {e.paymentMethod}</div>
                {e.note && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>{e.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button style={S.btnSm(C.blue, true)} onClick={() => openModal("expense", { ...e })}>Edit</button>
                <button style={S.btnSm(C.red, true)} onClick={() => del(setExpenses, e.id)}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: INCOME
// ═══════════════════════════════════════════════════════════════════════════════
function Income({ income, setIncome, accounts, expenses, debts, lending, bills, openModal, del, curSym }) {
  const [filter, setFilter] = useState("All");
  const filtered = income.filter(i => filter === "All" || i.category === filter).sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = filtered.reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Income</div>
        <button style={S.btnSm(C.teal)} onClick={() => openModal("income", { date: today() })}>+ Add</button>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
        {["All", ...INC_CATS].map(c => <button key={c} onClick={() => setFilter(c)} style={{ ...S.btnSm(filter === c ? C.teal : C.surface, filter !== c), flexShrink: 0 }}>{c}</button>)}
      </div>
      <div style={{ ...S.card, display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: C.muted }}>{filtered.length} entries</span>
        <span style={{ fontWeight: 800, color: C.green }}>{curSym}{fmt(total)}</span>
      </div>
      {filtered.length === 0 && <div style={S.empty}>No income recorded yet</div>}
      {filtered.map(i => {
        const acc = accounts.find(a => a.id === i.accountId);
        return (
          <div key={i.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <Badge text={i.category} color={C.teal} />
                  {acc && <Badge text={`${ACC_TYPE_ICONS[acc.type] || ""} ${acc.name}`} color={acc.color || C.green} />}
                </div>
                {i.source && <div style={{ fontSize: 13, color: C.mutedLight, marginBottom: 2 }}>{i.source}</div>}
                <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>+{curSym}{fmt(i.amount)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{fmtDate(i.date)} · {i.paymentMethod}</div>
                {i.note && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>{i.note}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button style={S.btnSm(C.blue, true)} onClick={() => openModal("income", { ...i })}>Edit</button>
                <button style={S.btnSm(C.red, true)} onClick={() => del(setIncome, i.id)}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DEBTS
// ═══════════════════════════════════════════════════════════════════════════════
function Debts({ debts, setDebts, accounts, expenses, income, lending, bills, openModal, del, curSym }) {
  const addPayment = (debtId, payment) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const payments = [...(d.payments || []), payment];
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...d, payments, paid: totalPaid >= Number(d.amount) };
    }));
  };
  const delPayment = (debtId, payId) => {
    setDebts(prev => prev.map(d => {
      if (d.id !== debtId) return d;
      const payments = (d.payments || []).filter(p => p.id !== payId);
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...d, payments, paid: totalPaid >= Number(d.amount) };
    }));
  };
  const unpaid = debts.filter(d => !d.paid);
  const paid = debts.filter(d => d.paid);
  const totalOwed = unpaid.reduce((s, d) => {
    const tp = (d.payments || []).reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(Number(d.amount) - tp, 0);
  }, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Debts</div>
        <button style={S.btnSm(C.orange)} onClick={() => openModal("debt")}>+ Add</button>
      </div>
      <div style={{ background: C.orange + "12", border: `1px solid ${C.orange}30`, borderRadius: 16, padding: "16px 16px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Total Outstanding</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.orange }}>{curSym}{fmt(totalOwed)}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{unpaid.length} active · {paid.length} settled</div>
      </div>
      {unpaid.length === 0 && <div style={S.empty}>🎉 No outstanding debts!</div>}
      {unpaid.map(d => <DebtCard key={d.id} d={d} accounts={accounts} expenses={expenses} income={income} lending={lending} bills={bills} onEdit={() => openModal("debt", { ...d })} onDel={() => del(setDebts, d.id)} onPay={(payment) => addPayment(d.id, payment)} onDelPay={(pid) => delPayment(d.id, pid)} openModal={openModal} curSym={curSym} />)}
      {paid.length > 0 && <>
        <div style={{ fontSize: 12, color: C.muted, margin: "16px 0 8px", fontWeight: 700 }}>✅ SETTLED</div>
        {paid.map(d => <DebtCard key={d.id} d={d} accounts={accounts} expenses={expenses} income={income} lending={lending} bills={bills} onEdit={() => openModal("debt", { ...d })} onDel={() => del(setDebts, d.id)} onPay={(payment) => addPayment(d.id, payment)} onDelPay={(pid) => delPayment(d.id, pid)} openModal={openModal} curSym={curSym} />)}
      </>}
    </div>
  );
}

function DebtCard({ d, accounts, expenses, income, lending, bills, onEdit, onDel, onPay, onDelPay, openModal, curSym }) {
  const [showPay, setShowPay] = useState(false);
  const totalPaid = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(Number(d.amount) - totalPaid, 0);
  const pct = Number(d.amount) > 0 ? (totalPaid / Number(d.amount)) * 100 : 0;
  const du = daysUntil(d.dueDate);
  return (
    <div style={{ ...S.card, opacity: d.paid ? 0.65 : 1, borderLeft: `3px solid ${isOverdue(d.dueDate) && !d.paid ? C.red : C.orange}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{d.contactName || "Unknown"}</div>
          {d.contactPhone && <div style={{ fontSize: 12, color: C.muted }}>{d.contactPhone}</div>}
          <div style={{ fontSize: 24, fontWeight: 900, color: d.paid ? C.muted : C.orange, marginTop: 6 }}>{curSym}{fmt(remaining)} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>remaining</span></div>
          {totalPaid > 0 && <div style={{ fontSize: 12, color: C.green }}>{curSym}{fmt(totalPaid)} of {curSym}{fmt(d.amount)} paid</div>}
          {d.dueDate && <div style={{ fontSize: 12, color: isOverdue(d.dueDate) && !d.paid ? C.red : C.muted, marginTop: 4 }}>Due: {fmtDate(d.dueDate)} {!d.paid && du !== null && (isOverdue(d.dueDate) ? "⚠️ Overdue" : du === 0 ? "Today!" : `(${du}d)`)}</div>}
          {d.note && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>{d.note}</div>}
          {Number(d.amount) > 0 && <div style={{ marginTop: 8 }}><Progress pct={pct} color={C.orange} height={6} /></div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          {!d.paid && <button style={S.btnSm(C.green)} onClick={() => setShowPay(true)}>Pay 💸</button>}
          <button style={S.btnSm(C.blue, true)} onClick={onEdit}>Edit</button>
          <button style={S.btnSm(C.red, true)} onClick={onDel}>Del</button>
        </div>
      </div>
      {/* Payment history */}
      {(d.payments || []).length > 0 && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>PAYMENT HISTORY</div>
          {d.payments.map(p => {
            const acc = accounts.find(a => a.id === p.accountId);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: C.mutedLight }}>{fmtDate(p.date)}{acc ? ` · ${acc.name}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>-{curSym}{fmt(p.amount)}</span>
                  <button onClick={() => onDelPay(p.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showPay && (
        <Modal onClose={() => setShowPay(false)}>
          <PaymentForm title={`Pay Debt to ${d.contactName}`} maxAmount={remaining} onSave={(p) => { onPay(p); setShowPay(false); }} onClose={() => setShowPay(false)} curSym={curSym} accounts={accounts} expenses={expenses} income={income} debts={[]} lending={[]} bills={[]} accentColor={C.orange} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: LENDING
// ═══════════════════════════════════════════════════════════════════════════════
function Lending({ lending, setLending, accounts, expenses, income, debts, bills, openModal, del, curSym }) {
  const addPayment = (lendId, payment) => {
    setLending(prev => prev.map(l => {
      if (l.id !== lendId) return l;
      const payments = [...(l.payments || []), payment];
      const totalRec = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...l, payments, paid: totalRec >= Number(l.amount) };
    }));
  };
  const delPayment = (lendId, payId) => {
    setLending(prev => prev.map(l => {
      if (l.id !== lendId) return l;
      const payments = (l.payments || []).filter(p => p.id !== payId);
      const totalRec = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...l, payments, paid: totalRec >= Number(l.amount) };
    }));
  };
  const unpaid = lending.filter(l => !l.paid);
  const paid = lending.filter(l => l.paid);
  const totalPending = unpaid.reduce((s, l) => {
    const tr = (l.payments || []).reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(Number(l.amount) - tr, 0);
  }, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Lending</div>
        <button style={S.btnSm(C.blue)} onClick={() => openModal("lending")}>+ Add</button>
      </div>
      <div style={{ background: C.blue + "12", border: `1px solid ${C.blue}30`, borderRadius: 16, padding: "16px 16px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Total Pending</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.blue }}>{curSym}{fmt(totalPending)}</div>
        <div style={{ fontSize: 12, color: C.muted }}>{unpaid.length} active · {paid.length} returned</div>
      </div>
      {unpaid.length === 0 && <div style={S.empty}>No active lending records</div>}
      {unpaid.map(l => <LendCard key={l.id} l={l} accounts={accounts} expenses={expenses} income={income} debts={debts} bills={bills} onEdit={() => openModal("lending", { ...l })} onDel={() => del(setLending, l.id)} onReceive={(p) => addPayment(l.id, p)} onDelPay={(pid) => delPayment(l.id, pid)} curSym={curSym} />)}
      {paid.length > 0 && <>
        <div style={{ fontSize: 12, color: C.muted, margin: "16px 0 8px", fontWeight: 700 }}>✅ FULLY RETURNED</div>
        {paid.map(l => <LendCard key={l.id} l={l} accounts={accounts} expenses={expenses} income={income} debts={debts} bills={bills} onEdit={() => openModal("lending", { ...l })} onDel={() => del(setLending, l.id)} onReceive={(p) => addPayment(l.id, p)} onDelPay={(pid) => delPayment(l.id, pid)} curSym={curSym} />)}
      </>}
    </div>
  );
}

function LendCard({ l, accounts, expenses, income, debts, bills, onEdit, onDel, onReceive, onDelPay, curSym }) {
  const [showRec, setShowRec] = useState(false);
  const totalRec = (l.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(Number(l.amount) - totalRec, 0);
  const pct = Number(l.amount) > 0 ? (totalRec / Number(l.amount)) * 100 : 0;
  const du = daysUntil(l.returnDate);
  return (
    <div style={{ ...S.card, opacity: l.paid ? 0.65 : 1, borderLeft: `3px solid ${C.blue}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{l.contactName || "Unknown"}</div>
          {l.contactPhone && <div style={{ fontSize: 12, color: C.muted }}>{l.contactPhone}</div>}
          <div style={{ fontSize: 24, fontWeight: 900, color: l.paid ? C.muted : C.blue, marginTop: 6 }}>{curSym}{fmt(remaining)} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>pending</span></div>
          {totalRec > 0 && <div style={{ fontSize: 12, color: C.green }}>{curSym}{fmt(totalRec)} of {curSym}{fmt(l.amount)} received</div>}
          {l.returnDate && <div style={{ fontSize: 12, color: isOverdue(l.returnDate) && !l.paid ? C.orange : C.muted, marginTop: 4 }}>Return by: {fmtDate(l.returnDate)} {!l.paid && du !== null && isOverdue(l.returnDate) ? "⚠️ Overdue" : ""}</div>}
          {l.note && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>{l.note}</div>}
          {Number(l.amount) > 0 && <div style={{ marginTop: 8 }}><Progress pct={pct} color={C.blue} height={6} /></div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          {!l.paid && <button style={S.btnSm(C.green)} onClick={() => setShowRec(true)}>Recv ✓</button>}
          <button style={S.btnSm(C.blue, true)} onClick={onEdit}>Edit</button>
          <button style={S.btnSm(C.red, true)} onClick={onDel}>Del</button>
        </div>
      </div>
      {(l.payments || []).length > 0 && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>RECEIVED PAYMENTS</div>
          {l.payments.map(p => {
            const acc = accounts.find(a => a.id === p.accountId);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: C.mutedLight }}>{fmtDate(p.date)}{acc ? ` · ${acc.name}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>+{curSym}{fmt(p.amount)}</span>
                  <button onClick={() => onDelPay(p.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showRec && (
        <Modal onClose={() => setShowRec(false)}>
          <PaymentForm title={`Receive from ${l.contactName}`} maxAmount={remaining} onSave={(p) => { onReceive(p); setShowRec(false); }} onClose={() => setShowRec(false)} curSym={curSym} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={[]} bills={bills} accentColor={C.blue} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: BILLS
// ═══════════════════════════════════════════════════════════════════════════════
function Bills({ bills, setBills, accounts, expenses, income, debts, lending, openModal, del, curSym }) {
  const addPayment = (billId, payment) => {
    setBills(prev => prev.map(b => {
      if (b.id !== billId) return b;
      const payments = [...(b.payments || []), payment];
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...b, payments, paid: totalPaid >= Number(b.amount) };
    }));
  };
  const delPayment = (billId, payId) => {
    setBills(prev => prev.map(b => {
      if (b.id !== billId) return b;
      const payments = (b.payments || []).filter(p => p.id !== payId);
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { ...b, payments, paid: totalPaid >= Number(b.amount) };
    }));
  };
  const unpaid = bills.filter(b => !b.paid).sort((a, b) => (daysUntil(a.dueDate) || 999) - (daysUntil(b.dueDate) || 999));
  const paid = bills.filter(b => b.paid);
  const totalUnpaid = unpaid.reduce((s, b) => {
    const tp = (b.payments || []).reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(Number(b.amount) - tp, 0);
  }, 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Bills & Recurring</div>
        <button style={S.btnSm()} onClick={() => openModal("bill")}>+ Add</button>
      </div>
      <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Unpaid Bills</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{curSym}{fmt(totalUnpaid)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: C.muted }}>{unpaid.length} unpaid · {paid.length} paid</div>
          <div style={{ fontSize: 12, color: C.orange }}>{unpaid.filter(b => isOverdue(b.dueDate)).length} overdue</div>
        </div>
      </div>
      {unpaid.length === 0 && <div style={S.empty}>🎉 All bills paid!</div>}
      {unpaid.map(b => <BillCard key={b.id} b={b} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={lending} onEdit={() => openModal("bill", { ...b })} onDel={() => del(setBills, b.id)} onPay={(p) => addPayment(b.id, p)} onDelPay={(pid) => delPayment(b.id, pid)} curSym={curSym} />)}
      {paid.length > 0 && <>
        <div style={{ fontSize: 12, color: C.muted, margin: "16px 0 8px", fontWeight: 700 }}>✅ PAID</div>
        {paid.map(b => <BillCard key={b.id} b={b} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={lending} onEdit={() => openModal("bill", { ...b })} onDel={() => del(setBills, b.id)} onPay={(p) => addPayment(b.id, p)} onDelPay={(pid) => delPayment(b.id, pid)} curSym={curSym} />)}
      </>}
    </div>
  );
}

function BillCard({ b, accounts, expenses, income, debts, lending, onEdit, onDel, onPay, onDelPay, curSym }) {
  const [showPay, setShowPay] = useState(false);
  const totalPaid = (b.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(Number(b.amount) - totalPaid, 0);
  const pct = Number(b.amount) > 0 ? (totalPaid / Number(b.amount)) * 100 : 0;
  const du = daysUntil(b.dueDate);
  const over = isOverdue(b.dueDate) && !b.paid;
  const soon = isDueSoon(b.dueDate, 3) && !b.paid;
  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${over ? C.red : soon ? C.orange : C.green}`, opacity: b.paid ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <Badge text={b.repeat} color={C.green} />
            {over && <Badge text="Overdue" color={C.red} />}
            {soon && !over && <Badge text="Due Soon" color={C.orange} />}
          </div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{b.title}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: b.paid ? C.muted : C.text, marginTop: 4 }}>{curSym}{fmt(remaining)} <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>remaining</span></div>
          {totalPaid > 0 && <div style={{ fontSize: 12, color: C.green }}>{curSym}{fmt(totalPaid)} of {curSym}{fmt(b.amount)} paid</div>}
          {b.dueDate && <div style={{ fontSize: 12, color: over ? C.red : C.muted, marginTop: 2 }}>Due: {fmtDate(b.dueDate)} {!b.paid && du !== null ? (over ? "⚠️" : du === 0 ? "📢 Today!" : `(${du}d)`) : ""}</div>}
          {b.reminderDays > 0 && <div style={{ fontSize: 11, color: C.muted }}>🔔 {b.reminderDays}d reminder</div>}
          {Number(b.amount) > 0 && <div style={{ marginTop: 8 }}><Progress pct={pct} color={C.green} height={5} /></div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0, marginLeft: 8 }}>
          {!b.paid && <button style={S.btnSm(C.green)} onClick={() => setShowPay(true)}>Pay 💳</button>}
          <button style={S.btnSm(C.blue, true)} onClick={onEdit}>Edit</button>
          <button style={S.btnSm(C.red, true)} onClick={onDel}>Del</button>
        </div>
      </div>
      {(b.payments || []).length > 0 && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>PAYMENT HISTORY</div>
          {b.payments.map(p => {
            const acc = accounts.find(a => a.id === p.accountId);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                <span style={{ color: C.mutedLight }}>{fmtDate(p.date)}{acc ? ` · ${acc.name}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>-{curSym}{fmt(p.amount)}</span>
                  <button onClick={() => onDelPay(p.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showPay && (
        <Modal onClose={() => setShowPay(false)}>
          <PaymentForm title={`Pay: ${b.title}`} maxAmount={remaining} onSave={(p) => { onPay(p); setShowPay(false); }} onClose={() => setShowPay(false)} curSym={curSym} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={lending} bills={[]} accentColor={C.green} />
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: BUDGET
// ═══════════════════════════════════════════════════════════════════════════════
function Budget({ budget, setBudget, expenses, openModal, curSym }) {
  const mkm_ = monthKey();
  const mExp = expenses.filter(e => e.date?.startsWith(mkm_));
  const total = budget.total || 0;
  const totalSpent = mExp.reduce((s, e) => s + Number(e.amount), 0);
  const catSpent = {};
  mExp.forEach(e => { catSpent[e.category] = (catSpent[e.category] || 0) + Number(e.amount); });
  const pct = total ? (totalSpent / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Budget</div>
        <button style={S.btnSm()} onClick={() => openModal("budget")}>Edit</button>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Monthly Budget</div>
        <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>{curSym}{fmt(total)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 8px" }}>
          <span style={{ fontSize: 13, color: C.red }}>Spent: {curSym}{fmt(totalSpent)}</span>
          <span style={{ fontSize: 13, color: total - totalSpent >= 0 ? C.green : C.red }}>Left: {curSym}{fmt(total - totalSpent)}</span>
        </div>
        <Progress pct={pct} />
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{total ? `${Math.round(pct)}% used` : "No budget set"}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, margin: "16px 0 10px" }}>Category Budgets</div>
      {CATS.map(c => {
        const catBudget = Number(budget.cats?.[c] || 0);
        const spent = catSpent[c] || 0;
        const p = catBudget ? (spent / catBudget) * 100 : 0;
        return (
          <div key={c} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{curSym}{fmt(spent)} / {catBudget ? curSym + fmt(catBudget) : "—"}</span>
            </div>
            {catBudget > 0 ? <Progress pct={p} color={CAT_COLORS[c] || C.teal} height={7} /> : <div style={{ fontSize: 11, color: C.muted }}>No budget set</div>}
            {p >= 80 && catBudget > 0 && <div style={{ fontSize: 11, color: p >= 100 ? C.red : C.orange, marginTop: 4 }}>⚠️ {Math.round(p)}% used</div>}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: CONTACTS
// ═══════════════════════════════════════════════════════════════════════════════
function Contacts({ contacts, setContacts, debts, lending, openModal, del, curSym }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Contacts</div>
        <button style={S.btnSm()} onClick={() => openModal("contact")}>+ Add</button>
      </div>
      {contacts.length === 0 && <div style={S.empty}>No contacts yet</div>}
      {contacts.map(c => {
        const owed = debts.filter(d => !d.paid && d.contactName?.toLowerCase() === c.name.toLowerCase()).reduce((s, d) => {
          const tp = (d.payments || []).reduce((a, p) => a + Number(p.amount), 0);
          return s + Math.max(Number(d.amount) - tp, 0);
        }, 0);
        const toRec = lending.filter(l => !l.paid && l.contactName?.toLowerCase() === c.name.toLowerCase()).reduce((s, l) => {
          const tr = (l.payments || []).reduce((a, p) => a + Number(p.amount), 0);
          return s + Math.max(Number(l.amount) - tr, 0);
        }, 0);
        return (
          <div key={c.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                {c.phone && <div style={{ fontSize: 13, color: C.muted }}>{c.phone}</div>}
                {c.note && <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 4 }}>{c.note}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {owed > 0 && <Badge text={`You owe: ${curSym}${fmt(owed)}`} color={C.orange} />}
                  {toRec > 0 && <Badge text={`Owes you: ${curSym}${fmt(toRec)}`} color={C.blue} />}
                  {owed === 0 && toRec === 0 && <Badge text="No active balance" color={C.muted} />}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnSm(C.blue, true)} onClick={() => openModal("contact", { ...c })}>Edit</button>
                <button style={S.btnSm(C.red, true)} onClick={() => del(setContacts, c.id)}>Del</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: REPORTS (Enhanced visual)
// ═══════════════════════════════════════════════════════════════════════════════
function Reports({ expenses, income, debts, lending, bills, accounts, curSym }) {
  const months = last6Months();
  const curMk = monthKey();
  const mExp = expenses.filter(e => e.date?.startsWith(curMk));
  const mInc = income.filter(i => i.date?.startsWith(curMk));
  const totalSpent = mExp.reduce((s, e) => s + Number(e.amount), 0);
  const totalInc = mInc.reduce((s, i) => s + Number(i.amount), 0);
  const net = totalInc - totalSpent;

  const byCat = {};
  mExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const catArr = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const byIncCat = {};
  mInc.forEach(i => { byIncCat[i.category] = (byIncCat[i.category] || 0) + Number(i.amount); });

  // Monthly trends
  const monthData = months.map(mk => {
    const exp = expenses.filter(e => e.date?.startsWith(mk)).reduce((s, e) => s + Number(e.amount), 0);
    const inc = income.filter(i => i.date?.startsWith(mk)).reduce((s, i) => s + Number(i.amount), 0);
    return { mk, exp, inc, label: mk.slice(5) + "/" + mk.slice(2, 4) };
  });
  const maxVal = Math.max(...monthData.map(m => Math.max(m.exp, m.inc)), 1);

  const totalDebt = debts.filter(d => !d.paid).reduce((s, d) => {
    const tp = (d.payments || []).reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(Number(d.amount) - tp, 0);
  }, 0);
  const totalLend = lending.filter(l => !l.paid).reduce((s, l) => {
    const tr = (l.payments || []).reduce((a, p) => a + Number(p.amount), 0);
    return s + Math.max(Number(l.amount) - tr, 0);
  }, 0);
  const totalBal = getTotalBalance(accounts, expenses, income, debts, lending, bills);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Reports — {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { l: "NET WORTH", v: totalBal, c: totalBal >= 0 ? C.greenLight : C.red },
          { l: "NET THIS MONTH", v: net, c: net >= 0 ? C.green : C.red },
          { l: "INCOME", v: totalInc, c: C.teal },
          { l: "EXPENSES", v: totalSpent, c: C.red },
          { l: "TOTAL OWED", v: totalDebt, c: C.orange },
          { l: "TO RECEIVE", v: totalLend, c: C.blue },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ background: c + "10", border: `1px solid ${c}22`, borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: c, marginTop: 4 }}>{v < 0 && v !== totalBal ? "-" : v < 0 ? "-" : ""}{curSym}{fmt(Math.abs(v))}</div>
          </div>
        ))}
      </div>

      {/* 6-month bar chart */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>6-Month Overview</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {monthData.map(m => (
            <div key={m.mk} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
                <div style={{ flex: 1, background: C.teal, borderRadius: "4px 4px 0 0", height: `${(m.inc / maxVal) * 90}px`, minHeight: m.inc > 0 ? 3 : 0, opacity: 0.85 }} />
                <div style={{ flex: 1, background: C.red, borderRadius: "4px 4px 0 0", height: `${(m.exp / maxVal) * 90}px`, minHeight: m.exp > 0 ? 3 : 0, opacity: 0.85 }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, textAlign: "center" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 10, height: 10, background: C.teal, borderRadius: 2 }} /><span style={{ fontSize: 11, color: C.muted }}>Income</span></div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}><div style={{ width: 10, height: 10, background: C.red, borderRadius: 2 }} /><span style={{ fontSize: 11, color: C.muted }}>Expenses</span></div>
        </div>
      </div>

      {/* Account balances */}
      {accounts.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Account Balances</div>
          {accounts.map(a => {
            const bal = getAccountBalance(a, expenses, income, debts, lending, bills);
            const allBals = accounts.map(acc => Math.abs(getAccountBalance(acc, expenses, income, debts, lending, bills)));
            const maxB = Math.max(...allBals, 1);
            return (
              <div key={a.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{ACC_TYPE_ICONS[a.type] || ""} {a.name}{a.bankName ? ` · ${a.bankName}` : ""}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: bal >= 0 ? (a.color || C.green) : C.red }}>{bal < 0 ? "-" : ""}{curSym}{fmt(Math.abs(bal))}</span>
                </div>
                <Progress pct={(Math.abs(bal) / maxB) * 100} color={a.color || C.green} height={7} />
              </div>
            );
          })}
        </div>
      )}

      {/* Spending by category */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Spending by Category</div>
        {catArr.length === 0 && <div style={S.empty}>No expenses this month</div>}
        {catArr.map(([cat, amt]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 10, height: 10, background: CAT_COLORS[cat] || C.red, borderRadius: "50%" }} />
                <span style={{ fontSize: 13 }}>{cat}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{curSym}{fmt(amt)} <span style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>{totalSpent ? Math.round(amt / totalSpent * 100) : 0}%</span></span>
            </div>
            <Progress pct={totalSpent ? (amt / totalSpent) * 100 : 0} color={CAT_COLORS[cat] || C.red} height={7} />
          </div>
        ))}
      </div>

      {/* Income breakdown */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Income by Type</div>
        {Object.entries(byIncCat).length === 0 && <div style={S.empty}>No income this month</div>}
        {Object.entries(byIncCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>{cat}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{curSym}{fmt(amt)} <span style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>{totalInc ? Math.round(amt / totalInc * 100) : 0}%</span></span>
            </div>
            <Progress pct={totalInc ? (amt / totalInc) * 100 : 0} color={C.teal} height={7} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: AI ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════════
function AIAssistant({ expenses, income, debts, lending, bills, budget, accounts, curSym }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", text: "👋 Hi! I'm your Money Reminder AI. I can summarize spending, check who owes you, review bills, warn about budget overruns, or draft polite reminder messages. Ask me anything!" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const mkm_ = monthKey();
  const mExp = expenses.filter(e => e.date?.startsWith(mkm_));
  const mInc = income.filter(i => i.date?.startsWith(mkm_));
  const byCat = {};
  mExp.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
  const totalBal = getTotalBalance(accounts, expenses, income, debts, lending, bills);

  const ctx = `You are a smart personal finance AI assistant inside "Money Reminder AI" app.
Today: ${new Date().toDateString()} | Currency: ${curSym}
Total balance across accounts: ${curSym}${fmt(totalBal)}
Account breakdown: ${accounts.map(a => `${a.name}(${curSym}${fmt(getAccountBalance(a, expenses, income, debts, lending, bills))})`).join(", ") || "none"}
Monthly budget: ${curSym}${budget.total || 0}
This month spending: ${curSym}${mExp.reduce((s, e) => s + Number(e.amount), 0).toFixed(2)}
This month income: ${curSym}${mInc.reduce((s, i) => s + Number(i.amount), 0).toFixed(2)}
Spending by category: ${JSON.stringify(byCat)}
Active debts: ${JSON.stringify(debts.filter(d => !d.paid).map(d => { const tp = (d.payments || []).reduce((s, p) => s + Number(p.amount), 0); return { name: d.contactName, remaining: Number(d.amount) - tp, due: d.dueDate }; }))}
Active lending: ${JSON.stringify(lending.filter(l => !l.paid).map(l => { const tr = (l.payments || []).reduce((s, p) => s + Number(p.amount), 0); return { name: l.contactName, remaining: Number(l.amount) - tr, return: l.returnDate }; }))}
Unpaid bills: ${JSON.stringify(bills.filter(b => !b.paid).map(b => { const tp = (b.payments || []).reduce((s, p) => s + Number(p.amount), 0); return { title: b.title, remaining: Number(b.amount) - tp, due: b.dueDate, overdue: isOverdue(b.dueDate) }; }))}
Be concise, helpful, and friendly. No markdown. When drafting reminder messages, make them polite and professional.`;

  const QUICK = ["What's my total balance?", "Bills due this week?", "Who owes me money?", "Am I over budget?", "Monthly spending summary", "Write a repayment reminder"];

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const newMsgs = [...msgs, { role: "user", text }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: ctx,
          messages: newMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
        }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { role: "assistant", text: data.content?.[0]?.text || "Sorry, could not connect." }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", text: "Connection error. Please try again." }]);
    }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>🤖 AI Assistant</div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 14, scrollbarWidth: "none" }}>
        {QUICK.map(q => <button key={q} style={{ ...S.btnSm(C.surface), flexShrink: 0, border: `1px solid ${C.cardBorder}` }} onClick={() => send(q)}>{q}</button>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, minHeight: 180 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ background: m.role === "user" ? C.green : C.surface, color: m.role === "user" ? "#061009" : C.text, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", maxWidth: "84%", fontSize: 14, lineHeight: 1.55, border: m.role !== "user" ? `1px solid ${C.cardBorder}` : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ background: C.surface, borderRadius: "16px 16px 16px 4px", padding: "10px 16px", border: `1px solid ${C.cardBorder}`, color: C.muted, fontSize: 14 }}>Thinking…</div></div>}
        <div ref={scrollRef} />
      </div>
      <div style={{ display: "flex", gap: 10, position: "sticky", bottom: 88, background: C.bg, paddingBottom: 6 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="Ask about your finances..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} />
        <button style={{ background: C.green, border: "none", borderRadius: 12, width: 46, height: 46, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => send(input)}>
          <Icon name="send" size={18} color="#061009" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: SETTINGS (with Google auth + backup)
// ═══════════════════════════════════════════════════════════════════════════════
function Settings({ settings, setSettings, expenses, income, debts, lending, bills, accounts, budget, contacts }) {
  const [f, setF] = useState({ ...settings });
  const [user, setUser] = useState(null);
  const [gStatus, setGStatus] = useState("");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Load Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          const payload = JSON.parse(atob(response.credential.split(".")[1]));
          setUser({ name: payload.name, email: payload.email, picture: payload.picture, token: response.credential });
          setGStatus("Signed in as " + payload.email);
        },
      });
    };
    document.head.appendChild(s);
  }, []);

  const signInGoogle = () => {
    if (!GOOGLE_CLIENT_ID) { setGStatus("No Google Client ID configured. See instructions below."); return; }
    window.google?.accounts.id.prompt();
  };

  // Local backup
  const exportData = () => {
    const data = { expenses, income, debts, lending, bills, accounts, budget, contacts, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `money_reminder_backup_${today()}.json`; a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.expenses) window.storage?.set("mrAI_expenses", JSON.stringify(d.expenses));
        if (d.income) window.storage?.set("mrAI_income", JSON.stringify(d.income));
        if (d.debts) window.storage?.set("mrAI_debts", JSON.stringify(d.debts));
        if (d.lending) window.storage?.set("mrAI_lending", JSON.stringify(d.lending));
        if (d.bills) window.storage?.set("mrAI_bills", JSON.stringify(d.bills));
        if (d.accounts) window.storage?.set("mrAI_accounts", JSON.stringify(d.accounts));
        if (d.budget) window.storage?.set("mrAI_budget", JSON.stringify(d.budget));
        if (d.contacts) window.storage?.set("mrAI_contacts", JSON.stringify(d.contacts));
        alert("✅ Data restored! Please refresh the app."); 
      } catch { alert("Invalid backup file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Settings</div>

      {/* Profile */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Profile</div>
        <Input label="Your Name" value={f.name || ""} onChange={e => set("name", e.target.value)} />
        <Select label="Currency" options={CURRENCIES} value={f.currency || "USD"} onChange={e => set("currency", e.target.value)} />
        {f.currency === "Custom" && <Input label="Custom Symbol" placeholder="e.g. ₦, ৳, ..." value={f.customCurrency || ""} onChange={e => set("customCurrency", e.target.value)} />}
        <button style={S.btn()} onClick={() => { const cur = f.currency === "Custom" ? (f.customCurrency || "$") : f.currency; setSettings({ ...f, currency: cur }); alert("✅ Saved!"); }}>Save Settings</button>
      </div>

      {/* Google Sign-in */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Google Account</div>
        {user ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src={user.picture} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
            </div>
          </div>
        ) : (
          <button onClick={signInGoogle} style={{ ...S.btn(C.surface), color: C.text, border: `1px solid ${C.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Icon name="google" size={18} />Sign in with Google
          </button>
        )}
        {gStatus && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{gStatus}</div>}
        {!GOOGLE_CLIENT_ID && (
          <div style={{ background: C.yellow + "15", border: `1px solid ${C.yellow}30`, borderRadius: 10, padding: "10px 12px", marginTop: 10, fontSize: 12, color: C.mutedLight, lineHeight: 1.6 }}>
            💡 To enable Google Sign-in: set GOOGLE_CLIENT_ID in the code with your OAuth 2.0 Client ID from console.cloud.google.com
          </div>
        )}
      </div>

      {/* Backup / Restore */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Backup & Restore</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Export all your data as a JSON file. Import it on any device to restore your data.</div>
        <button style={{ ...S.btn(C.teal), display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }} onClick={exportData}>
          <Icon name="download" size={16} color="#fff" />Download Backup (JSON)
        </button>
        <label style={{ ...S.btn(C.surface, true), display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.green, cursor: "pointer", borderRadius: 12, padding: "12px 18px", marginTop: 8, border: `1.5px solid ${C.green}` }}>
          <Icon name="upload" size={16} color={C.green} />Restore from Backup
          <input type="file" accept=".json" style={{ display: "none" }} onChange={importData} />
        </label>
      </div>

      {/* About */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>About</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>💰 Money Reminder AI v2.0<br />Track expenses, income, accounts, debts, lending, bills & budgets with partial payments and AI insights.<br /><br />Data saved in browser storage. Export regularly to keep backups safe.</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { id: "dashboard", icon: "home", label: "Home" },
  { id: "expenses", icon: "expense", label: "Expense" },
  { id: "income", icon: "income", label: "Income" },
  { id: "bills", icon: "bills", label: "Bills" },
  { id: "ai", icon: "ai", label: "AI" },
];
const MENU = [
  { id: "dashboard", icon: "home", label: "Dashboard" },
  { id: "accounts", icon: "wallet", label: "Accounts" },
  { id: "expenses", icon: "expense", label: "Expenses" },
  { id: "income", icon: "income", label: "Income" },
  { id: "debts", icon: "debt", label: "Debts" },
  { id: "lending", icon: "lend", label: "Lending" },
  { id: "bills", icon: "bills", label: "Bills" },
  { id: "budget", icon: "budget", label: "Budget" },
  { id: "contacts", icon: "contacts", label: "Contacts" },
  { id: "reports", icon: "report", label: "Reports" },
  { id: "ai", icon: "ai", label: "AI Assistant" },
  { id: "settings", icon: "settings", label: "Settings" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);

  const [expenses, setExpenses] = useStore("mrAI_expenses", []);
  const [income, setIncome] = useStore("mrAI_income", []);
  const [debts, setDebts] = useStore("mrAI_debts", []);
  const [lending, setLending] = useStore("mrAI_lending", []);
  const [bills, setBills] = useStore("mrAI_bills", []);
  const [budget, setBudget] = useStore("mrAI_budget", { total: 0, cats: {} });
  const [contacts, setContacts] = useStore("mrAI_contacts", []);
  const [accounts, setAccounts] = useStore("mrAI_accounts", []);
  const [settings, setSettings] = useStore("mrAI_settings", { name: "User", currency: "USD" });

  const cur = settings.currency || "USD";
  const curSym = ["USD","CAD","AUD","NZD"].includes(cur) ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : cur;

  const openModal = (type, data = {}) => setModal({ type, data });
  const closeModal = () => setModal(null);
  const del = (setter, id) => setter(prev => prev.filter(x => x.id !== id));
  const navigate = (p) => { setPage(p); setMenuOpen(false); };

  const save = (setter, item) => {
    if (item.id) setter(prev => prev.map(x => x.id === item.id ? item : x));
    else setter(prev => [{ ...item, id: uid(), createdAt: today() }, ...prev]);
    closeModal();
  };

  const commonProps = { expenses, income, debts, lending, bills, budget, contacts, accounts, settings, setExpenses, setIncome, setDebts, setLending, setBills, setBudget, setContacts, setAccounts, setSettings, openModal, navigate, del, curSym };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard {...commonProps} />;
      case "accounts": return <AccountsPage {...commonProps} />;
      case "expenses": return <Expenses {...commonProps} />;
      case "income": return <Income {...commonProps} />;
      case "debts": return <Debts {...commonProps} />;
      case "lending": return <Lending {...commonProps} />;
      case "bills": return <Bills {...commonProps} />;
      case "budget": return <Budget {...commonProps} />;
      case "contacts": return <Contacts {...commonProps} />;
      case "reports": return <Reports {...commonProps} />;
      case "ai": return <AIAssistant {...commonProps} />;
      case "settings": return <Settings {...commonProps} />;
      default: return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div style={S.app}>
      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", color: C.greenLight, cursor: "pointer", padding: 4, lineHeight: 0 }}>
            <Icon name="menu" size={22} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 900, color: C.greenLight, letterSpacing: -0.5 }}>💰 Money Reminder AI</span>
        </div>
        <button onClick={() => openModal("expense", { date: today() })} style={{ background: C.green, border: "none", borderRadius: 10, width: 36, height: 36, color: "#061009", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={20} color="#061009" />
        </button>
      </div>

      {/* Side drawer */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)" }} onClick={() => setMenuOpen(false)} />
          <div style={{ position: "relative", width: 265, background: C.card, height: "100%", overflowY: "auto", paddingBottom: 30, zIndex: 1 }}>
            <div style={{ padding: "24px 20px 18px", borderBottom: `1px solid ${C.cardBorder}` }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: C.greenLight }}>💰 Money Reminder</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Hello, {settings.name}!</div>
              <div style={{ fontSize: 13, color: C.mutedLight, marginTop: 6 }}>Balance: {curSym}{fmt(getTotalBalance(accounts, expenses, income, debts, lending, bills))}</div>
            </div>
            {MENU.map(m => (
              <button key={m.id} onClick={() => navigate(m.id)} style={{ ...S.navItem(page === m.id), width: "100%", flexDirection: "row", gap: 14, padding: "13px 20px", justifyContent: "flex-start", fontSize: 14, fontWeight: page === m.id ? 800 : 500, background: page === m.id ? C.surface : "transparent" }}>
                <Icon name={m.icon} size={18} />{m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Page content */}
      <div style={{ padding: "0 14px" }}>{renderPage()}</div>

      {/* Bottom nav */}
      <nav style={S.nav}>
        {NAV.map(n => (
          <button key={n.id} style={S.navItem(page === n.id)} onClick={() => navigate(n.id)}>
            <Icon name={n.icon} size={22} />
            <span style={{ fontSize: 10, fontWeight: 700 }}>{n.label}</span>
          </button>
        ))}
        <button style={S.navItem(["accounts","debts","lending","budget","contacts","reports","settings"].includes(page))} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={22} />
          <span style={{ fontSize: 10, fontWeight: 700 }}>More</span>
        </button>
      </nav>

      {/* Modals */}
      {modal && (
        <Modal onClose={closeModal}>
          {modal.type === "account" && <AccountForm data={modal.data} onSave={d => save(setAccounts, d)} onClose={closeModal} />}
          {modal.type === "expense" && <ExpenseForm data={modal.data} onSave={d => save(setExpenses, d)} onClose={closeModal} curSym={curSym} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={lending} bills={bills} />}
          {modal.type === "income" && <IncomeForm data={modal.data} onSave={d => save(setIncome, d)} onClose={closeModal} curSym={curSym} accounts={accounts} expenses={expenses} income={income} debts={debts} lending={lending} bills={bills} />}
          {modal.type === "debt" && <DebtForm data={modal.data} onSave={d => save(setDebts, d)} onClose={closeModal} curSym={curSym} />}
          {modal.type === "lending" && <LendingForm data={modal.data} onSave={d => save(setLending, d)} onClose={closeModal} curSym={curSym} />}
          {modal.type === "bill" && <BillForm data={modal.data} onSave={d => save(setBills, d)} onClose={closeModal} curSym={curSym} />}
          {modal.type === "contact" && <ContactForm data={modal.data} onSave={d => save(setContacts, d)} onClose={closeModal} />}
          {modal.type === "budget" && <BudgetForm budget={budget} onSave={b => { setBudget(b); closeModal(); }} onClose={closeModal} curSym={curSym} />}
        </Modal>
      )}
    </div>
  );
}
