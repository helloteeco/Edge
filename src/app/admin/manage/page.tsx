"use client";

import { useState, useEffect } from "react";

export default function AdminManagePage() {
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targetEmail, setTargetEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState("add_credits");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Check if user is logged in and is admin
    const email = localStorage.getItem("edge_auth_email");
    const token = localStorage.getItem("edge_auth_token");
    const expiry = localStorage.getItem("edge_auth_expiry");

    if (!email || !token || !expiry || Date.now() > parseInt(expiry)) {
      setLoading(false);
      return;
    }

    setAdminEmail(email);
    // Check admin status
    fetch(`/api/admin/manage-credits?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.is_admin === true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAction = async () => {
    if (!targetEmail.trim()) { setMsg({ type: "error", text: "Enter a target email" }); return; }
    if ((action === "add_credits" || action === "set_credits") && (!amount || parseInt(amount) < 0)) {
      setMsg({ type: "error", text: "Enter a valid amount" }); return;
    }
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/manage-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_email: adminEmail,
          action,
          target_email: targetEmail.trim(),
          amount: parseInt(amount) || 0,
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (action === "add_credits") {
          setMsg({ type: "success", text: `✅ Added ${amount} credits to ${targetEmail}. They now have ${result.credits_remaining} remaining.` });
        } else if (action === "set_credits") {
          setMsg({ type: "success", text: `✅ Set ${targetEmail} to ${amount} credits remaining.` });
        } else if (action === "upgrade_unlimited") {
          setMsg({ type: "success", text: `⚡ ${targetEmail} now has UNLIMITED credits.` });
        } else if (action === "remove_unlimited") {
          setMsg({ type: "success", text: `Removed unlimited from ${targetEmail}.` });
        } else if (action === "check_user") {
          setUserInfo(result);
          setMsg({ type: "success", text: `Found user: ${result.credits_remaining} credits remaining` });
        }
        if (action !== "check_user") setAmount("");
      } else {
        setMsg({ type: "error", text: result.error || "Failed" });
      }
    } catch {
      setMsg({ type: "error", text: "Request failed. Check your connection." });
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf9f6' }}>
        <p style={{ color: '#787060', fontFamily: 'Source Serif Pro, Georgia, serif' }}>Loading...</p>
      </div>
    );
  }

  if (!adminEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf9f6', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif', marginBottom: '1rem' }}>Admin Access</h1>
          <p style={{ color: '#787060', marginBottom: '1.5rem' }}>You need to be logged in to Edge to access admin features.</p>
          <a href="/calculator" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2b2823', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 500 }}>
            Go to Edge &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf9f6', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif', marginBottom: '1rem' }}>Not Authorized</h1>
          <p style={{ color: '#787060', marginBottom: '0.5rem' }}>Your account ({adminEmail}) does not have admin privileges.</p>
          <p style={{ color: '#9a9488', fontSize: '0.875rem' }}>Contact the site owner to get admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf9f6', padding: '2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif', marginBottom: '0.25rem' }}>
            👑 Admin Panel
          </h1>
          <p style={{ color: '#787060', fontSize: '0.875rem' }}>
            Logged in as <strong>{adminEmail}</strong>
          </p>
        </div>

        {/* Action Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #d8d6cd', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif', marginBottom: '1rem' }}>
            Manage User Credits
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Target Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#787060', marginBottom: '0.25rem' }}>User Email</label>
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #d8d6cd', backgroundColor: '#f5f5f0', color: '#2b2823', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            {/* Action Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#787060', marginBottom: '0.25rem' }}>Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #d8d6cd', backgroundColor: '#f5f5f0', color: '#2b2823', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="add_credits">Add Credits</option>
                <option value="set_credits">Set Credits Remaining To</option>
                <option value="upgrade_unlimited">⚡ Upgrade to Unlimited</option>
                <option value="remove_unlimited">Remove Unlimited</option>
                <option value="check_user">🔍 Check User Status</option>
              </select>
            </div>

            {/* Amount (only for add/set) */}
            {(action === "add_credits" || action === "set_credits") && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#787060', marginBottom: '0.25rem' }}>Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25"
                  min="0"
                  max="10000"
                  style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #d8d6cd', backgroundColor: '#f5f5f0', color: '#2b2823', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleAction}
              disabled={actionLoading || !targetEmail.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: actionLoading ? '#9a9488' : '#2b2823',
                color: '#fff',
                borderRadius: '0.5rem',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: (!targetEmail.trim()) ? 0.5 : 1,
                marginTop: '0.5rem',
              }}
            >
              {actionLoading ? "Processing..." : "Apply"}
            </button>
          </div>

          {/* Message */}
          {msg && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: msg.type === "success" ? '#16a34a' : '#dc2626' }}>
              {msg.text}
            </p>
          )}

          {/* User Info Card */}
          {userInfo && action === "check_user" && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f0', borderRadius: '0.5rem', border: '1px solid #e5e3da' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2b2823', marginBottom: '0.5rem' }}>User Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div><span style={{ color: '#787060' }}>Email:</span> <strong>{String(userInfo.target_email)}</strong></div>
                <div><span style={{ color: '#787060' }}>Remaining:</span> <strong style={{ color: '#16a34a' }}>{String(userInfo.credits_remaining)}</strong></div>
                <div><span style={{ color: '#787060' }}>Used:</span> {String(userInfo.credits_used)}</div>
                <div><span style={{ color: '#787060' }}>Limit:</span> {String(userInfo.credits_limit)}</div>
                <div><span style={{ color: '#787060' }}>Admin:</span> {userInfo.is_admin ? "👑 Yes" : "No"}</div>
                <div><span style={{ color: '#787060' }}>Unlimited:</span> {userInfo.is_unlimited ? "⚡ Yes" : "No"}</div>
              </div>
            </div>
          )}
        </div>

        {/* API Info Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #d8d6cd', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#2b2823', fontFamily: 'Source Serif Pro, Georgia, serif', marginBottom: '0.75rem' }}>
            🔗 API Access
          </h2>
          <p style={{ color: '#787060', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
            You can also manage credits programmatically from any platform:
          </p>
          <div style={{ backgroundColor: '#1e1e1e', borderRadius: '0.5rem', padding: '1rem', overflowX: 'auto' }}>
            <pre style={{ color: '#e5e5e5', fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
{`POST https://edge.teeco.co/api/admin/manage-credits

{
  "admin_email": "${adminEmail}",
  "action": "add_credits",
  "target_email": "user@example.com",
  "amount": 25
}

Actions: add_credits, set_credits,
         upgrade_unlimited, remove_unlimited,
         check_user`}
            </pre>
          </div>
          <p style={{ color: '#9a9488', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            The API verifies your admin status on every request. No API key needed — just your admin email.
          </p>
        </div>
      </div>
    </div>
  );
}
