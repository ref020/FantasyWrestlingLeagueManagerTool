type PageHeadingProps = Readonly<{
  eyebrow: string;
  title: string;
}>;

export function PageHeading({ eyebrow, title }: PageHeadingProps) {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green)]">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
    </header>
  );
}