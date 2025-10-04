// import HelloWorld from "./components/helloworld";
import Hero from "./components/Hero";
import Portfolio from "./components/Portfolio";
// import PreLoadHero from "./components/PreLoadHero";

export default function Page() {
  return (
    <main className="relative">
      {/* <PreLoadHero /> */}
      <Hero />
      <Portfolio />
      {/* <HelloWorld /> */}
    </main>
  );
}
