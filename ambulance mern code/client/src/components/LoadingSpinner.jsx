function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-medical-200 border-t-medical-600" />
      <span>{text}</span>
    </div>
  );
}

export default LoadingSpinner;
