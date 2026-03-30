const variants = {
  primary: "bg-medical-600 hover:bg-medical-700 text-white",
  secondary: "bg-white text-medical-700 border border-medical-200 hover:bg-medical-50",
  ghost: "bg-transparent text-medical-700 hover:bg-medical-100",
};

function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
