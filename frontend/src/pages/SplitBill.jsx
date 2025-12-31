import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, API_URL } from "../state/auth.jsx";
import { useToast } from "../state/toast.jsx";
import { useModal } from "../state/modal.jsx";
import logoutIcon from "../assets/logout_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg";

// Komponen halaman utama untuk manage bill
export default function SplitBill() {
  const { token, logout, username } = useAuth();
  const nav = useNavigate();
  const [displayUsername, setDisplayUsername] = useState(username || localStorage.getItem("sb_username") || "User");
  const [billId, setBillId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [items, setItems] = useState([]);
  const [tipPercent, setTipPercent] = useState("");
  const [taxPercent, setTaxPercent] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [summary, setSummary] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [setupTab, setSetupTab] = useState("participants");

  const headers = useMemo(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);
  const toast = useToast();
  const modal = useModal();

  const { id: routeBillId } = useParams();
  useEffect(() => {
    const init = async () => {
      if (routeBillId) {
        setBillId(routeBillId);
        try {
          const [pRes, iRes] = await Promise.all([
            fetch(`${API_URL}/bills/${routeBillId}/participants`, { headers }),
            fetch(`${API_URL}/bills/${routeBillId}/items`, { headers })
          ]);
          const pData = await pRes.json();
          const iData = await iRes.json();
          if (pRes.ok) setParticipants(pData.participants || []);
          if (iRes.ok) setItems(iData.items || []);
        } catch { }
        await loadSummary();
      } else {
        const res = await fetch(`${API_URL}/bills`, { method: "POST", headers });
        const data = await res.json();
        if (res.ok) setBillId(data.id);
      }
    };
    init();
  }, [routeBillId]);

  const addParticipant = async name => {
    const res = await fetch(`${API_URL}/bills/${billId}/participants`, { method: "POST", headers, body: JSON.stringify({ participants: [name] }) });
    const data = await res.json();
    if (res.ok) {
      setParticipants(data.participants);
      toast.show("Peserta berhasil ditambahkan", { type: 'success' });
    } else {
      toast.show(data.error || "Gagal menambah peserta", { type: 'error' });
    }
  };

  const deleteParticipant = async participantId => {
    const res = await fetch(`${API_URL}/bills/${billId}/participants/${participantId}`, { method: "DELETE", headers });
    const data = await res.json();
    if (res.ok) setParticipants(data.participants);
  };

  const addItem = async payload => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/items`, { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) setItems(data.items);
      else modal.show({ type: 'error', message: data.message || 'Gagal menambahkan item' });
    } catch (err) {
      console.error(err);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat menambahkan item' });
    }
  };

  const deleteItem = async itemId => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/items/${itemId}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok) setItems(data.items);
      else modal.show({ type: 'error', message: data.message || 'Gagal menghapus item' });
    } catch (err) {
      console.error(err);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat menghapus item' });
    }
  };

  const updateItem = async (itemId, payload) => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/items/${itemId}`, { method: "PATCH", headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) {
        setItems(data.items);
        toast.show("Item berhasil diperbarui", { type: 'success' });
        await loadSummary();
      } else {
        modal.show({ type: 'error', message: data.message || 'Gagal memperbarui item' });
      }
    } catch (err) {
      console.error(err);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat memperbarui item' });
    }
  };

  const setSplits = async (itemId, weights) => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/items/${itemId}/splits`, { method: "POST", headers, body: JSON.stringify({ weights }) });
      const data = await res.json();
      if (!res.ok) {
        modal.show({ type: 'error', message: data.message || "Gagal menyimpan pembagian item" });
      } else {
        toast.show("Pembagian tersimpan", { type: 'success' });
        await loadSummary();
      }
    } catch (err) {
      console.error(err);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat menyimpan pembagian item' });
    }
  };

  const applyTipTax = async () => {
    // Local validation: values (if provided) must be >= 0
    const tp = tipPercent !== "" ? Number(tipPercent) : null;
    const ta = tipAmount !== "" ? Number(tipAmount) : null;
    const xp = taxPercent !== "" ? Number(taxPercent) : null;
    const xa = taxAmount !== "" ? Number(taxAmount) : null;
    const dp = discountPercent !== "" ? Number(discountPercent) : null;
    const da = discountAmount !== "" ? Number(discountAmount) : null;
    if ((tp != null && (isNaN(tp) || tp < 0)) || (xp != null && (isNaN(xp) || xp < 0)) || (ta != null && (isNaN(ta) || ta < 0)) || (xa != null && (isNaN(xa) || xa < 0)) || (dp != null && (isNaN(dp) || dp < 0)) || (da != null && (isNaN(da) || da < 0))) {
      toast.show("Tip/Tax/Diskon harus bernilai >= 0", { type: 'error' });
      return;
    }

    const res = await fetch(`${API_URL}/bills/${billId}/tipTax`, { method: "POST", headers, body: JSON.stringify({ tipPercent: tp, tipAmount: ta, taxPercent: xp, taxAmount: xa, discountPercent: dp, discountAmount: da }) });
    const data = await res.json();
    if (!res.ok) {
      toast.show(data.message || "Gagal menyimpan tip/tax/diskon", { type: 'error' });
    } else {
      toast.show("Tip/Tax/Diskon berhasil disimpan", { type: 'success' });
      // refresh summary after save
      await loadSummary();
    }
  };

  const loadSummary = async () => {
    const res = await fetch(`${API_URL}/bills/${billId}/summary`, { headers });
    const data = await res.json();
    if (res.ok) setSummary(data);
  };

  const generatePDF = async () => {
    if (!billId) {
      toast.show("Bill belum dibuat", { type: 'error' });
      return;
    }
    try {
      setPdfGenerating(true);
      const res = await fetch(`${API_URL}/bills/${billId}/pdf`, { headers });
      if (res.ok) {
        const contentDisposition = res.headers.get("content-disposition");
        const filename = contentDisposition ? contentDisposition.split("filename=")[1].replace(/"/g, "") : `struk.pdf`;
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.show("PDF berhasil diunduh!", { type: 'success' });
      } else {
        toast.show("Gagal membuat PDF", { type: 'error' });
      }
    } catch (err) {
      console.error(err);
      toast.show("Terjadi kesalahan saat membuat PDF", { type: 'error' });
    } finally {
      setPdfGenerating(false);
    }
  };

  const saveBill = async () => {
    try {
      const res = await fetch(`${API_URL}/bills/${billId}/save`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok) {
        toast.show("Bill berhasil disimpan", { type: 'success' });
      } else {
        toast.show(data.message || "Gagal menyimpan bill", { type: 'error' });
      }
    } catch (e) {
      toast.show("Terjadi kesalahan saat menyimpan bill", { type: 'error' });
    }
  };

  const resetAll = async () => {
    await fetch(`${API_URL}/bills/${billId}/reset`, { method: "POST", headers });
    setParticipants([]);
    setItems([]);
    setSummary(null);
    setTipPercent("");
    setTaxPercent("");
  };

  const [pName, setPName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState(1);

  const idr = v => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v || 0));

  const showHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/bills/history`, { headers });
      const data = await res.json();
      if (!res.ok) {
        modal.show({ type: 'error', message: data.message || 'Gagal memuat history' });
        return;
      }
      const text = (data.bills || []).map(b => {
        const d = new Date(b.created_at);
        const ds = isNaN(d.getTime()) ? String(b.created_at) : d.toLocaleString('id-ID');
        return `#${b.id} · ${b.title} · ${ds}`;
      }).join('\n');
      modal.show({ title: 'History Bills', message: text || 'Belum ada riwayat' });
    } catch (e) {
      console.error(e);
      modal.show({ type: 'error', message: 'Terjadi kesalahan saat memuat history' });
    }
  };

  return (
    <div className="layout">
      <div className="topbar">
        <div className="brand" style={{ marginTop: 0 }}>
          <div className="logo">🍌</div>
          <div>
            <div className="title">Pisang</div>
            <div className="subtitle">Pisah Uang</div>
          </div>
        </div>
        <div className="actions">
          <div className="user-section">
            <div className="user-greeting">Halo,</div>
            <div className="user-display">
              <svg className="user-avatar" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" />
                <path d="M 12 14 C 8 14 5 16 5 20 L 19 20 C 19 16 16 14 12 14 Z" />
              </svg>
              <span className="user-name">{displayUsername}</span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => nav("/")} aria-label="Kembali" title="Kembali" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Kembali</span>
          </button>
          <button className="btn btn-outline" onClick={logout} aria-label="Logout" title="Logout" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {/* logout icon (file 020252) */}
            <img src={logoutIcon} alt="Logout" style={{ width: 18, height: 18, display: 'block' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 10 }}>
        <div className="title">Buat Struk</div>
        <div className="subtitle">Patungan jadi mudah</div>
      </div>

      <div className="compact-grid">
        <div className="content-left">
          <div className="center-stack">
            <div className="card setup-card">
              <div className="group-title">Setup</div>
              <div className="seg" style={{ marginBottom: 10 }}>
                <button className={`seg-btn ${setupTab === 'participants' ? 'active' : ''}`} onClick={() => setSetupTab('participants')}>Participants</button>
                <button className={`seg-btn ${setupTab === 'items' ? 'active' : ''}`} onClick={() => setSetupTab('items')}>Items</button>
              </div>
              {setupTab === 'participants' ? (
                <>
                  <form onSubmit={e => { e.preventDefault(); if (pName) { addParticipant(pName); setPName(""); } }} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <input className="input" placeholder="Nama peserta" value={pName} onChange={e => setPName(e.target.value)} />
                    <div className="actions">
                      <button type="submit" className="btn btn-primary">Tambah</button>
                    </div>
                  </form>
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 8, gap: 8 }}>
                    {participants.map(p => (
                      <span key={p.id} className="chip-delete">
                        {p.name}
                        <button className="chip-btn-delete" onClick={() => deleteParticipant(p.id)}>×</button>
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <form onSubmit={e => {
                    e.preventDefault();
                    const priceNum = Number(itemPrice);
                    const qtyNum = Number(itemQty);
                    if (!itemName) {
                      modal.show({ type: 'error', message: 'Nama item diperlukan' });
                      return;
                    }
                    if (isNaN(priceNum) || priceNum < 1) {
                      modal.show({ type: 'error', message: 'Harga harus minimal 1' });
                      return;
                    }
                    if (isNaN(qtyNum) || qtyNum < 1) {
                      modal.show({ type: 'error', message: 'Qty harus minimal 1' });
                      return;
                    }
                    addItem({ name: itemName, price: priceNum, quantity: qtyNum });
                    setItemName(""); setItemPrice(""); setItemQty(1);
                  }} className="actions" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <input className="input" placeholder="Nama item" value={itemName} onChange={e => setItemName(e.target.value)} />
                    <input className="input" placeholder="Harga" type="number" min={1} value={itemPrice} onChange={e => setItemPrice(e.target.value)} />
                    <input className="input" placeholder="Qty" type="number" min={1} value={itemQty} onChange={e => setItemQty(e.target.value)} />
                    <button type="submit" className="btn btn-primary">Tambah</button>
                  </form>
                </>
              )}
            </div>



            <div className="card">
              <div className="group-title">Split Items</div>
              {items.length === 0 ? (
                <div className="muted">Belum ada item. Tambahkan item terlebih dahulu.</div>
              ) : (
                <div className="split-list">
                  {items.map(it => <ItemCard key={it.id} item={it} participants={participants} onSave={setSplits} onDelete={deleteItem} onEdit={(payload) => updateItem(it.id, payload)} />)}
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <div className="group-title">Adjustments</div>
              <form onSubmit={e => { e.preventDefault(); applyTipTax(); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Diskon (%)</div>
                    <input className="input" type="number" min={0} value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Diskon (Rp)</div>
                    <input className="input" type="number" min={0} value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Tip (%)</div>
                    <input className="input" type="number" min={0} value={tipPercent} onChange={e => setTipPercent(e.target.value)} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Tip (Rp)</div>
                    <input className="input" type="number" min={0} value={tipAmount} onChange={e => setTipAmount(e.target.value)} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Tax (%)</div>
                    <input className="input" type="number" min={0} value={taxPercent} onChange={e => setTaxPercent(e.target.value)} />
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Tax (Rp)</div>
                    <input className="input" type="number" min={0} value={taxAmount} onChange={e => setTaxAmount(e.target.value)} />
                  </div>
                </div>
                <div className="actions" style={{ marginTop: 6 }}>
                  <button type="submit" className="btn btn-primary">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="content-right">
          <div className="summary-card">
            <div className="group-title">Summary</div>
            <div className="summary-item"><span className="summary-label">Subtotal</span><span>{summary ? idr(summary.subtotal) : idr(0)}</span></div>
            <div className="summary-item"><span className="summary-label">Diskon</span><span>{summary ? idr(summary.discount || 0) : idr(0)}</span></div>
            <div className="summary-item"><span className="summary-label">Tip</span><span>{summary ? idr(summary.tip) : idr(0)}</span></div>
            <div className="summary-item"><span className="summary-label">Tax</span><span>{summary ? idr(summary.tax) : idr(0)}</span></div>
            <div className="summary-total">{summary ? idr(Math.max(summary.subtotal - (summary.discount || 0), 0) + summary.tip + summary.tax) : idr(0)}</div>
            {summary ? (
              <div className="summary-list">
                {summary.participants.map(p => (
                  <div key={p.id} className="summary-item"><span className="summary-label">{p.name}</span><span>{idr(summary.totals[p.id])}</span></div>
                ))}
              </div>
            ) : null}
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btn-green" onClick={generatePDF} disabled={pdfGenerating}>{pdfGenerating ? "Membuat PDF..." : "Buat PDF"}</button>
            </div>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" onClick={saveBill} disabled={!billId}>Simpan Bill</button>
              <button className="btn btn-outline" onClick={loadSummary}>Hitung</button>
              <button className="btn btn-outline" onClick={resetAll}>Reset All</button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

// Komponen untuk menampilkan dan mengatur item dalam bill
function ItemCard({ item, participants, onSave, onDelete, onEdit }) {
  const [checked, setChecked] = useState(() => Object.fromEntries(participants.map(p => [p.id, true])));
  useEffect(() => { setChecked(Object.fromEntries(participants.map(p => [p.id, true]))); }, [participants]);
  const totalPrice = Number(item.price) * Number(item.quantity || 1);
  const checkedCount = Object.values(checked).filter(Boolean).length || 1;
  const perPerson = totalPrice / checkedCount;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editPrice, setEditPrice] = useState(String(item.price));
  const [editQty, setEditQty] = useState(String(item.quantity || 1));

  const toggle = id => setChecked(c => ({ ...c, [id]: !c[id] }));

  const handleSave = () => {
    const weights = {};
    for (const p of participants) weights[p.id] = checked[p.id] ? 1 : 0;
    onSave(item.id, weights);
  };

  const handleDelete = () => {
    // if (window.confirm(`Hapus item "${item.name}"?`)) {
    onDelete(item.id);
    // }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    if (editName !== item.name) payload.name = editName;
    const pNum = Number(editPrice);
    const qNum = Number(editQty);
    if (!editName) { alert('Nama item harus diisi'); return; }
    if (isNaN(pNum) || pNum < 1) { alert('Harga harus minimal 1'); return; }
    if (isNaN(qNum) || qNum < 1) { alert('Qty harus minimal 1'); return; }
    if (pNum !== Number(item.price)) payload.price = pNum;
    if (qNum !== Number(item.quantity || 1)) payload.quantity = qNum;
    if (Object.keys(payload).length === 0) { setEditing(false); return; }
    onEdit(payload);
    setEditing(false);
  };

  return (
    <div className="item-card">
      <div className="item-head">
        <div>
          {editing ? (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="input" placeholder="Nama item" value={editName} onChange={e => setEditName(e.target.value)} />
              <input className="input" placeholder="Harga" type="number" min={1} value={editPrice} onChange={e => setEditPrice(e.target.value)} />
              <input className="input" placeholder="Qty" type="number" min={1} value={editQty} onChange={e => setEditQty(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-primary">Simpan Perubahan</button>
                <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>
                <button className="btn btn-outline" onClick={() => { setEditing(false); setEditName(item.name); setEditPrice(String(item.price)); setEditQty(String(item.quantity || 1)); }}>Batal</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>{item.name}</div>
              <div className="muted">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalPrice)} • Qty {item.quantity}</div>
              <div className="muted">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(perPerson)} per orang</div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (
            <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit</button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => {
                const payload = {};
                if (editName !== item.name) payload.name = editName;
                const pNum = Number(editPrice);
                const qNum = Number(editQty);
                if (!editName) { alert('Nama item harus diisi'); return; }
                if (isNaN(pNum) || pNum < 1) { alert('Harga harus minimal 1'); return; }
                if (isNaN(qNum) || qNum < 1) { alert('Qty harus minimal 1'); return; }
                if (pNum !== Number(item.price)) payload.price = pNum;
                if (qNum !== Number(item.quantity || 1)) payload.quantity = qNum;
                if (Object.keys(payload).length === 0) { setEditing(false); return; }
                onEdit(payload);
                setEditing(false);
              }}>Simpan Perubahan</button>
              <button className="btn btn-danger" onClick={handleDelete}>Hapus</button>
              <button className="btn btn-outline" onClick={() => { setEditing(false); setEditName(item.name); setEditPrice(String(item.price)); setEditQty(String(item.quantity || 1)); }}>Batal</button>
            </>
          )}
          <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
        </div>
      </div>
      <div style={{ paddingTop: 12 }}>
        <div className="muted" style={{ marginBottom: 8 }}>Patungan dengan siapa?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {participants.map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={!!checked[p.id]} onChange={() => toggle(p.id)} />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
