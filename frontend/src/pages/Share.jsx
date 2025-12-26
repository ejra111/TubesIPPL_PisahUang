import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_URL } from "../state/auth.jsx";
import { useToast } from "../state/toast.jsx";
import html2canvas from "html2canvas";

// Komponen halaman untuk melihat bill melalui link share
export default function Share() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/bills/share/${token}`);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Gagal memuat struk");
          setData(null);
        } else {
          const d = await res.json();
          setData(d);
        }
      } catch (err) {
        setError("Terjadi kesalahan jaringan");
      }
      setLoading(false);
    };
    load();
  }, [token]);

  const idr = v => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v || 0));

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      const res = await fetch(`${API_URL}/bills/share/${token}/pdf`);
      if (!res.ok) {
        throw new Error("Gagal generate PDF");
      }
      const result = await res.json();
      if (result.success && result.downloadUrl) {
        setPdfDownloadUrl(`${API_URL}${result.downloadUrl}`);
      }
    } catch (err) {
      toast.show("Gagal membuat PDF: " + (err && err.message ? err.message : ""), { type: 'error' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Memuat...</div>;
  if (error) return <div style={{ padding: 20 }}><div style={{ fontWeight: 600, marginBottom: 8 }}>Error</div><div className="muted">{error}</div></div>;
  if (!data) return null;

  const { participants = [], totals = {}, subtotal = 0, tip = 0, tax = 0 } = data;

  return (
    <div className="layout">
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <div className="title">Struk Patungan</div>
        <div className="subtitle">Bagikan atau screenshot untuk dibagi ke peserta</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <div id="receipt" className="summary-card" style={{ maxWidth: 480 }}>
          <div className="group-title">Summary</div>
          <div className="summary-item"><span className="summary-label">Subtotal</span><span>{idr(subtotal)}</span></div>
          <div className="summary-item"><span className="summary-label">Tip</span><span>{idr(tip)}</span></div>
          <div className="summary-item"><span className="summary-label">Tax</span><span>{idr(tax)}</span></div>
          <div className="summary-total">{idr(subtotal + tip + tax)}</div>
          <div className="summary-list">
            {participants.map(p => (
              <div key={p.id} className="summary-item"><span className="summary-label">{p.name}</span><span>{idr(totals[p.id])}</span></div>
            ))}
          </div>
          <div style={{ marginTop: 12 }} className="muted">Link: {`${API_URL}/bills/share/${token}`}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div>
          {pdfDownloadUrl ? (
            <>
              <a href={pdfDownloadUrl} download className="btn btn-primary" style={{ marginRight: 8 }}>
                Download PDF
              </a>
              <button className="btn btn-secondary" onClick={() => setPdfDownloadUrl("")}>
                Buat Lagi
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={handleGeneratePdf} disabled={generatingPdf} style={{ marginRight: 8 }}>
                {generatingPdf ? 'Membuat PDF...' : 'Buat PDF'}
              </button>
              <button className="btn btn-secondary" onClick={async () => {
                try {
                  setLoading(true);
                  const el = document.getElementById('receipt');
                  if (!el) throw new Error('Receipt element not found');
                  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
                  const dataUrl = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = `struk-${token}.png`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                } catch (err) {
                  console.error('Failed to generate PNG', err);
                  toast.show('Gagal membuat PNG: ' + (err && err.message ? err.message : ''), { type: 'error' });
                } finally {
                  setLoading(false);
                }
              }}>
                {loading ? 'Memproses...' : 'Download PNG'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
