const statusStyles = {
  Pending: "bg-yellow-100 text-yellow-800",
  Assigned: "bg-green-100 text-green-800",
  Completed: "bg-blue-100 text-blue-800",
  Available: "bg-green-100 text-green-800",
  Offline: "bg-gray-200 text-gray-700",
  Verified: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
