import Link from "next/link";

export function Breadcrumb({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-[#b42318]">
                {item.label}
              </Link>
            ) : (
              <span className="text-stone-700">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
