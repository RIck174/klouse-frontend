import { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import "boxicons/css/boxicons.min.css";
import "../Css/Homepage.css";
import "../Css/Paymentpage.css";

const API = import.meta.env.VITE_API_URL;

const PAYMENT_METHODS = [
  {
    id: "mtn",
    provider: "MTN MoMo",
    color: "#b8860b",
    bg: "#fef3c7",
    icon: "bx bxs-phone",
  },
  {
    id: "telecel",
    provider: "Telecel Cash",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: "bx bxs-phone",
  },
  {
    id: "airteltigo",
    provider: "AirtelTigo",
    color: "#7c3aed",
    bg: "#ede9fe",
    icon: "bx bxs-phone",
  },
  {
    id: "cash",
    provider: "Cash",
    color: "#16a34a",
    bg: "#dcfce7",
    icon: "bx bxs-wallet",
  },
];

function Payment() {
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [momoNumber, setMomoNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [paymentRes, historyRes] = await Promise.all([
          fetch(`${API}/user/payment-info`, { headers }),
          fetch(`${API}/ride/history`, { headers }),
        ]);
        const paymentData = await paymentRes.json();
        const historyData = await historyRes.json();
        setPaymentInfo(paymentData);
        setTransactions(historyData);
        setSelectedMethod(paymentData.paymentMethod || "cash");
        setMomoNumber(paymentData.momoNumber || "");
      } catch (err) {
        console.error("Failed to fetch payment data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const savePaymentMethod = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/user/payment-methodUpdate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          momoNumber: selectedMethod === "cash" ? "" : momoNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaymentInfo((prev) => ({
          ...prev,
          paymentMethod: data.user.paymentMethod,
          momoNumber: data.user.momoNumber,
        }));
        alert("Payment method saved");
      }
    } catch (err) {
      console.error("Failed to save payment method:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePaystack = () => {
    if (!addAmount || addAmount <= 0) return alert("Enter a valid amount");
    if (!window.PaystackPop)
      return alert("Paystack is still loading, please try again");

    const handler = window.PaystackPop.setup({
      key: "pk_test_9f6ffcb1e58c8f1c10ff83c87f812efefa9ac7ae",
      email: paymentInfo.email,
      amount: Math.round(addAmount * 100),
      currency: "GHS",
      ref: "klouse_" + Math.floor(Math.random() * 1000000000),
      callback: (response) => {
        const token = localStorage.getItem("token");
        fetch(`${API}/user/balance`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount: parseFloat(addAmount) }),
        })
          .then((res) => res.json())
          .then((data) => {
            setPaymentInfo((prev) => ({ ...prev, balance: data.balance }));
            setShowAddModal(false);
            setAddAmount("");
            alert("Top up successful!");
          });
      },
      onClose: () => console.log("Payment closed"),
    });
    handler.openIframe();
  };

  const totalSpent = transactions.reduce((sum, t) => sum + (t.fare || 0), 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-loading">
          <div className="searching-spinner" />
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="payment-content">
        {/* ── Top row ── */}
        <div className="payment-top-row">
          <button
            className="float-btn"
            onClick={() => setSidebarOpen(true)}
            style={{ width: 40, height: 40, fontSize: 22, flexShrink: 0 }}
          >
            <i className="bx bx-menu" />
          </button>
          <h1 className="payment-page-title">Wallet</h1>
        </div>

        {/* ── Wallet Card ── */}
        <div className="wallet-card">
          <div className="wallet-top-row">
            <div>
              <div className="wallet-badge">
                <i className="bx bxs-shield-check" />
                Klouse Pay
              </div>
              <p className="wallet-balance-label">Available Balance</p>
              <h2 className="wallet-balance-amount">
                <span>GH₵ </span>
                {(paymentInfo?.balance || 0).toFixed(2)}
              </h2>
            </div>
            <div className="wallet-icon-wrap">
              <i className="bx bxs-wallet" />
            </div>
          </div>

          {/* Stats */}
          <div className="wallet-stats">
            <div className="wallet-stat-card">
              <span className="wallet-stat-label">Total Rides</span>
              <span className="wallet-stat-value">{transactions.length}</span>
            </div>
            <div className="wallet-stat-card">
              <span className="wallet-stat-label">Total Spent</span>
              <span className="wallet-stat-value">
                GH₵ {totalSpent.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="wallet-actions">
            <button
              className="wallet-btn wallet-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <i className="bx bxs-plus-circle" />
              Add Money
            </button>
            <button
              className="wallet-btn wallet-btn-secondary"
              onClick={() => setShowWithdrawModal(true)}
            >
              <i className="bx bxs-download" />
              Withdraw
            </button>
          </div>
        </div>

        {/* ── Payment Methods ── */}
        <div className="payment-card">
          <div className="payment-card-header">
            <span className="payment-card-title">Payment Methods</span>
          </div>
          <div className="payment-card-body">
            <div className="methods-list">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.id}
                  className={`method-item ${selectedMethod === method.id ? "method-item-selected" : ""}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div
                    className="method-icon"
                    style={{ background: method.bg, color: method.color }}
                  >
                    <i className={method.icon} />
                  </div>
                  <div className="method-info">
                    <div className="method-name">{method.provider}</div>
                    <div className="method-sub">
                      {method.id === "cash"
                        ? "Pay driver directly"
                        : method.id === paymentInfo?.paymentMethod &&
                            paymentInfo?.momoNumber
                          ? paymentInfo.momoNumber
                          : "No number saved"}
                    </div>
                  </div>
                  <div className="method-right">
                    {paymentInfo?.paymentMethod === method.id && (
                      <span className="method-default-badge">Default</span>
                    )}
                    <div
                      className={`method-radio ${selectedMethod === method.id ? "method-radio-active" : ""}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {selectedMethod !== "cash" && (
              <div className="momo-input-wrap">
                <input
                  type="tel"
                  placeholder="Enter MoMo number e.g. 0551234567"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  className="momo-input"
                />
              </div>
            )}

            <button
              className="save-method-btn"
              onClick={savePaymentMethod}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Payment Method"}
            </button>
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="payment-card">
          <div className="payment-card-header">
            <span className="payment-card-title">Recent Transactions</span>
            {transactions.length > 0 && (
              <span className="payment-card-count">
                {transactions.length} rides
              </span>
            )}
          </div>
          <div className="payment-card-body">
            {transactions.length === 0 ? (
              <div className="tx-empty">
                <i className="bx bxs-car" />
                <p>No completed rides yet</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map((tx) => (
                  <div key={tx._id} className="tx-item">
                    <div className="tx-icon">
                      <i className="bx bxs-car" />
                    </div>
                    <div className="tx-info">
                      <div className="tx-destination">
                        {tx.destinationName || "Unknown destination"}
                      </div>
                      <div className="tx-date">{formatDate(tx.createdAt)}</div>
                    </div>
                    <span className="tx-amount">
                      − GH₵ {(tx.fare || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Money Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">Add Money</h2>
            <input
              type="number"
              placeholder="Enter amount (GH₵)"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <button className="modal-confirm-btn" onClick={handlePaystack}>
              <i className="bx bxs-lock-alt" /> Pay via MoMo
            </button>
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ── */}
      {showWithdrawModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowWithdrawModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 className="modal-title">Withdraw</h2>
            <input
              type="number"
              placeholder="Enter amount (GH₵)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <button
              className="modal-confirm-btn"
              onClick={() => {
                alert(`Withdrawing GH₵ ${withdrawAmount} — coming soon`);
                setShowWithdrawModal(false);
                setWithdrawAmount("");
              }}
            >
              <i className="bx bxs-download" /> Send to MoMo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payment;
