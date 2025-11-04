'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <footer className="mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-gray-400 mb-4 md:mb-0">
            <div>© 2025 KeyRing Protocol. All rights reserved.</div>
            <div className="mt-1">
              A product of{' '}
              <a 
                href="https://lynxify.xyz/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-teal hover:text-primary transition-colors"
              >
                Lynxify
              </a>
            </div>
          </div>
          
          <nav className="flex space-x-6">
            <Link 
              href="/registry" 
              className={`text-sm transition-colors ${
                isActive('/registry')
                  ? 'text-primary hover:text-primary-dark' 
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              Registry
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

