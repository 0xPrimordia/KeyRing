'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WalletButton";

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <header className="pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="KeyRing Protocol"
                width={160}
                height={53}
                className="h-14 w-auto cursor-pointer"
              />
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
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
            </nav>
            
            <div className="border-l border-gray-700 pl-8">
              <WalletButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
