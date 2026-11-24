import LibraryView from "../components/LibraryView";

export const metadata = { title: "Library - GameMatch" };

export default function LibraryPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <LibraryView />
    </main>
  );
}
