import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetches ED25519 public key from Hedera Mirror Node by account ID.
 * No DB required - the key is on-chain.
 * POST body: { accountId: "0.0.xxxxx" }
 * GET query: ?accountId=0.0.xxxxx
 */
async function fetchPublicKey(accountId: string) {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  const mirrorNodeUrl =
    network === 'mainnet'
      ? 'https://mainnet.mirrornode.hedera.com'
      : 'https://testnet.mirrornode.hedera.com';

  const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);
  if (!response.ok) {
    throw new Error(`Account not found or Mirror Node error: ${response.status}`);
  }

  const accountData = await response.json();
  if (!accountData.key || !accountData.key.key) {
    throw new Error('Account has no ED25519 public key');
  }

  return accountData.key.key;
}

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json({ success: false, error: 'Valid accountId (0.0.xxxxx) required' }, { status: 400 });
    }
    const publicKey = await fetchPublicKey(accountId);
    return NextResponse.json({ success: true, publicKey });
  } catch (error) {
    console.error('[API] get-public-key GET:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get public key' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
      return NextResponse.json({ success: false, error: 'Valid accountId (0.0.xxxxx) required' }, { status: 400 });
    }

    const publicKey = await fetchPublicKey(accountId);
    return NextResponse.json({ success: true, publicKey });
  } catch (error) {
    console.error('[API] get-public-key POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get public key',
      },
      { status: 500 }
    );
  }
}
