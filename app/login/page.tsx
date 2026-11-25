import AuthMockup from "../components/AuthMockup";

export const metadata = { title: "Sign in - GameMatch" };

export default function LoginPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthMockup mode="login" />
    </main>
  );
}
