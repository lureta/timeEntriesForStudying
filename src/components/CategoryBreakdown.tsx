import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type CategorySlice = { name: string; hours: number; color: string };
export default function CategoryBreakdown({ categories, period }: { categories: CategorySlice[]; period: string }) {
  const total = categories.reduce((sum, category) => sum + category.hours, 0);
  return <section className="panel category-breakdown-panel">
    <div className="panel-heading"><div><h2>Where your study time went</h2><p>Category breakdown for {period}</p></div></div>
    {total > 0 ? <div className="category-breakdown-layout">
      <div className="category-breakdown-ring" role="img" aria-label={`Category breakdown: ${categories.map((category) => `${category.name}, ${category.hours.toFixed(1)} hours`).join('; ')}`}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart><Pie data={categories} dataKey="hours" nameKey="name" innerRadius="66%" outerRadius="88%" paddingAngle={categories.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270}>
            {categories.map((category) => <Cell key={category.name} fill={category.color} />)}
          </Pie><Tooltip formatter={(value) => `${Number(value).toFixed(2)}h`} /></PieChart>
        </ResponsiveContainer>
        <div className="category-breakdown-total"><strong>{Number(total.toFixed(2))}h</strong><span>total studied</span></div>
      </div>
      <ul className="category-breakdown-legend">{categories.map((category) => <li key={category.name}>
        <i style={{ backgroundColor: category.color }} aria-hidden="true" /><span>{category.name}</span><strong>{Number(category.hours.toFixed(2))}h</strong><small>{Math.round(category.hours / total * 100)}%</small>
      </li>)}</ul>
    </div> : <p className="empty">Log a study session to see your category breakdown.</p>}
  </section>;
}
