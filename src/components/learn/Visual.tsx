import type { ReactNode } from "react";

export function Visual({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <figure className="lesson-visual">
      <div className="visual-label">{title}</div>
      {children}
    </figure>
  );
}
