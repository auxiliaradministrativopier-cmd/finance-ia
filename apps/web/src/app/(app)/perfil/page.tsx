import { screenMetadata } from "@/config/screens";
import { ProfilePage } from "@/features/users/components/profile-page";

export const metadata = screenMetadata("perfil");

export default function Page() {
  return <ProfilePage />;
}
