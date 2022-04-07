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

    error ZeroStake();

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

        // Only distribute rewards if total amount staked is not 0
        if (totalStake != 0) {
            totalReward = totalReward + ((_reward * 1e18) / totalStake);
            _transferFrom(msg.sender, address(this), _reward);
            emit Distribute(_reward);
        } else {
            revert ZeroStake();
        }
    }

    function unStake(uint256 _amount) external {
        uint256 deposited = stakes[msg.sender];
        require(
            deposited >= _amount,
            "PhuturePool: insufficient withdraw amount"
        );

        uint256 reward = _getReward(msg.sender, _amount);

        stakes[msg.sender] = deposited - _amount;
        totalStake = totalStake - _amount;

        uint256 withdrawAmount = _amount + reward;
        token.transfer(msg.sender, withdrawAmount);

        emit UnStake(msg.sender, reward, _amount);
    }

    function getStake(address _account) external view returns (uint256) {
        return stakes[_account];
    }

    function getReward(address _account, uint256 _amount)
        external
        view
        returns (uint256 reward)
    {
        if (stakes[_account] > 0) {
            reward = _getReward(_account, _amount);
        }
    }

    function _getReward(address _account, uint256 _amount)
        internal
        view
        returns (uint256)
    {
        return (_amount * (totalReward - rewardsSnapshot[_account])/1e18);
    }

    function _transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        token.transferFrom(_from, _to, _amount);
    }
}
