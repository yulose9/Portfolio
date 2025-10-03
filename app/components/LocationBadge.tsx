import Image from "next/image";

export default function LocationBadge() {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[356px] h-[162px] bg-white/10 backdrop-blur-lg rounded-r-3xl flex items-center justify-center">
      <div className="flex items-center gap-[51px] px-[54px]">
        <div
          className="text-[26px] font-semibold leading-[107%] tracking-[-0.105em] text-left"
          style={{ fontFamily: "SF UI Text, Inter, sans-serif" }}
        >
          Located
          <br />
          in the
          <br />
          Philippines
        </div>
        <div className="w-[100px] h-[100px] rounded-full overflow-hidden flex-shrink-0">
          <Image
            src="/snazzy-image.png"
            alt="Philippines Map"
            width={100}
            height={100}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
