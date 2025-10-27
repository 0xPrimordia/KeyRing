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
            <Link href="/" onClick={closeMobileMenu}>
              <Image
                src="/logo.png"
                alt="KeyRing Protocol"
                width={160}
                height={53}
                className="h-14 w-auto cursor-pointer"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-8">
              <Link 
                href="/" 
                className={`transition-colors ${
                  isActive('/') && pathname === '/'
                    ? 'text-primary hover:text-primary-dark' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Registry
              </Link>
              <Link 
                href="/signers" 
                className={`transition-colors ${
                  isActive('/signers')
                    ? 'text-primary hover:text-primary-dark' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Become a Signer
              </Link>
              <Link 
                href="/register" 
                className={`transition-colors ${
                  isActive('/register')
                    ? 'text-primary hover:text-primary-dark' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Register List
              </Link>
              <Link 
                href="/signer-dashboard" 
                className={`transition-colors ${
                  isActive('/signer-dashboard')
                    ? 'text-primary hover:text-primary-dark' 
                    : 'text-foreground hover:text-primary'
                }`}
              >
                Signer Dashboard
              </Link>
            </nav>
            
            <div className="border-l border-gray-700 pl-8">
              <WalletButton />
            </div>
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
                href="/"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/') && pathname === '/'
                    ? 'text-primary bg-primary/10' 
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                Registry
              </Link>
              <Link
                href="/signers"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/signers')
                    ? 'text-primary bg-primary/10' 
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                Become a Signer
              </Link>
              <Link
                href="/register"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/register')
                    ? 'text-primary bg-primary/10' 
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                Register List
              </Link>
              <Link
                href="/signer-dashboard"
                onClick={closeMobileMenu}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive('/signer-dashboard')
                    ? 'text-primary bg-primary/10' 
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                Signer Dashboard
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
