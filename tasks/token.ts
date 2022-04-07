import { task } from "hardhat/config";
import { saveContractAddress } from "./utils";

task("deploy-token")
  .addParam("name", "token name")
  .addParam("symbol", "token symbol")
  .setAction(async (taskArgs: any, hre: any) => {
    const contractName = "MockToken";
    const networkName = hre.network.name;

    // We get the contract to deploy
    const MockToken = await hre.ethers.getContractFactory(contractName);
    const mockToken = await MockToken.deploy(taskArgs.name, taskArgs.symbol);

    await mockToken.deployed();

    console.log(`MockToken deployed to:, ${mockToken.address}`);

    saveContractAddress(networkName, "MockToken", mockToken.address);
  });
