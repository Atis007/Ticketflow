import { useNavigate } from "react-router-dom";

import AsyncState from "@/components/AsyncState";
import { useAuth } from "@/auth/context/AuthContext";
import { useFavorites } from "@/profile/hooks/useFavorites";
import { usePurchases } from "@/profile/hooks/usePurchases";
import ProfileHeader from "@/profile/components/ProfileHeader";
import ProfileSection from "@/profile/components/ProfileSection";
import PurchasesList from "@/profile/components/PurchasesList";
import FavoritesList from "@/profile/components/FavoritesList";
import QuickActions from "@/profile/components/QuickActions";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const favoritesQuery = useFavorites(isAuthenticated);
  const purchasesQuery = usePurchases(isAuthenticated);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-2 pt-4 pb-6 sm:px-4 lg:px-6">
      <ProfileHeader user={user} onLogout={handleLogout} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ProfileSection title="Purchases">
            {purchasesQuery.isPending ? <AsyncState message="Loading purchases..." /> : null}
            {purchasesQuery.isError ? <AsyncState type="error" message={purchasesQuery.error?.message || "Failed to load purchases."} onRetry={() => purchasesQuery.refetch()} /> : null}
            {!purchasesQuery.isPending && !purchasesQuery.isError ? <PurchasesList items={purchasesQuery.data || []} /> : null}
          </ProfileSection>

          <ProfileSection title="Quick Actions">
            <QuickActions />
          </ProfileSection>
        </div>

        <div className="space-y-6">
          <ProfileSection title="Favorites">
            {favoritesQuery.isPending ? <AsyncState message="Loading favorites..." /> : null}
            {favoritesQuery.isError ? <AsyncState type="error" message={favoritesQuery.error?.message || "Failed to load favorites."} onRetry={() => favoritesQuery.refetch()} /> : null}
            {!favoritesQuery.isPending && !favoritesQuery.isError ? <FavoritesList items={favoritesQuery.data || []} /> : null}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}
