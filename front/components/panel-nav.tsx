"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/resumen", label: "Resumen" },
  { href: "/monitoreo", label: "Monitoreo" },
  { href: "/grabaciones", label: "Grabaciones" },
  { href: "/reservas", label: "Reservas" },
  { href: "/dispositivos", label: "Dispositivos" },
  { href: "/bitacora", label: "Bitacora" },
  { href: "/operadores", label: "Operadores" },
];

export function PanelNav() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState("");

  useEffect(() => {
    const rawUser = localStorage.getItem("auth_user");
    if (!rawUser) {
      setCurrentRole("");
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as { role?: string };
      setCurrentRole(parsedUser.role?.toUpperCase() ?? "");
    } catch {
      setCurrentRole("");
    }
  }, []);

  const isAdmin = currentRole === "ADMIN";

  const visibleNavItems = navItems.filter((item) => {
    if (isAdmin) {
      return true;
    }

    return item.href !== "/monitoreo" && item.href !== "/grabaciones";
  });

  return (
    <nav className="nav-list" aria-label="Navegacion principal">
      {visibleNavItems.map((item) => {
        const isDisabled = item.href === "#";
        const isActive =
          !isDisabled &&
          (pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`)));

        const className = `nav-item${isActive ? " nav-item-active" : ""}`;

        if (isDisabled) {
          return (
            <span key={item.label} className={className} aria-disabled="true">
              {item.label}
            </span>
          );
        }

        return (
          <Link key={item.href} className={className} href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
