function Table({ columns, data, renderActions }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white shadow-card">
      <table className="min-w-full text-sm">
        <thead className="bg-red-50 text-gray-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-semibold">
                {column.label}
              </th>
            ))}
            {renderActions && <th className="px-4 py-3 text-left font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (renderActions ? 1 : 0)}
                className="px-4 py-6 text-center text-gray-500"
              >
                No data found.
              </td>
            </tr>
          )}
          {data.map((row, index) => (
            <tr key={row._id || index} className="border-t border-gray-100 hover:bg-red-50/50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-gray-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              {renderActions && <td className="px-4 py-3">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
