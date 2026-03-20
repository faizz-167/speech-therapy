import { useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

export const RoleGuard = ({ children, allowedRole }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // Check role from publicMetadata (set during onboarding/sync)
  // Or assume therapist for therapist routes if no specific metadata strategy is chosen yet
  const userRole = user.publicMetadata?.role || "patient";

  if (userRole !== allowedRole) {
    // Redirect to the appropriate home based on actual role
    return <Navigate to={userRole === "therapist" ? "/therapist/dashboard" : "/patient/home"} replace />;
  }

  return children;
};
