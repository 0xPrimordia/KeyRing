#!/bin/bash

# KeyRing Environment Setup Script

echo "🔧 KeyRing Protocol Environment Setup"
echo "====================================="

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 1
    fi
fi

# Copy template to .env.local
echo "📋 Copying env.template to .env.local..."
cp env.template .env.local

echo "✅ Environment file created!"
echo ""
echo "🎯 Next steps:"
echo "1. Edit .env.local with your actual values"
echo "2. Get Hedera credentials from https://portal.hedera.com"
echo "3. Get Supabase credentials from https://supabase.com/dashboard"
echo "4. Get WalletConnect Project ID from https://cloud.walletconnect.com"
echo "5. Run: npm run test:db"
echo ""
echo "📖 See env.template for detailed instructions!"
