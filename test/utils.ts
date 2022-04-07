import { BigNumber, utils, Signer, Contract } from "ethers";

const DECIMALS = BigNumber.from(10).pow(18);

export const parseBN = (value: number): BigNumber => {
  return BigNumber.from(value).mul(DECIMALS);
};

// ERC20 helpers
export const batchMint = async (
  contract: Contract,
  accounts: string[],
  amount: number
) => {
  await Promise.all(
    accounts.map(async (account) => {
      contract.mint(account, parseBN(amount));
    })
  );
};

export const balanceOf = async (
  contract: Contract,
  address: string
): Promise<BigNumber> => {
  return contract.balanceOf(address);
};
