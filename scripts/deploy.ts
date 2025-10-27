import {
  Client,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  AccountId,
  Hbar
} from "@hashgraph/sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Threshold list account we created earlier
const THRESHOLD_LIST_ACCOUNT = "0.0.7097961";

async function main() {
  console.log("🚀 Deploying BoostProject Contract to Hedera Testnet\n");
  
  // Configure client for testnet
  const client = Client.forTestnet();
  
  // Set operator account
  const operatorId = process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_TESTNET_PRIVATE_KEY;
  
  if (!operatorId || !operatorKey) {
    throw new Error("Please set HEDERA_TESTNET_ACCOUNT_ID and HEDERA_TESTNET_PRIVATE_KEY in your .env.local file");
  }
  
  client.setOperator(operatorId, operatorKey);
  
  console.log(`📋 Configuration:`);
  console.log(`   Operator: ${operatorId}`);
  console.log(`   Signers: ${SIGNER_ACCOUNTS.join(", ")}`);
  console.log(`   Required Approvals: ${REQUIRED_APPROVALS}\n`);
  
  // Read compiled contract bytecode
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'BoostProject.sol', 'BoostProject.json');
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Please compile first:\n" +
      "  npx hardhat compile"
    );
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode;
  
  if (!bytecode || bytecode === '0x') {
    throw new Error("Invalid bytecode in artifact");
  }
  
  console.log("✅ Contract bytecode loaded");
  console.log(`   Size: ${bytecode.length / 2} bytes\n`);
  
  // Convert accounts to EVM address format for constructor parameters
  const operatorAddress = AccountId.fromString(operatorId).toSolidityAddress();
  const signerAddresses = SIGNER_ACCOUNTS.map(id => AccountId.fromString(id).toSolidityAddress());
  
  console.log("🔨 Deploying contract...");
  console.log(`   This may take 15-30 seconds...\n`);
  
  try {
    // Create contract with constructor parameters
    let params = new ContractFunctionParameters()
      .addAddress(operatorAddress)
      .addAddressArray(signerAddresses)
      .addUint256(REQUIRED_APPROVALS);
    
    const contractCreate = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(1000000) // Sufficient gas for constructor
      .setConstructorParameters(params);
    
    const contractCreateSubmit = await contractCreate.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;
    
    if (!contractId) {
      throw new Error("Failed to deploy contract - no contract ID returned");
    }
    
    console.log("✅ Contract deployed successfully!\n");
    console.log("📝 Contract Details:");
    console.log(`   Contract ID: ${contractId}`);
    console.log(`   Contract Address: 0x${contractId.toSolidityAddress()}`);
    console.log(`   Operator: ${operatorId}`);
    console.log(`   Threshold List: ${THRESHOLD_LIST_ACCOUNT}\n`);
    
    console.log("🔗 View on HashScan:");
    console.log(`   https://hashscan.io/testnet/contract/${contractId}\n`);
    
    console.log("📋 Next Steps:");
    console.log("1. Add this to your .env.local file:");
    console.log(`   BOOST_PROJECT_CONTRACT_ID=${contractId}`);
    console.log("2. Create boost transactions:");
    console.log(`   npm run boost:interact`);
    console.log("3. Execute with threshold list (all 3 keys required)\n");
    
    // Save deployment info
    const deploymentInfo = {
      contractId: contractId.toString(),
      contractAddress: `0x${contractId.toSolidityAddress()}`,
      operator: operatorId,
      thresholdList: THRESHOLD_LIST_ACCOUNT,
      network: "testnet",
      deployedAt: new Date().toISOString(),
      hashscanUrl: `https://hashscan.io/testnet/contract/${contractId}`
    };
    
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentPath = path.join(deploymentsDir, 'boost-project-testnet.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  } finally {
    client.close();
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

