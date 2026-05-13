import "../Css/Sidebar.css";
import { useNavigate } from "react-router-dom";

function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsOpen(false);
    navigate("/", { replace: true });
  };

  const goTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div
      className={`overlay ${isOpen ? "active" : ""}`}
      onClick={() => setIsOpen(false)}
    >
      <div
        className={`sidebar ${isOpen ? "active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand">
            <h2>Klouse</h2>
            <p>Move smarter.</p>
          </div>
        </div>

        {/* Menu */}
        <div className="sidebar-menu">
          <div className="menu-item" onClick={() => goTo("/home")}>
            <i className="bx bxs-home" />
            <span>Home</span>
          </div>
          <div className="menu-item" onClick={() => goTo("/rides")}>
            <i className="bx bxs-car" />
            <span>Rides</span>
          </div>
          <div className="menu-item" onClick={() => goTo("/payment")}>
            <i className="bx bxs-wallet" />
            <span>Payment</span>
          </div>
          <div className="menu-item" onClick={() => goTo("/activity")}>
            <i className="bx bxs-time-five" />
            <span>Activity</span>
          </div>
          <div className="menu-item" onClick={() => goTo("/settings")}>
            <i className="bx bxs-cog" />
            <span>Settings</span>
          </div>
          <div className="menu-item" onClick={handleLogout}>
            <i className="bx bxs-log-out" />
            <span>Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
