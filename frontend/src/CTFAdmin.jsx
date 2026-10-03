import { useEffect, useState } from "react";
import "./CTFAdmin.css";

const API = "http://localhost:5000/api";

function CTFAdmin({ token }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "Web",
    description: "",
    points: 100,
    flag: "",
  });

  async function loadChallenges() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/ctf/challenges`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Challenge'larni yuklab bo‘lmadi"
        );
      }

      setChallenges(data.challenges || []);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChallenges();
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function createChallenge(event) {
    event.preventDefault();

    setMessage("");

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.flag.trim()
    ) {
      setMessage("❌ Barcha majburiy maydonlarni to‘ldiring.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/ctf/challenges`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: form.title.trim(),
            category: form.category,
            description: form.description.trim(),
            points: Number(form.points) || 100,
            flag: form.flag.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Challenge yaratilmadi"
        );
      }

      setMessage(
        "✅ Challenge muvaffaqiyatli yaratildi!"
      );

      setForm({
        title: "",
        category: "Web",
        description: "",
        points: 100,
        flag: "",
      });

      await loadChallenges();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ctf-admin-page">
      <div className="ctf-admin-header">
        <div>
          <span>CYBER RANGE / ADMIN</span>
          <h1>CTF Management</h1>
          <p>
            Challenge yaratish va CTF Arena'ni boshqarish.
          </p>
        </div>

        <div className="ctf-admin-status">
          <i></i>
          CTF SYSTEM ONLINE
        </div>
      </div>

      <div className="ctf-admin-grid">
        <div className="ctf-create-card">
          <div className="ctf-card-title">
            <div>
              <small>NEW CHALLENGE</small>
              <h2>Challenge yaratish</h2>
            </div>

            <div className="ctf-create-icon">
              ⚡
            </div>
          </div>

          <form
            className="ctf-create-form"
            onSubmit={createChallenge}
          >
            <label>
              TITLE
              <input
                name="title"
                value={form.title}
                onChange={updateForm}
                placeholder="Masalan: Hidden Web Flag"
              />
            </label>

            <div className="ctf-form-row">
              <label>
                CATEGORY
                <select
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                >
                  <option value="Web">Web</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Network">Network</option>
                  <option value="Forensics">
                    Forensics
                  </option>
                  <option value="Reverse Engineering">
                    Reverse Engineering
                  </option>
                  <option value="Pwn">Pwn</option>
                  <option value="OSINT">OSINT</option>
                  <option value="Misc">Misc</option>
                </select>
              </label>

              <label>
                POINTS
                <input
                  name="points"
                  type="number"
                  min="1"
                  max="5000"
                  value={form.points}
                  onChange={updateForm}
                />
              </label>
            </div>

            <label>
              DESCRIPTION
              <textarea
                name="description"
                value={form.description}
                onChange={updateForm}
                placeholder="Student challenge'ni qanday bajarishini tushuntiring..."
                rows="6"
              />
            </label>

            <label>
              SECRET FLAG
              <input
                name="flag"
                value={form.flag}
                onChange={updateForm}
                placeholder="flag{kokand_cyber_001}"
                autoComplete="off"
                spellCheck="false"
              />
            </label>

            <div className="ctf-flag-warning">
              🔐 Flag studentlarga ko‘rsatilmaydi.
              Server uni hash holatda saqlaydi.
            </div>

            <button
              className="ctf-create-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "CREATING..."
                : "⚡ CREATE CHALLENGE"}
            </button>

            {message && (
              <div className="ctf-admin-message">
                {message}
              </div>
            )}
          </form>
        </div>

        <div className="ctf-existing-card">
          <div className="ctf-card-title">
            <div>
              <small>LIVE ARENA</small>
              <h2>Existing Challenges</h2>
            </div>

            <strong>
              {challenges.length}
            </strong>
          </div>

          {loading && challenges.length === 0 ? (
            <div className="ctf-admin-empty">
              Yuklanmoqda...
            </div>
          ) : challenges.length === 0 ? (
            <div className="ctf-admin-empty">
              <div>⚡</div>
              <h3>Hozircha challenge yo‘q</h3>
              <p>
                Birinchi challenge'ni chap
                tomondagi forma orqali yarating.
              </p>
            </div>
          ) : (
            <div className="ctf-admin-list">
              {challenges.map((challenge) => (
                <div
                  className="ctf-admin-item"
                  key={challenge.id}
                >
                  <div className="ctf-admin-item-icon">
                    ⚡
                  </div>

                  <div className="ctf-admin-item-info">
                    <strong>
                      {challenge.title}
                    </strong>

                    <span>
                      {challenge.category}
                    </span>
                  </div>

                  <div className="ctf-admin-item-points">
                    +{challenge.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CTFAdmin;
