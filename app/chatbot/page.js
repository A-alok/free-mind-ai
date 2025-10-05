import Chatbot from '@/components/chatbot';
import ProtectedRoute from '@/components/ProtectedRoute';
import FloatingControls from '@/components/FloatingControls';
import Navbar from "@/components/Navbar";

export default function ChatbotPage() {
  return (
    <ProtectedRoute>
      <>
        <Navbar />
        <FloatingControls backHref="/main" />
        <Chatbot />
      </>
    </ProtectedRoute>
  );
}
