"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/resumen", label: "Resumen" },
  { href: "/reservas", label: "Reservas" },
  { href: "/dispositivos", label: "Dispositivos" },
  { href: "#", label: "Bitacora" },
  { href: "/operadores", label: "Operadores" },
];

export function PanelNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-list" aria-label="Navegacion principal">
      {navItems.map((item) => {
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
