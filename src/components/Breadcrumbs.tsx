import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
      <Link to="/" className="flex items-center gap-1 hover:text-maroon-700">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, i) => (
        <Fragment key={i}>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          {item.to ? (
            <Link to={item.to} className="font-medium hover:text-maroon-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-700">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
