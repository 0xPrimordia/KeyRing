import fetch from 'node-fetch';

const HASHSCAN_API_BASE = 'https://testnet.hashscan.io/api';
const ACCOUNT_ID = '0.0.6919888'; // The threshold account we created

async function queryHashScanData(): Promise<void> {
  console.log(`🔍 Querying HashScan API for account: ${ACCOUNT_ID}\n`);
  
  try {
    // 1. Try HashScan Account API
    console.log("📊 HASHSCAN ACCOUNT DATA");
    console.log("=" .repeat(50));
    
    const accountUrl = `${HASHSCAN_API_BASE}/account/${ACCOUNT_ID}`;
    console.log(`Trying: ${accountUrl}`);
    
    const accountResponse = await fetch(accountUrl);
    console.log(`Status: ${accountResponse.status}`);
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      console.log("HashScan Account Data:");
      console.log(JSON.stringify(accountData, null, 2));
    } else {
      console.log("Account endpoint not accessible or different format");
    }

    // 2. Try HashScan Admin Key API (if it exists)
    console.log("\n🔑 HASHSCAN ADMIN KEY DATA");
    console.log("=" .repeat(50));
    
    const adminKeyUrl = `${HASHSCAN_API_BASE}/adminKey/${ACCOUNT_ID}`;
    console.log(`Trying: ${adminKeyUrl}`);
    
    const adminKeyResponse = await fetch(adminKeyUrl);
    console.log(`Status: ${adminKeyResponse.status}`);
    
    if (adminKeyResponse.ok) {
      const adminKeyData = await adminKeyResponse.json();
      console.log("HashScan Admin Key Data:");
      console.log(JSON.stringify(adminKeyData, null, 2));
    } else {
      console.log("Admin key endpoint not accessible");
    }

    // 3. Try different HashScan API endpoints
    console.log("\n🔍 TRYING ALTERNATIVE ENDPOINTS");
    console.log("=" .repeat(50));
    
    const endpoints = [
      `/accounts/${ACCOUNT_ID}`,
      `/account/${ACCOUNT_ID}/keys`,
      `/account/${ACCOUNT_ID}/adminkey`,
      `/keys/${ACCOUNT_ID}`,
      `/entity/${ACCOUNT_ID}`,
      `/v1/account/${ACCOUNT_ID}`,
      `/v1/accounts/${ACCOUNT_ID}`
    ];

    for (const endpoint of endpoints) {
      const url = `${HASHSCAN_API_BASE}${endpoint}`;
      console.log(`\nTrying: ${url}`);
      
      try {
        const response = await fetch(url);
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log("SUCCESS! Data found:");
          console.log(JSON.stringify(data, null, 2));
          break;
        }
      } catch (error) {
        console.log(`Error: ${error}`);
      }
    }

    // 4. Check if HashScan has a public GraphQL or different API
    console.log("\n🌐 CHECKING HASHSCAN WEBSITE REQUESTS");
    console.log("=" .repeat(50));
    
    // Try to mimic what the HashScan website does
    const websiteUrl = `https://testnet.hashscan.io/adminKey/${ACCOUNT_ID}`;
    console.log(`Website URL: ${websiteUrl}`);
    
    const websiteResponse = await fetch(websiteUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'KeyRing-Protocol/1.0'
      }
    });
    
    console.log(`Website Status: ${websiteResponse.status}`);
    console.log(`Content-Type: ${websiteResponse.headers.get('content-type')}`);
    
    if (websiteResponse.ok) {
      const text = await websiteResponse.text();
      
      // Look for JSON data in the response
      const jsonMatch = text.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
      if (jsonMatch) {
        try {
          const initialState = JSON.parse(jsonMatch[1]);
          console.log("Found initial state data:");
          console.log(JSON.stringify(initialState, null, 2));
        } catch (e) {
          console.log("Could not parse initial state JSON");
        }
      }
      
      // Look for API calls in the HTML
      const apiMatches = text.match(/api\/[^"'\s]+/g);
      if (apiMatches) {
        console.log("Found potential API endpoints:");
        apiMatches.forEach(match => console.log(`- ${match}`));
      }
    }

  } catch (error) {
    console.error("❌ Error querying HashScan:", error);
  }
}

// Also create a function to decode protobuf keys manually
async function decodeProtobufKeys(): Promise<void> {
  console.log("\n🔧 MANUAL PROTOBUF DECODING");
  console.log("=" .repeat(50));
  
  // The protobuf key from Mirror Node
  const protobufHex = "32b4010a2212205f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb3990a2212208e9938d49222e81e50054cb172e627668ce1e1c29d9434d2eb6cf21dbdafb5fb0a2212204b4e6be450420832c5110cc121a66f55bbfa5fb115baf49e8a3c71c9c43d84e80a22122059345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb070a2212200158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8";
  
  console.log("Protobuf hex:", protobufHex);
  console.log("Length:", protobufHex.length);
  
  // The protobuf structure for KeyList contains:
  // 0a22 = field 1, length 34 (0x22)
  // 1220 = field 2, length 32 (0x20) - this is the actual public key
  
  console.log("\nLooking for protobuf pattern 0a221220 (KeyList entry with 32-byte key):");
  
  const keyListPattern = /0a221220([a-f0-9]{64})/gi;
  const keyMatches: string[] = [];
  let match;
  
  while ((match = keyListPattern.exec(protobufHex)) !== null) {
    keyMatches.push(match[1]);
  }
  
  if (keyMatches.length > 0) {
    console.log(`\nFound ${keyMatches.length} public keys in protobuf:`);
    keyMatches.forEach((key, index) => {
      console.log(`Key ${index + 1}: ${key}`);
    });
    
    // Compare with our original keys
    console.log("\nOriginal keys for comparison:");
    const originalKeys = [
      "5f2a9826bef0c082e6e885c46022969da4120f5143b9c5413f79eabbba0cb399",
      "8e9938d49222e81e50054cb172e627668ce1e1c29d9434d2eb6cf21dbdafb5fb", 
      "4b4e6be450420832c5110cc121a66f55bbfa5fb115baf49e8a3c71c9c43d84e8",
      "59345a9c8b6112ccc1a3c636d6bc0d2c42477013f3d9f107f0db39b53a5cbb07",
      "0158a26e9dc97312aaf7e8811f3223e5a30b6676a0b58518d062d38418de8eb8"
    ];
    
    originalKeys.forEach((originalKey, index) => {
      console.log(`\nOriginal ${index + 1}: ${originalKey}`);
      const found = keyMatches.find(extractedKey => extractedKey === originalKey);
      console.log(`Found in protobuf: ${found ? '✅' : '❌'}`);
      if (found) {
        console.log(`  Match: ${found}`);
      }
    });
    
    // Generate KeyRing Protocol format
    console.log("\n🔑 KEYRING PROTOCOL FORMAT");
    console.log("=" .repeat(50));
    
    const keyRingKeys = keyMatches.map((key, index) => ({
      codeName: `signer-${index + 1}`,
      publicKey: key,
      publicKeyShort: `${key.substring(0, 10)}...${key.substring(key.length - 6)}`,
      keyType: 'ED25519',
      status: 'Active'
    }));
    
    console.log("KeyRing signer profiles:");
    console.log(JSON.stringify(keyRingKeys, null, 2));
    
  } else {
    console.log("No keys found with expected protobuf pattern");
  }
}

// Run both functions
async function main(): Promise<void> {
  await queryHashScanData();
  await decodeProtobufKeys();
}

if (require.main === module) {
  main();
}

export { queryHashScanData, decodeProtobufKeys };
