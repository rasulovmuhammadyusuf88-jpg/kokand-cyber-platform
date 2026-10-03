import { useEffect, useState } from "react";
import "./CTFArena.css";

const API = "http://localhost:5000/api";

function CTFArena() {
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flag, setFlag] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const token = localStorage.getItem("kokand_token");

  async function request(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Server xatosi");
    }

    return data;
  }

  async function loadCTF() {
    try {
      setLoading(true);

      const [challengeData, leaderboardData] =
        await Promise.all([
          request("/ctf/challenges"),
          request("/ctf/leaderboard"),
        ]);

      setChallenges(challengeData.challenges || []);
      setLeaderboard(leaderboardData.leaderboard || []);
    } catch (error) {
      console.error("CTF yuklash xatosi:", error);

      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCTF();
  }, []);

  async function submitFlag(event) {
    event.preventDefault();

    if (!selected || !flag.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const data = await request("/ctf/submit", {
        method: "POST",
        body: JSON.stringify({
          challenge_id: selected.id,
          flag: flag.trim(),
        }),
      });

      if (data.correct) {
        setMessage({
          type: "success",
          text: `🎉 To‘g‘ri flag! +${data.points} ball`,
        });

        setFlag("");

        const leaderboardData =
          await request("/ctf/leaderboard");

        setLeaderboard(
          leaderboardData.leaderboard || []
        );
      } else if (data.alreadySolved) {
        setMessage({
          type: "info",
          text: "Bu challenge'ni allaqachon yechgansiz.",
        });
      } else {
        setMessage({
          type: "error",
          text: "❌ Flag noto‘g‘ri. Yana urinib ko‘ring.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function categoryIcon(category) {
    const value = String(category).toLowerCase();

    if (value.includes("web")) return "⌘";
    if (value.includes("crypto")) return "◇";
    if (value.includes("network")) return "⌁";
    if (value.includes("forensic")) return "◈";
    if (value.includes("reverse")) return "↻";
    if (value.includes("pwn")) return "⚔";

    return "⚡";
  }

  function categoryClass(category) {
    return String(category)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  }

  return (
    <section className="ctf-page">
      <div className="ctf-page-header">
        <div>
          <span className="ctf-eyebrow">
            CYBER RANGE / CTF
          </span>

          <h1>CTF Arena</h1>

          <p>
            Challenge'larni yeching, flag toping va
            leaderboard'da yuqoriga chiqing.
          </p>
        </div>

        <div className="ctf-live">
          <span></span>
          ARENA ONLINE
        </div>
      </div>

      <div className="ctf-stats">
        <div className="ctf-stat">
          <div className="ctf-stat-icon">⚡</div>

          <div>
            <span>CHALLENGES</span>
            <strong>{challenges.length}</strong>
          </div>
        </div>

        <div className="ctf-stat">
          <div className="ctf-stat-icon">🏆</div>

          <div>
            <span>PLAYERS</span>
            <strong>{leaderboard.length}</strong>
          </div>
        </div>

        <div className="ctf-stat">
          <div className="ctf-stat-icon">🔐</div>

          <div>
            <span>STATUS</span>
            <strong>ACTIVE</strong>
          </div>
        </div>
      </div>

      <div className="ctf-layout">
        <div className="ctf-challenges-panel">
          <div className="ctf-panel-header">
            <div>
              <span className="ctf-small-label">
                AVAILABLE
              </span>

              <h2>Challenges</h2>
            </div>

            <span className="ctf-count">
              {challenges.length}
            </span>
          </div>

          {loading ? (
            <div className="ctf-loading">
              <div className="ctf-spinner"></div>
              <span>Challenge'lar yuklanmoqda...</span>
            </div>
          ) : challenges.length === 0 ? (
            <div className="ctf-empty">
              <div>⚡</div>

              <h3>
                Hozircha challenge yo‘q
              </h3>

              <p>
                Admin yangi CTF challenge
                yaratgandan keyin shu yerda
                ko‘rinadi.
              </p>
            </div>
          ) : (
            <div className="ctf-challenge-list">
              {challenges.map((challenge) => (
                <button
                  type="button"
                  key={challenge.id}
                  className={`ctf-challenge ${
                    selected?.id === challenge.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    setSelected(challenge);
                    setFlag("");
                    setMessage(null);
                  }}
                >
                  <div
                    className={`ctf-category-icon ${categoryClass(
                      challenge.category
                    )}`}
                  >
                    {categoryIcon(
                      challenge.category
                    )}
                  </div>

                  <div className="ctf-challenge-info">
                    <strong>
                      {challenge.title}
                    </strong>

                    <span>
                      {challenge.category}
                    </span>
                  </div>

                  <div className="ctf-points">
                    +{challenge.points}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ctf-detail-panel">
          {!selected ? (
            <div className="ctf-select-empty">
              <div className="ctf-terminal-icon">
                &gt;_
              </div>

              <h2>
                Challenge tanlang
              </h2>

              <p>
                Chap tomondagi challenge'lardan
                birini tanlang va flagni topishga
                harakat qiling.
              </p>

              <div className="ctf-terminal-lines">
                <span>
                  $ ./start-challenge
                </span>

                <span>
                  $ find_the_flag
                </span>

                <span>
                  $ submit_flag
                </span>
              </div>
            </div>
          ) : (
            <div className="ctf-detail">
              <div className="ctf-detail-top">
                <div
                  className={`ctf-detail-icon ${categoryClass(
                    selected.category
                  )}`}
                >
                  {categoryIcon(selected.category)}
                </div>

                <div>
                  <span className="ctf-category">
                    {selected.category}
                  </span>

                  <h2>
                    {selected.title}
                  </h2>
                </div>

                <div className="ctf-detail-points">
                  <span>POINTS</span>
                  <strong>
                    {selected.points}
                  </strong>
                </div>
              </div>

              <div className="ctf-description">
                <span className="ctf-small-label">
                  DESCRIPTION
                </span>

                <p>
                  {selected.description}
                </p>
              </div>

              <div className="ctf-flag-box">
                <div className="ctf-flag-header">
                  <span>
                    FLAG SUBMISSION
                  </span>

                  <span>
                    FORMAT: FLAG{"{...}"}
                  </span>
                </div>

                <form
                  onSubmit={submitFlag}
                  className="ctf-submit-form"
                >
                  <div className="flag-input-wrap">
                    <span>&gt;</span>

                    <input
                      value={flag}
                      onChange={(event) =>
                        setFlag(
                          event.target.value
                        )
                      }
                      placeholder="flag{...}"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !flag.trim()
                    }
                  >
                    {submitting
                      ? "CHECKING..."
                      : "SUBMIT FLAG"}
                  </button>
                </form>

                {message && (
                  <div
                    className={`ctf-result ${message.type}`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="ctf-leaderboard">
          <div className="ctf-panel-header">
            <div>
              <span className="ctf-small-label">
                RANKING
              </span>

              <h2>Leaderboard</h2>
            </div>

            <span className="trophy">🏆</span>
          </div>

          <div className="leaderboard-list">
            {leaderboard.length === 0 ? (
              <div className="leaderboard-empty">
                Hozircha reyting yo‘q.
              </div>
            ) : (
              leaderboard.map((player, index) => (
                <div
                  className={`leaderboard-item rank-${index + 1}`}
                  key={player.id}
                >
                  <div className="rank-number">
                    {index + 1}
                  </div>

                  <div className="leader-avatar">
                    {player.first_name?.charAt(0)}
                  </div>

                  <div className="leader-info">
                    <strong>
                      {player.first_name}{" "}
                      {player.last_name}
                    </strong>

                    <span>
                      {player.student_id}
                    </span>
                  </div>

                  <div className="leader-points">
                    {player.points}
                    <small>pts</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default CTFArena;
