import { Home, Mail, Menu } from "lucide-react";

const navLinks = [
  { href: "#", label: "Portfolio" },
  { href: "#", label: "Experience" },
  { href: "#", label: "About" },
];

export default function TopNavigation() {
  return (
    <header className="absolute top-0 left-0 right-0 z-20">
      <nav className="flex items-center justify-between p-4 md:p-6 lg:p-8">
        {/* Left: Code by */}
        <div
          className="text-lg md:text-xl lg:text-2xl font-semibold tracking-tighter"
          style={{ fontFamily: "SF Pro Text, Inter, sans-serif" }}
        >
          © Code by John Nazarene
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <button className="flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-all duration-300">
            <Home className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center bg-[#374136]/50 backdrop-blur-lg rounded-full px-2 py-1 shadow-lg">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-base lg:px-6 lg:text-lg font-medium rounded-full hover:bg-white/10 transition-all duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right: Get in touch / Hamburger */}
        <div className="flex items-center gap-4">
          <button className="hidden md:flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-3 bg-[#374136]/50 backdrop-blur-lg rounded-full text-base lg:text-lg font-semibold hover:bg-[#374136]/70 hover:scale-105 transition-all duration-300">
            <Mail className="w-5 h-5" />
            Get in touch
          </button>
          <button className="md:hidden flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-lg rounded-full hover:bg-white/20 transition-all duration-300">
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </nav>
    </header>
  );
}
