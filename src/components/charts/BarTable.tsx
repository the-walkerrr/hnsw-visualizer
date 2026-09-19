export function BarTable({
  bars,
  format,
  labelTitle, valueTitle,
}: {
  bars: Array<{ label: string; value: number }>
  format: (v: number) => string
  labelTitle: string
  valueTitle: string
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{labelTitle}</th>
          <th>{valueTitle}</th>
        </tr>
      </thead>
      <tbody>
        {bars.map((b) => (
          <tr key={b.label}>
            <td>{b.label}</td>
            <td>{format(b.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
