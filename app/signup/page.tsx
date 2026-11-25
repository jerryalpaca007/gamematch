import AuthMockup from "../components/AuthMockup";

export const metadata = { title: "Sign up - GameMatch" };

export default function SignupPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthMockup mode="signup" />
    </main>
  );
}
