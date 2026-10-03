import { useState } from "react";
import "./AdminAICenter.css";

const API = "http://localhost:5000/api";

export default function AdminAICenter({ token, onDone }) {
  const [command, setCommand] = useState("");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [proposal, setProposal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function api(path, body) {
    const r = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok || !d.success) throw new Error(d.message || "Server xatosi");
    return d;
  }

  function chooseImage(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Faqat PNG/JPG/WEBP rasm."); return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Rasm 8 MB dan kichik bo‘lsin."); return;
    }
    setError(""); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function commandAI(e) {
    e.preventDefault();
    if (!command.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try { setProposal((await api("/admin-ai/command", { message: command.trim() })).proposal); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function imageAI() {
    if (!image) return;
    setBusy(true); setError(""); setNotice("");
    try { setProposal((await api("/admin-ai/schedule-image", { image })).proposal); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function task(field, value) {
    setProposal(p => ({ ...p, task: { ...(p?.task || {}), [field]: value } }));
  }
  function announcement(field, value) {
    setProposal(p => ({ ...p, announcement: { ...(p?.announcement || {}), [field]: value } }));
  }
  function row(i, field, value) {
    setProposal(p => { const rows = [...(p?.schedule || [])]; rows[i] = { ...rows[i], [field]: value }; return { ...p, schedule: rows }; });
  }
  function addRow() {
    setProposal(p => ({ ...p, schedule: [...(p?.schedule || []), { day:"Dushanba",date:"",start_time:"09:00",end_time:"10:30",subject:"",teacher:"",room:"",group_name:"Cybersecurity 2026" }] }));
  }
  function removeRow(i) {
    setProposal(p => ({ ...p, schedule: (p?.schedule || []).filter((_, x) => x !== i) }));
  }

  async function execute() {
    if (!proposal || proposal.action === "UNKNOWN") return;
    if (!window.confirm("AI taklifini tasdiqlab database'ga yozilsinmi?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const d = await api("/admin-ai/execute", { proposal });
      setNotice(d.result?.message || "Bajarildi."); setProposal(null); onDone?.();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const action = proposal?.action || "";
  const fields = [["day","text"],["date","date"],["start_time","time"],["end_time","time"],["subject","text"],["teacher","text"],["room","text"],["group_name","text"]];

  return <section className="admin-ai-page">
    <div className="admin-ai-hero">
      <div><span>NEURAL CONTROL / ADMIN ONLY</span><h2>AI Command Center</h2><p>Jadval rasmi, deadline, vazifa va e'lonlarni AI orqali boshqarish.</p></div>
      <b>● AI ONLINE</b>
    </div>

    {notice && <div className="admin-ai-success">✓ {notice}</div>}
    {error && <div className="admin-ai-error">! {error}</div>}

    <div className="admin-ai-grid">
      <div className="admin-ai-card">
        <h3>💬 AI BUYRUQ</h3>
        <p>Masalan: “Network Security project deadline 10-oktabr 23:59 bo‘lsin.”</p>
        <form onSubmit={commandAI}>
          <textarea value={command} onChange={e => setCommand(e.target.value)} rows={8} placeholder="Admin buyrug‘ini yozing..." />
          <button disabled={busy || !command.trim()}>{busy ? "TAHLIL..." : "⚡ BUYRUQNI TAHLIL QILISH"}</button>
        </form>
      </div>

      <div className="admin-ai-card">
        <h3>📸 JADVAL RASMI</h3>
        <label className="admin-ai-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseImage(e.target.files?.[0])} /><strong>{fileName || "Rasm tanlang"}</strong><span>PNG / JPG / WEBP — max 8 MB</span></label>
        {image && <img src={image} alt="schedule preview" />}
        <button disabled={busy || !image} onClick={imageAI}>{busy ? "O‘QILMOQDA..." : "🔍 JADVALNI O‘QISH"}</button>
      </div>
    </div>

    {proposal && <div className="admin-ai-review">
      <div className="admin-ai-review-head"><div><span>ADMIN REVIEW</span><h3>{action}</h3></div><b>Confidence {Math.round((Number(proposal.confidence) || 0) * 100)}%</b></div>
      {proposal.message && <p>{proposal.message}</p>}

      {action === "CREATE_SCHEDULE_BULK" && <>
        <div className="admin-ai-table-head"><strong>{proposal.schedule?.length || 0} ta dars</strong><button type="button" onClick={addRow}>+ Qator</button></div>
        <div className="admin-ai-table-wrap"><table><thead><tr><th>Kun</th><th>Sana</th><th>Boshl.</th><th>Tugash</th><th>Fan</th><th>O‘qituvchi</th><th>Xona</th><th>Guruh</th><th /></tr></thead>
          <tbody>{(proposal.schedule || []).map((r,i)=><tr key={i}>{fields.map(([f,t])=><td key={f}><input type={t} value={r[f] || ""} onChange={e=>row(i,f,e.target.value)} /></td>)}<td><button type="button" onClick={()=>removeRow(i)}>✕</button></td></tr>)}</tbody>
        </table></div>
      </>}

      {(action === "CREATE_TASK" || action === "UPDATE_TASK_DEADLINE") && <div className="admin-ai-form">
        <label>Task ID<input value={proposal.task?.id ?? ""} onChange={e=>task("id", e.target.value ? Number(e.target.value) : null)} /></label>
        <label>Vazifa nomi<input value={proposal.task?.title || ""} onChange={e=>task("title",e.target.value)} /></label>
        <label>Fan<input value={proposal.task?.subject || ""} onChange={e=>task("subject",e.target.value)} /></label>
        <label>Deadline<input type="datetime-local" value={proposal.task?.deadline || ""} onChange={e=>task("deadline",e.target.value)} /></label>
        {action === "CREATE_TASK" && <><label className="wide">Tavsif<textarea value={proposal.task?.description || ""} onChange={e=>task("description",e.target.value)} /></label><label>Guruh<input value={proposal.task?.group_name || "ALL"} onChange={e=>task("group_name",e.target.value)} /></label></>}
      </div>}

      {action === "CREATE_ANNOUNCEMENT" && <div className="admin-ai-form">
        <label className="wide">Sarlavha<input value={proposal.announcement?.title || ""} onChange={e=>announcement("title",e.target.value)} /></label>
        <label className="wide">Matn<textarea value={proposal.announcement?.content || ""} onChange={e=>announcement("content",e.target.value)} /></label>
        <label>Priority<select value={proposal.announcement?.priority || "NORMAL"} onChange={e=>announcement("priority",e.target.value)}><option>NORMAL</option><option>IMPORTANT</option><option>URGENT</option></select></label>
        <label>Guruh<input value={proposal.announcement?.target_group || "ALL"} onChange={e=>announcement("target_group",e.target.value)} /></label>
      </div>}

      {action === "UNKNOWN" && <div className="admin-ai-unknown">Buyruq aniq emas. Aniqroq buyruq yozing.</div>}
      <div className="admin-ai-actions"><button type="button" onClick={()=>setProposal(null)}>✕ BEKOR</button><button className="confirm" disabled={busy || action === "UNKNOWN"} onClick={execute}>{busy ? "YOZILMOQDA..." : "✓ TASDIQLASH VA DATABASEGA YOZISH"}</button></div>
    </div>}

    <div className="admin-ai-warning">🛡 AI faqat proposal yaratadi. Database o‘zgarishi faqat ADMIN tasdiqlagandan keyin bajariladi va audit log yoziladi.</div>
  </section>;
}
