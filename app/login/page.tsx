import AuthForm from "../components/AuthForm";

export const metadata = { title: "Sign in - GameMatch" };

export default function LoginPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthForm mode="login" />
    </main>
  );
}
