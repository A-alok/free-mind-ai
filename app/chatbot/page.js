import Chatbot from '@/components/chatbot';
import ProtectedRoute from '@/components/ProtectedRoute';
import FloatingControls from '@/components/FloatingControls';

export default function ChatbotPage() {
  return (
    <ProtectedRoute>
      <>
        <FloatingControls backHref="/main" />
        <Chatbot />
      </>
    </ProtectedRoute>
  );
}
