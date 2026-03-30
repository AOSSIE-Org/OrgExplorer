interface Props {
  title: string;
  value: string | number;
}

export default function StatCard({ title, value }: Props) {
  return (
    <div className="bg-[#1F2937] p-4 rounded-xl  h-32">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-green-400">{value}</h2>
    </div>
  );
}