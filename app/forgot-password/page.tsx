import AuthForm from "../components/AuthForm";

export const metadata = { title: "Forgot password - GameMatch" };

export default function ForgotPasswordPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthForm mode="forgot" />
    </main>
  );
}
