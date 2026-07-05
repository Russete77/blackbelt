import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { navItems } from "@/components/shell/nav-items";
import { Badge } from "@/components/ui/Badge";

export default function Home() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-1">
        BLACK <span className="text-accent">BELT</span> 360
      </h1>
      <p className="text-muted mb-6">Organização 360 do selo. Escolha um módulo.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {navItems.filter((n) => n.label !== "Home").map((n) => {
          const inner = (
            <Card className={n.disponivel ? "hover:border-accent transition" : "opacity-60"}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <span className="text-2xl" aria-hidden>{n.icon}</span>
                  {!n.disponivel && <Badge tone="neutral">Em breve</Badge>}
                </div>
                <h3 className="mt-3 font-semibold">{n.label}</h3>
              </CardBody>
            </Card>
          );
          return n.disponivel
            ? <Link key={n.href} href={n.href}>{inner}</Link>
            : <div key={n.href}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
