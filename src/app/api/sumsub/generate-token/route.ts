import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { accountId, externalUserId } = await request.json();

    if (!accountId || !externalUserId) {
      return NextResponse.json({ 
        error: 'Account ID and external user ID are required' 
      }, { status: 400 });
    }

    // Sumsub API credentials from environment
    const sumsubAppToken = process.env.SUMSUB_TOKEN;
    const sumsubSecretKey = process.env.SUMSUB_SECRET;
    const sumsubBaseUrl = process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com';

    if (!sumsubAppToken || !sumsubSecretKey) {
      console.error('Missing Sumsub credentials');
      return NextResponse.json({ 
        error: 'Sumsub configuration error' 
      }, { status: 500 });
    }

    // Generate access token directly - WebSDK handles applicant creation
    const tokenPath = `/resources/accessTokens?userId=${externalUserId}&ttlInSecs=3600&levelName=id-and-liveness`;
    const tokenMethod = 'POST';
    const tokenTimestamp = Math.floor(Date.now() / 1000);

    const tokenSignature = createSignature(
      tokenMethod,
      tokenPath,
      '',
      tokenTimestamp,
      sumsubSecretKey
    );

    const tokenResponse = await fetch(`${sumsubBaseUrl}${tokenPath}`, {
      method: tokenMethod,
      headers: {
        'X-App-Token': sumsubAppToken,
        'X-App-Access-Sig': tokenSignature,
        'X-App-Access-Ts': tokenTimestamp.toString(),
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to generate access token:', errorText);
      throw new Error('Failed to generate access token');
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      token: tokenData.token,
    });

  } catch (error) {
    console.error('Error generating Sumsub access token:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate access token'
    }, { status: 500 });
  }
}

// Helper function to create Sumsub API signature
function createSignature(
  method: string,
  path: string,
  body: string,
  timestamp: number,
  secretKey: string
): string {
  const data = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');
}
