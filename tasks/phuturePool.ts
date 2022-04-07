import { task } from "hardhat/config";
import { saveContractAddress } from "./utils";

task("deploy-phuture-pool")
  .addParam("token", "token address")
  .setAction(async (taskArgs: any, hre: any) => {
    const contractName = "PhuturePool";
    const networkName = hre.network.name;

    // We get the contract to deploy
    const PhuturePool = await hre.ethers.getContractFactory(contractName);
    const phuturePool = await PhuturePool.deploy(taskArgs.token);

    await phuturePool.deployed();

    console.log(`phuturePool deployed to:, ${phuturePool.address}`);

    saveContractAddress(networkName, contractName, phuturePool.address);
  });
