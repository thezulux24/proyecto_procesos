"use client";

import { useEffect, useState } from "react";

type AuthUser = {
  fullName?: string;
  email?: string;
  role?: string;
};

export function UserSessionChip() {
  const [label, setLabel] = useState("Operador sistema");

  useEffect(() => {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as AuthUser;
      const displayName = parsedUser.fullName?.trim() || parsedUser.email?.trim();
      if (displayName) {
        setLabel(displayName);
      }
    } catch {
      // Ignore malformed local storage payload and keep fallback label.
    }
  }, []);

  return <div className="session-user-chip">{label}</div>;
}
