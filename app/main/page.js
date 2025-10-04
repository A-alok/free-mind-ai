import ProtectedRoute from "@/components/ProtectedRoute";
import LandingHeader from "@/components/LandingHeader";
import Footer from "@/components/Footer";
import MainOverview from "@/components/MainOverview";

export default function Home() {
  return (
    <ProtectedRoute>
      <>
        <LandingHeader mode="logout" />
        <MainOverview />
        <Footer />
      </>
    </ProtectedRoute>
  );
}

