//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PhuturePool {
    IERC20 public immutable token;
    uint256 private totalStake;
    uint256 private totalReward;
    address private admin;

    mapping(address => uint256) private rewardsSnapshot;
    mapping(address => uint256) private stakes;

    event Stake(address indexed staker, uint256 indexed amount);

    event Distribute(uint256 indexed reward);

    event UnStake(
        address indexed staker,
        uint256 indexed reward,
        uint256 indexed stakeAmount
    );

    constructor(IERC20 token_) {
        admin = msg.sender;
        token = token_;
    }

    function stake(uint256 _amount) external {
        _transferFrom(msg.sender, address(this), _amount);

        rewardsSnapshot[msg.sender] = totalReward;
        stakes[msg.sender] = _amount;
        totalStake = totalStake + _amount;

        emit Stake(msg.sender, _amount);
    }

    function distribute(uint256 _reward) external {
        require(msg.sender == admin, "PhuturePool: unauthorized");
        uint256 rewardDistributed;
        // Only distribute rewards if total amount staked is not 0
        if (totalStake != 0) {
            totalReward = totalReward + _reward / totalStake;
            rewardDistributed = _reward;
            _transferFrom(msg.sender, address(this), _reward);
        }

        emit Distribute(rewardDistributed);
    }

    function unStake(uint256 _amount) external {
        uint256 deposited = stakes[msg.sender];
        require(
            deposited >= _amount,
            "PhuturePool: insufficient withdraw amount"
        );

        uint256 reward = _amount * totalReward - rewardsSnapshot[msg.sender];

        stakes[msg.sender] = deposited - _amount;
        totalStake = totalStake - deposited;

        uint256 withdrawAmount = _amount + reward;
        token.transfer(msg.sender, withdrawAmount);

        emit UnStake(msg.sender, reward, _amount);
    }

    function getStake(address _account) external view returns (uint256) {
        return stakes[_account];
    }

    function _transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        require(
            token.transferFrom(_from, _to, _amount),
            "PhuturePool: transferFrom failed"
        );
    }
}
