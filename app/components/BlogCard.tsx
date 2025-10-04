import Image from "next/image";

interface BlogCardProps {
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  date: string;
}

export default function BlogCard({
  image,
  tag,
  tagColor,
  title,
  date,
}: BlogCardProps) {
  return (
    <div className="relative bg-black rounded-[31px] overflow-hidden w-full h-[471px] group cursor-pointer transition-transform hover:scale-105">
      {/* Image Container with explicit dimensions */}
      <div className="absolute top-0 left-0 w-full h-[397px]">
        <Image
          src={image}
          alt={title}
          width={395}
          height={397}
          className="w-full h-full object-cover"
          priority
        />
      </div>

      {/* Gradient overlay - starts from middle to bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />

      {/* Content Container - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[274px] flex items-end">
        <div className="w-full p-[31px] space-y-[10px]">
          {/* Tag */}
          <div className="mb-[10px]">
            <span
              className="inline-block px-[8px] py-[3px] rounded-[21px] text-white text-[16px] font-bold uppercase tracking-tight"
              style={{ backgroundColor: tagColor }}
            >
              {tag}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-white text-[27px] font-bold leading-[33px] tracking-wide">
            {title}
          </h3>

          {/* Date */}
          <p className="text-white text-[18px] font-semibold tracking-tight mt-[16px]">
            {date}
          </p>
        </div>
      </div>
    </div>
  );
}
