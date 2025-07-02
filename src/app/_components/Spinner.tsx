import { Loader2Icon } from "lucide-react";
export default function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2Icon className="animate-spin" size={size} />;
}
