"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    document.cookie = "auth_token=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className="logout-button" onClick={handleLogout}>
      Cerrar sesion
    </button>
  );
}
