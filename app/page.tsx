import { About } from "./(sections)/about";
import { Contact } from "./(sections)/contact";
import { Hero, PreLoadHero } from "./(sections)/hero";
import { Portfolio } from "./(sections)/portfolio";
import { Work } from "./(sections)/work";
import { Footer } from "./components/layout";

export default function Page() {
  return (
    <main className="relative overflow-x-hidden w-full">
      <PreLoadHero />
      <Hero />
      <Portfolio />
      <Work />
      <About />
      <Contact />
      <Footer />
      {/* <HelloWorld /> */}
    </main>
  );
}
