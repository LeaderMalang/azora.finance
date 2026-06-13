import { Spinner } from "@/components/ui/Spinner";

export default function AppLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" style={{ minHeight: "100vh" }}>
      <Spinner size="lg" />
    </div>
  );
}
