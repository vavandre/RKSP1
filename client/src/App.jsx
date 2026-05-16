import { useEffect, useState } from "react";
import { api } from "./api";

const emptyAsset = { name: "", type: "", status: "active", location: "" };
const emptyTicket = {
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  asset_id: ""
};

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Вход в систему</h2>
      <label>
        Логин
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label>
        Пароль
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit">Войти</button>
      <p className="hint">Тестовые учётки: admin / engineer / viewer</p>
    </form>
  );
}

function Dashboard({ user, onLogout }) {
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [ticketForm, setTicketForm] = useState(emptyTicket);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = user.role === "admin" || user.role === "engineer";
  const canAdmin = user.role === "admin";

  async function loadAll() {
    const [assetsData, ticketsData] = await Promise.all([api("/assets"), api("/tickets")]);
    setAssets(assetsData);
    setTickets(ticketsData);

    if (canAdmin) {
      setUsers(await api("/users"));
    }
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createAsset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/assets", { method: "POST", body: JSON.stringify(assetForm) });
      setAssetForm(emptyAsset);
      setMessage("Актив добавлен");
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/tickets", {
        method: "POST",
        body: JSON.stringify({
          ...ticketForm,
          asset_id: Number(ticketForm.asset_id)
        })
      });
      setTicketForm(emptyTicket);
      setMessage("Инцидент создан");
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="layout">
      <header className="topbar">
        <h1>Система управления IT-инфраструктурой</h1>
        <div>
          <span>{user.full_name} ({user.role})</span>
          <button className="logout" onClick={onLogout}>Выйти</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <section className="grid">
        <article className="card">
          <h3>Активы</h3>
          <ul>
            {assets.map((asset) => (
              <li key={asset.id}>
                <strong>{asset.name}</strong> - {asset.type}, {asset.status}, {asset.location}
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h3>Инциденты</h3>
          <ul>
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <strong>{ticket.title}</strong> - {ticket.priority} / {ticket.status}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {canEdit && (
        <section className="grid">
          <form className="card form" onSubmit={createAsset}>
            <h3>Добавить актив</h3>
            <input
              placeholder="Название"
              value={assetForm.name}
              onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
            />
            <input
              placeholder="Тип"
              value={assetForm.type}
              onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
            />
            <input
              placeholder="Локация"
              value={assetForm.location}
              onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
            />
            <select
              value={assetForm.status}
              onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
            >
              <option value="active">active</option>
              <option value="maintenance">maintenance</option>
              <option value="retired">retired</option>
            </select>
            <button type="submit">Создать</button>
          </form>

          <form className="card form" onSubmit={createTicket}>
            <h3>Завести инцидент</h3>
            <input
              placeholder="Заголовок"
              value={ticketForm.title}
              onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
            />
            <textarea
              placeholder="Описание"
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
            />
            <select
              value={ticketForm.asset_id}
              onChange={(e) => setTicketForm({ ...ticketForm, asset_id: e.target.value })}
            >
              <option value="">Выберите актив</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
            <select
              value={ticketForm.priority}
              onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <button type="submit">Создать</button>
          </form>
        </section>
      )}

      {canAdmin && (
        <section className="card">
          <h3>Пользователи</h3>
          <ul>
            {users.map((u) => (
              <li key={u.id}>{u.full_name} ({u.username}) - {u.role}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return <main>{user ? <Dashboard user={user} onLogout={logout} /> : <LoginForm onLogin={setUser} />}</main>;
}
