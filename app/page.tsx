import PreLoadHero from "./components/PreLoadHero";
// import HelloWorld from "./components/helloworld";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Portfolio from "./components/Portfolio";
import Work from "./components/Work";

export default function Page() {
  return (
    <main className="relative">
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
