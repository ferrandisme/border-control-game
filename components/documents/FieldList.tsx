type FieldRow = {
  label: string;
  value: string;
};

export type FieldListProps = {
  fields: FieldRow[];
  columns?: 1 | 2;
};

export function FieldList({ fields, columns = 2 }: FieldListProps) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
      {fields.map((field) => (
        <div key={`${field.label}-${field.value}`} className="border-b border-slate-500/20 pb-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{field.label}</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{field.value}</p>
        </div>
      ))}
    </div>
  );
}
