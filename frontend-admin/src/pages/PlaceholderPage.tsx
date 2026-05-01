export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-slate-800">{title}</h2>
      <p className="text-slate-600">Module à implémenter.</p>
    </div>
  )
}
