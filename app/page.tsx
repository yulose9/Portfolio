// import HelloWorld from "./components/helloworld";
import Hero from "./components/Hero";
import PreLoadHero from "./components/PreLoadHero";

export default function Page() {
  return (
    <main className="relative">
      <PreLoadHero />
      <Hero />
      {/* <HelloWorld /> */}
    </main>
  );
}
