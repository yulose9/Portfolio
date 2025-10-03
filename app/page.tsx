// import HelloWorld from "./components/helloworld";
import PreLoadHero from "./components/PreLoadHero";

import Hero from "./components/Hero";

export default function Page() {
  return (
    <main className="relative">
      <PreLoadHero />
      <Hero />
      {/* <HelloWorld /> */}
    </main>
  );
}
