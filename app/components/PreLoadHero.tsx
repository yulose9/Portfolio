"use client";

import { Inter } from "next/font/google";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function PreLoadHero() {
  const [slideUp, setSlideUp] = useState(false);
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSlideUp(true);
    }, 5000);

    const removeTimer = setTimeout(() => {
      setRemove(true);
    }, 6000); // 500ms for animation

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (remove) {
    return null;
  }

  const greetings = [
    { text: "Hole", style: "top-[5%] left-[40%]" },
    { text: "مرحبا", style: "top-[3%] left-[50%]" },
    { text: "Сәлеметсіз бе", style: "top-[5%] left-[15%]" },
    { text: "سلام", style: "top-[3%] left-[85%]" },
    { text: "Bonjour", style: "top-[20%] left-[10%]" },
    { text: "Hallo", style: "top-[20%] left-[30%]" },
    { text: "Bună ziua", style: "top-[20%] left-[60%]" },
    { text: "こんにちは", style: "top-[25%] left-[80%]" },
    { text: "Merhaba", style: "top-[30%] left-[40%]" },
    { text: "Ciao", style: "top-[40%] left-[5%]" },
    { text: "Γειά σας", style: "top-[40%] left-[20%]" },
    { text: "Здравейте", style: "top-[45%] left-[75%]" },
    { text: "Olá", style: "top-[55%] left-[13%]" },
    { text: "Salom", style: "top-[60%] left-[83%]" },
    { text: "สวัสดี", style: "top-[65%] left-[25%]" },
    { text: "Привет", style: "top-[67%] left-[50%]" },
    { text: "你好", style: "top-[75%] left-[3%]" },
    { text: "হ্যালো", style: "top-[80%] left-[17%]" },
    { text: "Xin chào", style: "top-[80%] left-[65%]" },
    { text: "Cześć", style: "top-[85%] left-[35%]" },
    { text: "ہیلو", style: "top-[87%] left-[60%]" },
    { text: "Kamusta", style: "top-[88%] left-[80%]" },
    { text: "Ahoj", style: "top-[90%] left-[45%]" },
    { text: "안녕하세요", style: "top-[90%] left-[10%]" },
  ];

  return (
    <div
      className={`${
        inter.className
      } absolute inset-0 z-[9999] w-screen h-screen bg-[#3B5237] overflow-hidden transition-transform duration-1000 ease-out ${
        slideUp ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {/* Background greetings */}
      {greetings.map((greeting, index) => (
        <div
          key={index}
          className={`absolute text-white text-5xl opacity-25 ${
            greeting.style
          } ${index % 2 === 0 ? "animate-move-left" : "animate-move-right"}`}
        >
          {greeting.text}
        </div>
      ))}

      {/* Main greeting */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <h1
          className="text-white text-7xl font-bold whitespace-nowrap"
          style={{
            textShadow: "0px 0px 25px rgba(0, 0, 0, 0.5)",
          }}
        >
          Hi, I&apos;m John
        </h1>
      </div>
    </div>
  );
}
