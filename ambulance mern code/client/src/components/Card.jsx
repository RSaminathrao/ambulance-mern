function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-card border border-red-100 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
