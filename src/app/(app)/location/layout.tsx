import { OngletsLocation } from "@/components/location/onglets-location";
import { exigerRolePage, ROLES_GESTION } from "@/lib/permissions";

export default async function LayoutLocation({ children }: { children: React.ReactNode }) {
  await exigerRolePage(ROLES_GESTION);
  return (
    <>
      <OngletsLocation />
      {children}
    </>
  );
}
