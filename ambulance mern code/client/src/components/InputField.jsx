function InputField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  options,
  error,
  required = false,
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700" htmlFor={name}>
        {label}
      </label>
      {type === "select" ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-medical-500 focus:ring-2 focus:ring-medical-200 outline-none"
          required={required}
        >
          <option value="">Select option</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-medical-500 focus:ring-2 focus:ring-medical-200 outline-none"
          required={required}
        />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default InputField;
