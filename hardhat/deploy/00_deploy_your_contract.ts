import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";
import fs from "fs";
import path from "path";

const deployAllContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Load constructor arguments from JSON file
  const constructorFilePath = path.join(__dirname, "..", "constructor.json");
  const constructorArgs = JSON.parse(fs.readFileSync(constructorFilePath, "utf-8"));

  // Get all contract files in the contracts directory
  const contractsDir = path.join(__dirname, "..", "contracts");
  const contractFiles = fs.readdirSync(contractsDir);

  for (const contractFile of contractFiles) {
    const contractName = path.basename(contractFile, path.extname(contractFile));

    // Retrieve constructor arguments for the contract, if any
    const args = constructorArgs[contractName] || [];

    await deploy(contractName, {
      from: deployer,
      args: args,
      log: true,
      autoMine: true,
    });

    const contract = await hre.ethers.getContract<Contract>(contractName, deployer);
    console.log(`👋 Contract ${contractName} deployed, address: ${await contract.getAddress()}`);
  }
};

deployAllContracts.tags = ["all"];

export default deployAllContracts;
