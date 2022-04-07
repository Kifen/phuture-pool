import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import {
  PhuturePool,
  PhuturePool__factory,
  MockToken,
  MockToken__factory,
} from "../typechain";
import { parseBN, batchMint, Account } from "./utils";

describe("PhuturePool", function () {
  let admin: Signer;
  let alice: Signer;
  let bob: Signer;
  let zoe: Signer;

  let adminAddress: string;
  let aliceAddress: string;
  let bobAddress: string;
  let zoeAddress: string;

  let phuturePool: PhuturePool;
  let mockToken: MockToken;

  beforeEach(async () => {
    [admin, alice, bob, zoe] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress();
    zoeAddress = await zoe.getAddress();

    mockToken = await new MockToken__factory(admin).deploy("TKN", "TKN");

    // Deploy EthPool contract
    phuturePool = await new PhuturePool__factory(admin).deploy(
      mockToken.address
    );

    await batchMint(
      mockToken,
      [adminAddress, aliceAddress, bobAddress, zoeAddress],
      10000
    );
  });

  describe("stake", () => {
    it("should stake tokens", async () => {
      const signer = bob;
      const amountBN = parseBN(250);
      await mockToken.connect(signer).approve(phuturePool.address, amountBN);

      await expect(phuturePool.connect(signer).stake(amountBN))
        .to.emit(phuturePool, "Stake")
        .withArgs(bobAddress, amountBN);

      const signerStake = await phuturePool.getStake(bobAddress);
      expect(signerStake).to.equal(amountBN);
    });

    it("should fail if caller does not set allowance", async () => {
      const signer = bob;
      const amountBN = parseBN(250);

      await expect(
        phuturePool.connect(signer).stake(amountBN)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });
});
