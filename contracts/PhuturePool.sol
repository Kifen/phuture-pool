//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PhuturePool {
    IERC20 public immutable token;
    uint256 private totalStake;
    uint256 private totalReward;
    address private admin;

    mapping(address => uint256) public rewardsSnapshot;
    mapping(address => uint256) public stakes;

    event Deposit(address indexed staker, uint256 indexed amount);

    event Distribute(uint256 indexed reward);

    event Withdraw(
        address indexed staker,
        uint256 indexed reward,
        uint256 indexed stakeAmount
    );

    constructor(IERC20 token_) {
        admin = msg.sender;
        token = token_;
    }

    function deposit(uint256 _amount) external {
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "PhuturePool: transferFrom failed"
        );

        rewardsSnapshot[msg.sender] = totalReward;
        stakes[msg.sender] = _amount;
        totalStake = totalStake + _amount;

        emit Deposit(msg.sender, _amount);
    }

    function distribute(uint256 _reward) external {
        require(msg.sender == admin, "PhuturePool: unauthorized");
        uint256 rewardDistributed;
        // Only distribute rewards if total amount staked is not 0
        if (totalStake != 0) {
            totalReward = totalReward + _reward / totalStake;
            rewardDistributed = _reward;
        }

        emit Distribute(rewardDistributed);
    }

    function withdraw(uint256 _amount) external {
        require(
            stakes[msg.sender] >= _amount,
            "PhuturePool: insufficient withdraw amount"
        );
        //(uint256 stake, uint256 reward) = _calculateReward(msg.sender);
        uint256 stake = stakes[msg.sender];
        uint256 reward = _amount * totalReward - rewardsSnapshot[msg.sender];

        stakes[msg.sender] = stake - _amount;
        uint256 withdrawAmount = _amount + reward;
        token.transfer(msg.sender, withdrawAmount);
        
        emit Withdraw(msg.sender, reward, _amount);
    }

    function _calculateReward(address _staker)
        internal
        view
        returns (uint256 stake, uint256 reward)
    {
        stake = stakes[_staker];
        reward = stake * totalReward - rewardsSnapshot[_staker];
    }
}
