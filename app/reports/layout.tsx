import { ManageLayout } from "@/components/layout/ManageLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ManageLayout>{children}</ManageLayout>;
}
