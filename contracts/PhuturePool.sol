//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PhuturePool {
    IERC20 public immutable token;
    uint256 public totalStake;
    uint256 public totalReward;

    address private admin;

    // mapping of address to reward snapshot
    mapping(address => uint256) private rewardsSnapshot;

    // mapping of address to its stake
    mapping(address => uint256) private stakes;

    // Emitted when an account stakes
    event Stake(address indexed staker, uint256 indexed amount);

    // Emitted when reward is ditributed
    event Distribute(uint256 indexed reward);

    // Emitted when an account unstakes
    event UnStake(
        address indexed staker,
        uint256 indexed reward,
        uint256 indexed stakeAmount
    );

    error ZeroStake();

    constructor(IERC20 token_) {
        admin = msg.sender;
        token = token_;
    }

    /**
     * @dev caller depsosits tokens to earn rewards.
     * @param _amount amount to stake
     */
    function stake(uint256 _amount) external {
        _transferFrom(msg.sender, address(this), _amount);

        rewardsSnapshot[msg.sender] = totalReward;
        stakes[msg.sender] = _amount;
        totalStake = totalStake + _amount;

        emit Stake(msg.sender, _amount);
    }

    /**
     * @dev admin function to share rewards proportionally to all stakers
     * @param _reward amount to didtribute
     */
    function distribute(uint256 _reward) external {
        require(msg.sender == admin, "PhuturePool: unauthorized");

        // Only distribute rewards if total amount staked is greater than 0
        if (totalStake != 0) {
            // due to solidity not handling fractions, multiply the reward by 1e18 to get the  full value for operation `_reward/totalStake`
            totalReward = totalReward + ((_reward * 1e18) / totalStake);

            _transferFrom(msg.sender, address(this), _reward);
            emit Distribute(_reward);
        } else {
            revert ZeroStake();
        }
    }

    /**
     * @dev caller unstakes tokens and gets in return deposited amount + reward.
     * @param _amount amount to unstake
     */
    function unStake(uint256 _amount) external {
        uint256 deposited = stakes[msg.sender];
        require(deposited >= _amount, "PhuturePool: ZERO stake");

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
        return (_amount * (totalReward - rewardsSnapshot[_account])) / 1e18;
    }

    function _transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        token.transferFrom(_from, _to, _amount);
    }
}
