import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SpendRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day } = await searchParams;
  redirect(day ? `/budget?day=${encodeURIComponent(day)}` : "/budget");
}
