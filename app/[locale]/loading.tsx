import { Spinner } from "@/components/ui/Spinner";

export default function LandingLoading() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Spinner size="lg" />
    </div>
  );
}
