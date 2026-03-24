
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ForumAbo {
    address public owner;
    address public encaisseAddress = 0xb4A7D8a91F80cCE5C4B7C9E16a1315101c89A12d;

    AggregatorV3Interface public priceFeed;

    mapping(address => uint256) public abonnements;
    uint256 public totalAbonnes = 0;
    uint256 public constant GRATUITS = 300;

    event Abonnement(address indexed user, uint256 expiration);

    constructor() {
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
    }

    function getPrixEnWei() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Prix Chainlink invalide");
        uint256 prixWei = (217000000 * 1e18) / uint256(price);
        return prixWei;
    }

    function sAbonner() external payable {
        uint256 prix = 0;

        if (totalAbonnes >= GRATUITS) {
            prix = getPrixEnWei();
            require(msg.value >= prix, "Montant insuffisant (2 EUR en ETH requis)");
        }

        uint256 debut = block.timestamp > abonnements[msg.sender]
            ? block.timestamp
            : abonnements[msg.sender];
        abonnements[msg.sender] = debut + 30 days;
        totalAbonnes++;

        // Remboursement du surplus
        if (msg.value > prix) {
            payable(msg.sender).transfer(msg.value - prix);
        }

        // ETH envoyé DIRECTEMENT au wallet — contrat garde 0 ETH
        if (prix > 0) {
            payable(encaisseAddress).transfer(prix);
        }

        emit Abonnement(msg.sender, abonnements[msg.sender]);
    }

    function estAbonne(address user) external view returns (bool) {
        return abonnements[user] > block.timestamp;
    }

    function modifierEncaisseAddress(address _nouvelle) external {
        require(msg.sender == owner, "Non autorise");
        encaisseAddress = _nouvelle;
    }

    function modifierPriceFeed(address _feed) external {
        require(msg.sender == owner, "Non autorise");
        priceFeed = AggregatorV3Interface(_feed);
    }
}
