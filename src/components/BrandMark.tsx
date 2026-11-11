import Link from 'next/link';

interface BrandMarkProps {
  href?: string;
  onClick?: () => void;
}

export default function BrandMark({ href = '/', onClick }: BrandMarkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex items-center gap-2.5 group select-none"
    >
      <span className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-clash-semibold text-base tracking-tight border-2 border-black group-hover:bg-[#C44900] group-hover:border-[#C44900] transition-colors">
        O<span className="text-[#C44900] group-hover:text-white">.</span>
      </span>
      <span className="font-clash-semibold text-lg font-bold tracking-tight text-slate-900 leading-none">
        OJT<span className="text-[#C44900]">.SYS</span>
      </span>
    </Link>
  );
}
