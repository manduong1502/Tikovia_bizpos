export default function PlaceholderPage({ title, icon = '🚧' }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="text-5xl mb-4">{icon}</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">Trang này đang được phát triển...</p>
    </div>
  );
}
