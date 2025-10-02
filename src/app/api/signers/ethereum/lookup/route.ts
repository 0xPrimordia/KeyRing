import { NextRequest, NextResponse } from 'next/server';
import { KeyRingDB } from '../../../../../../lib/keyring-db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const signer = await KeyRingDB.getSignerByWalletAddress(walletAddress);

    if (signer) {
      return NextResponse.json({ success: true, signer }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Signer not found' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Error looking up Ethereum signer:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
