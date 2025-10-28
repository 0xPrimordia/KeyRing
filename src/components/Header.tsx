'use client';

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-3">
              <Image
                src="/key_ring_logo_lock_v1.svg"
                alt="KeyRing Protocol"
                width={40}
                height={40}
                className="h-10 w-10 cursor-pointer"
              />
              <span className="text-2xl text-white">KEYRING</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center flex-1 justify-center">
            <nav className="flex space-x-8">
              <Link 
                href="/signers" 
                className={`text-2xl transition-colors ${
                  isActive('/signers')
                    ? 'text-teal hover:text-teal' 
                    : 'text-foreground hover:text-teal'
                }`}
              >
                For Signers
              </Link>
              <Link 
                href="/register" 
                className={`text-2xl transition-colors ${
                  isActive('/register')
                    ? 'text-teal hover:text-teal' 
                    : 'text-foreground hover:text-teal'
                }`}
              >
                For Projects
              </Link>
            </nav>
          </div>
            
          {/* Wallet Button */}
          <div className="hidden md:block">
            <WalletButton />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-foreground hover:text-primary transition-colors p-2"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card rounded-lg mt-2 border border-border-dark">
              <Link
                href="/signers"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/signers')
                    ? 'text-teal bg-teal/10' 
                    : 'text-foreground hover:text-teal hover:bg-teal/5'
                }`}
              >
                For Signers
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/register')
                    ? 'text-teal bg-teal/10' 
                    : 'text-foreground hover:text-teal hover:bg-teal/5'
                }`}
              >
                For Projects
              </Link>
              
              {/* Mobile Wallet Button */}
              <div className="px-3 py-2 border-t border-border-dark mt-4 pt-4">
                <WalletButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
