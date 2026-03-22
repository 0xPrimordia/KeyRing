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

const NETWORK = (process.env.DEPLOY_NETWORK || 'mainnet') as 'mainnet' | 'testnet';

async function main() {
  console.log(`Deploying BoostProject Contract to Hedera ${NETWORK}\n`);

  const client = NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

  const operatorId = NETWORK === 'mainnet'
    ? process.env.HEDERA_MAINNET_ACCOUNT_ID
    : process.env.HEDERA_TESTNET_ACCOUNT_ID;
  const operatorKey = NETWORK === 'mainnet'
    ? process.env.HEDERA_MAINNET_PRIVATE_KEY
    : process.env.HEDERA_TESTNET_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error(
      `Set HEDERA_${NETWORK.toUpperCase()}_ACCOUNT_ID and HEDERA_${NETWORK.toUpperCase()}_PRIVATE_KEY in .env.local`
    );
  }

  client.setOperator(operatorId, operatorKey);

  console.log(`  Operator: ${operatorId}`);
  console.log(`  Network:  ${NETWORK}\n`);

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'BoostProject.sol', 'BoostProject.json');

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Compile first:\n  npx hardhat compile"
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode;

  if (!bytecode || bytecode === '0x') {
    throw new Error("Invalid bytecode in artifact");
  }

  console.log(`Contract bytecode loaded (${bytecode.length / 2} bytes)\n`);

  const operatorAddress = AccountId.fromString(operatorId).toSolidityAddress();

  console.log("Deploying contract...\n");

  try {
    const params = new ContractFunctionParameters()
      .addAddress(operatorAddress)
      .addAddressArray([operatorAddress])
      .addUint256(1);

    const contractCreate = new ContractCreateFlow()
      .setBytecode(bytecode)
      .setGas(4000000)
      .setConstructorParameters(params);

    const contractCreateSubmit = await contractCreate.execute(client);
    const contractCreateRx = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateRx.contractId;

    if (!contractId) {
      throw new Error("Failed to deploy contract - no contract ID returned");
    }

    console.log("Contract deployed successfully!\n");
    console.log(`  Contract ID:      ${contractId}`);
    console.log(`  Contract Address: 0x${contractId.toSolidityAddress()}`);
    console.log(`  Operator:         ${operatorId}\n`);
    console.log(`  https://hashscan.io/${NETWORK}/contract/${contractId}\n`);
    console.log("Add to .env.local:");
    console.log(`  BOOST_PROJECT_CONTRACT_ID=${contractId}\n`);

    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const deploymentInfo = {
      contractId: contractId.toString(),
      contractAddress: `0x${contractId.toSolidityAddress()}`,
      operator: operatorId,
      network: NETWORK,
      deployedAt: new Date().toISOString(),
      hashscanUrl: `https://hashscan.io/${NETWORK}/contract/${contractId}`
    };

    const deploymentPath = path.join(deploymentsDir, `boost-project-${NETWORK}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log(`Deployment info saved to: ${deploymentPath}\n`);

  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  } finally {
    client.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
