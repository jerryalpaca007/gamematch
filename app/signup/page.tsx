import AuthForm from "../components/AuthForm";

export const metadata = { title: "Sign up - GameMatch" };

export default function SignupPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthForm mode="signup" />
    </main>
  );
}
