import Dashboard from "@/components/Dashboard"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function Home() {
  return(
    <ProtectedRoute>
      <div>
        <Navbar />
        <Dashboard />
        <Footer />
      </div>
    </ProtectedRoute>
  ); 
}

