// frontend/src/components/InsertTradeForm.jsx

import React, { useState } from "react";
import { insertTrade } from "../services/api";

export default function InsertTradeForm({ onInserted }) {
  const [form, setForm] = useState({ stock_id: 1, seller_id: "", buyer_id: "", price: "", quantity: "" });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      const res = await insertTrade({ ...form, stock_id: Number(form.stock_id), seller_id: Number(form.seller_id), buyer_id: Number(form.buyer_id), price: Number(form.price), quantity: Number(form.quantity) });
      setStatus({ type: "success", msg: `Trade #${res.trade_id} injected.` });
      onInserted?.();
    } catch {
      setStatus({ type: "error", msg: "Injection failed." });
    }
    setLoading(false);
  };

  return (
    <div className="glass p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Manual Injection</h3>
        <button onClick={() => setForm({ stock_id: 1, seller_id: "1", buyer_id: "2", price: "499", quantity: "100" })} 
          className="text-xs font-mono px-3 py-1 bg-[#FF0033]/20 text-[#FF0033] border border-[#FF0033]/50 rounded hover:bg-[#FF0033]/40 transition-colors">
          [AUTO-FILL MALICIOUS]
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {["seller_id", "buyer_id", "stock_id", "price", "quantity"].map((field) => (
            <div key={field}>
              <label className="block text-xs text-gray-400 font-mono mb-1 uppercase">{field.replace("_", " ")}</label>
              <input name={field} value={form[field]} onChange={handleChange} required
                className="w-full bg-black/50 border border-[#00FF66]/20 rounded-lg p-2 text-white font-mono focus:border-[#00FF66] focus:outline-none transition-colors" />
            </div>
          ))}
        </div>
        <button type="submit" disabled={loading} className="neon-btn w-full mt-4">
          {loading ? "EXECUTING..." : "EXECUTE TRADE"}
        </button>
      </form>

      {status && (
        <div className={`mt-4 p-3 rounded text-sm font-mono border ${status.type === "success" ? "border-[#00FF66]/50 text-[#00FF66] bg-[#00FF66]/10" : "border-[#FF0033]/50 text-[#FF0033] bg-[#FF0033]/10"}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}