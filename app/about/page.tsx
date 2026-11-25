import AboutView from "../components/AboutView";

export const metadata = { title: "About - GameMatch" };

export default function AboutPage() {
  return (
    <main className="flex-1 px-3 py-6 md:px-6">
      <AboutView />
    </main>
  );
}
