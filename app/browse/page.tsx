import BrowseView from "../components/BrowseView";

export const metadata = { title: "Browse - GameMatch" };

export default function BrowsePage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <BrowseView />
    </main>
  );
}
