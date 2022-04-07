import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import {
  PhuturePool,
  PhuturePool__factory,
  MockToken,
  MockToken__factory,
} from "../typechain";
import { parseBN, batchMint, balanceOf } from "./utils";

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

  describe("unStake", () => {
    it("should unstake deposit, and get reward", async () => {
      // First staker
      let aliceSigner = alice;
      let aliceStakeAmount = parseBN(189);

      await mockToken
        .connect(aliceSigner)
        .approve(phuturePool.address, aliceStakeAmount);

      await phuturePool.connect(aliceSigner).stake(aliceStakeAmount);

      expect(await phuturePool.totalStake()).to.equal(aliceStakeAmount);

      const aliceTKNBalanceBeforeWithdrawal = await balanceOf(
        mockToken,
        aliceAddress
      );

      // Second staker
      let bobSigner = bob;
      let bobStakeAmount = parseBN(105);

      await mockToken
        .connect(bobSigner)
        .approve(phuturePool.address, bobStakeAmount);

      await phuturePool.connect(bobSigner).stake(bobStakeAmount);
      expect(await phuturePool.totalStake()).to.equal(
        aliceStakeAmount.add(bobStakeAmount)
      );

      const bobTKNBalanceBeforeFirstWithdrawal = await balanceOf(
        mockToken,
        bobAddress
      );

      // admin distributes reward
      const reward = parseBN(890);
      await mockToken.approve(phuturePool.address, reward);

      await expect(phuturePool.distribute(reward))
        .to.emit(phuturePool, "Distribute")
        .withArgs(reward);

      // Alice unstakes all her deposited TKN tokens
      const stake = await phuturePool.getStake(aliceAddress);
      const aliceReward = await phuturePool.getReward(aliceAddress, stake);

      await expect(phuturePool.connect(aliceSigner).unStake(stake))
        .to.emit(phuturePool, "UnStake")
        .withArgs(aliceAddress, aliceReward, stake);

      expect(await phuturePool.totalStake()).to.equal(bobStakeAmount);

      expect(await phuturePool.getStake(aliceAddress)).to.equal(0);
      expect(await balanceOf(mockToken, aliceAddress)).to.equal(
        aliceTKNBalanceBeforeWithdrawal.add(stake).add(aliceReward)
      );

      // Bob unstakes half of his deposit
      const unStakeAmount = (await phuturePool.getStake(bobAddress)).div(2);
      let bobReward = await phuturePool.getReward(bobAddress, unStakeAmount);

      await expect(phuturePool.connect(bobSigner).unStake(unStakeAmount))
        .to.emit(phuturePool, "UnStake")
        .withArgs(bobAddress, bobReward, unStakeAmount);

      expect(await phuturePool.totalStake()).to.equal(unStakeAmount);

      const bobTKNBalanceBeforeSecondWithdrawal = await balanceOf(
        mockToken,
        bobAddress
      );

      expect(await phuturePool.getStake(bobAddress)).to.equal(unStakeAmount);
      expect(await balanceOf(mockToken, bobAddress)).to.equal(
        bobTKNBalanceBeforeFirstWithdrawal.add(unStakeAmount).add(bobReward)
      );

      // Third staker
      let zoeSigner = zoe;
      let zoeStakeAmount = parseBN(200);

      await mockToken
        .connect(zoeSigner)
        .approve(phuturePool.address, zoeStakeAmount);

      await phuturePool.connect(zoeSigner).stake(zoeStakeAmount);
      expect(await phuturePool.totalStake()).to.equal(
        unStakeAmount.add(zoeStakeAmount)
      );

      const zoeTKNBalanceBeforetWithdrawal = await balanceOf(
        mockToken,
        zoeAddress
      );

      // admin distributes new reward
      const secondReward = parseBN(320);
      await mockToken.approve(phuturePool.address, secondReward);

      await expect(phuturePool.distribute(secondReward))
        .to.emit(phuturePool, "Distribute")
        .withArgs(secondReward);

      // Bob unstakes his remaining deposits
      const bobNewUnStakeAmount = await phuturePool.getStake(bobAddress);
      let bobNewReward = await phuturePool.getReward(
        bobAddress,
        bobNewUnStakeAmount
      );

      await expect(phuturePool.connect(bobSigner).unStake(bobNewUnStakeAmount))
        .to.emit(phuturePool, "UnStake")
        .withArgs(bobAddress, bobNewReward, bobNewUnStakeAmount);

      expect(await phuturePool.totalStake()).to.equal(zoeStakeAmount);

      expect(await balanceOf(mockToken, bobAddress)).to.equal(
        bobTKNBalanceBeforeSecondWithdrawal
          .add(bobNewUnStakeAmount)
          .add(bobNewReward)
      );

      // Zoe unstakes all her deposited TKN tokens
      const zoeStake = await phuturePool.getStake(zoeAddress);
      const zoeReward = await phuturePool.getReward(zoeAddress, zoeStake);

      await expect(phuturePool.connect(zoeSigner).unStake(zoeStake))
        .to.emit(phuturePool, "UnStake")
        .withArgs(zoeAddress, zoeReward, zoeStake);

      expect(await phuturePool.totalStake()).to.equal(0);

      expect(await phuturePool.getStake(zoeAddress)).to.equal(0);

      expect(await balanceOf(mockToken, zoeAddress)).to.equal(
        zoeTKNBalanceBeforetWithdrawal.add(zoeStake).add(zoeReward)
      );
    });

    it("should fail if account has zero stakes", async () => {
      await expect(
        phuturePool.connect(bob).unStake(parseBN(23))
      ).to.be.revertedWith("PhuturePool: ZERO stake");
    });
  });
});
