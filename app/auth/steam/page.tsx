import SteamFinish from "../../components/SteamFinish";

export const metadata = { title: "Steam sign-in - GameMatch" };

export default function SteamPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <SteamFinish />
    </main>
  );
}
