import { Fournisseurs } from "@/components/layout/fournisseurs";

/** Pages publiques du CRM (connexion) : thème, notifications et application installable du CRM. */
export default function LayoutPublicCrm({ children }: { children: React.ReactNode }) {
  return <Fournisseurs>{children}</Fournisseurs>;
}
