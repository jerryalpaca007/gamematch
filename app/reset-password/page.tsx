import AuthForm from "../components/AuthForm";

export const metadata = { title: "New password - GameMatch" };

export default function ResetPasswordPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AuthForm mode="reset" />
    </main>
  );
}
