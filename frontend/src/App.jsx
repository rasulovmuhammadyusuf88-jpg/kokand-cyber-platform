import { useState } from "react";
import Dashboard from "./Dashboard";
import Login from "./Login";
import AdminPanel from "./AdminPanel";

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("kokand_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [showAdminPanel, setShowAdminPanel] = useState(false);

  function handleLogin(data) {
    localStorage.setItem("kokand_token", data.token);
    localStorage.setItem("kokand_user", JSON.stringify(data.user));

    setUser(data.user);
    setShowAdminPanel(false);
  }

  function handleLogout() {
    localStorage.removeItem("kokand_token");
    localStorage.removeItem("kokand_user");

    setUser(null);
    setShowAdminPanel(false);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const token = localStorage.getItem("kokand_token");

  return (
    <>
      <Dashboard user={user} onLogout={handleLogout} />

      {user.role === "ADMIN" && (
        <>
          <button
            className="admin-floating-button"
            onClick={() => setShowAdminPanel(true)}
          >
            🛡 ADMIN PANEL
          </button>

          {showAdminPanel && (
            <AdminPanel
              token={token}
              onClose={() => setShowAdminPanel(false)}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;
