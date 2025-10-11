"use client";

import { Inter } from "next/font/google";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function PreLoadHero() {
  const [slideUp, setSlideUp] = useState(false);
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    // Store the current scroll position
    const scrollY = window.scrollY;

    // Disable ALL scrolling and touch interactions when component mounts
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.top = `-${scrollY}px`;

    // Prevent ALL scroll and touch events
    const preventInteraction = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Block ALL scroll and touch attempts while PreLoadHero is visible
    window.addEventListener("scroll", preventInteraction, { passive: false });
    window.addEventListener("wheel", preventInteraction, { passive: false });
    window.addEventListener("touchmove", preventInteraction, {
      passive: false,
    });
    window.addEventListener("touchstart", preventInteraction, {
      passive: false,
    });

    const timer = setTimeout(() => {
      setSlideUp(true);
    }, 5000);

    const removeTimer = setTimeout(() => {
      setRemove(true);

      // Re-enable ALL scrolling and touch after component is removed
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.top = "";

      // Restore scroll position
      window.scrollTo(0, scrollY);

      // Remove ALL event listeners
      window.removeEventListener("scroll", preventInteraction);
      window.removeEventListener("wheel", preventInteraction);
      window.removeEventListener("touchmove", preventInteraction);
      window.removeEventListener("touchstart", preventInteraction);
    }, 6000); // 1000ms for animation

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);

      // Ensure everything is re-enabled on cleanup
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.top = "";

      // Remove ALL event listeners
      window.removeEventListener("scroll", preventInteraction);
      window.removeEventListener("wheel", preventInteraction);
      window.removeEventListener("touchmove", preventInteraction);
      window.removeEventListener("touchstart", preventInteraction);
    };
  }, []);

  if (remove) {
    return null;
  }

  // Mobile greetings with exact Figma positions
  const mobileGreetings = [
    { text: "Hole", style: "left-[calc(50%+-201px)] top-[calc(50%+-421.5px)]" },
    { text: "مرحبا", style: "left-[calc(50%+-85px)] top-[calc(50%+-369.5px)]" },
    {
      text: "Сәлеметсіз бе",
      style: "left-[calc(50%+76px)] top-[calc(50%+-358.5px)]",
    },
    { text: "سلام", style: "left-[calc(50%+-185px)] top-[calc(50%+-300.5px)]" },
    {
      text: "Bonjour",
      style: "left-[calc(50%+-30px)] top-[calc(50%+-295.5px)]",
    },
    {
      text: "こんにちは",
      style: "left-[calc(50%+-102px)] top-[calc(50%+-221.5px)]",
    },
    {
      text: "Hallo",
      style: "left-[calc(50%+-189px)] top-[calc(50%+-159.5px)]",
    },
    {
      text: "Bună ziua",
      style: "left-[calc(50%+40.514px)] top-[calc(50%+-159.424px)]",
    },
    {
      text: "Merhaba",
      style: "left-[calc(50%+-96px)] top-[calc(50%+-103.5px)]",
    },
    { text: "Ciao", style: "left-[calc(50%+121px)] top-[calc(50%+-426.5px)]" },
    {
      text: "Γειά σας",
      style: "left-[calc(50%+-307.917px)] top-[calc(50%+-68.792px)]",
    },
    { text: "Привет", style: "left-[calc(50%+88px)] top-[calc(50%+78.5px)]" },
    { text: "হ্যালো", style: "left-[calc(50%+-49px)] top-[calc(50%+78.5px)]" },
    {
      text: "สวัสดี",
      style: "left-[calc(50%+-202.179px)] top-[calc(50%+83.772px)]",
    },
    { text: "Olá", style: "left-[calc(50%+-185px)] top-[calc(50%+152.5px)]" },
    {
      text: "Здравейте",
      style: "left-[calc(50%+11px)] top-[calc(50%+152.5px)]",
    },
    { text: "你好", style: "left-[calc(50%+116px)] top-[calc(50%+221.5px)]" },
    {
      text: "Xin chào",
      style: "left-[calc(50%+-290px)] top-[calc(50%+221.5px)]",
    },
    { text: "Ahoj", style: "left-[calc(50%+-51px)] top-[calc(50%+221.5px)]" },
    { text: "ہیلو", style: "left-[calc(50%+-51px)] top-[calc(50%+297.5px)]" },
    { text: "Salom", style: "left-[calc(50%+88px)] top-[calc(50%+302.5px)]" },
    { text: "Cześć", style: "left-[calc(50%+-230px)] top-[calc(50%+313.5px)]" },
    { text: "Kamusta", style: "left-[calc(50%+29px)] top-[calc(50%+377.5px)]" },
    {
      text: "안녕하세요",
      style: "left-[calc(50%+-189px)] top-[calc(50%+382.5px)]",
    },
  ];

  // Desktop greetings with original positions
  const desktopGreetings = [
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
      {/* Mobile Background greetings */}
      <div className="md:hidden">
        {mobileGreetings.map((greeting, index) => (
          <div
            key={index}
            className={`absolute text-white text-[39.274px] opacity-25 translate-y-[-50%] whitespace-nowrap ${
              greeting.style
            } ${index % 2 === 0 ? "animate-move-left" : "animate-move-right"}`}
            style={{
              fontFamily: "SF Pro Text, sans-serif",
              fontWeight: 400,
              letterSpacing: "-1.8184px",
              lineHeight: "20.644px",
            }}
          >
            {greeting.text}
          </div>
        ))}
      </div>

      {/* Desktop Background greetings */}
      <div className="hidden md:block">
        {desktopGreetings.map((greeting, index) => (
          <div
            key={index}
            className={`absolute text-white text-5xl opacity-25 ${
              greeting.style
            } ${index % 2 === 0 ? "animate-move-left" : "animate-move-right"}`}
          >
            {greeting.text}
          </div>
        ))}
      </div>

      {/* Mobile Main greeting */}
      <div className="md:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <h1
          className="text-white text-[65.423px] font-bold whitespace-nowrap"
          style={{
            textShadow: "0px 0px 17.037px rgba(0, 0, 0, 0.5)",
            fontFamily: "SF Pro Text, sans-serif",
            letterSpacing: "-3.0291px",
            lineHeight: "27.941px",
          }}
        >
          Hi, I&apos;m John
        </h1>
      </div>

      {/* Desktop Main greeting */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
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
