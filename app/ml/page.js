import MLSystem from "@/components/ml-system"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function MLPage() {
  return(
    <ProtectedRoute>
      <div>
        <Navbar />
        <MLSystem />
        <Footer />
      </div>
    </ProtectedRoute>
  ); 
}
