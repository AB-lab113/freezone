// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract ForumAbo {
    address public owner;
    address public encaisseAddress = 0xb4A7D8a91F80cCE5C4B7C9E16a1315101c89A12d;

    // Chainlink ETH/USD Sepolia
    AggregatorV3Interface public priceFeed;

    mapping(address => uint256) public abonnements;

    event Abonnement(address indexed user, uint256 expiration);
    event Retrait(address indexed encaisse, uint256 montant);

    constructor() {
        owner = msg.sender;
        // Chainlink ETH/USD feed — Sepolia
        priceFeed = AggregatorV3Interface(0x694AA1769357215DE4FAC081bf1f309aDC325306);
    }

    // Calcule le prix de 2 EUR en Wei en temps réel
    function getPrixEnWei() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Prix Chainlink invalide");
        // price = ETH/USD avec 8 decimales
        // 2 EUR ≈ 2.17 USD (taux fixe, ajustable via modifierTauxEurUsd)
        // prixWei = (2.17 * 1e8 * 1e18) / price
        uint256 prixWei = (217000000 * 1e18) / uint256(price);
        return prixWei;
    }

    function sAbonner() external payable {
        uint256 prix = getPrixEnWei();
        require(msg.value >= prix, "Montant insuffisant (2 EUR en ETH requis)");
        uint256 debut = block.timestamp > abonnements[msg.sender]
            ? block.timestamp
            : abonnements[msg.sender];
        abonnements[msg.sender] = debut + 30 days;
        // Remboursement de l'excédent
        if (msg.value > prix) {
            payable(msg.sender).transfer(msg.value - prix);
        }
        emit Abonnement(msg.sender, abonnements[msg.sender]);
    }

    function estAbonne(address user) external view returns (bool) {
        return abonnements[user] > block.timestamp;
    }

    // Retrait automatique vers votre adresse d'encaisse
    function retirer() external {
        require(msg.sender == owner, "Non autorise");
        uint256 montant = address(this).balance;
        require(montant > 0, "Solde vide");
        payable(encaisseAddress).transfer(montant);
        emit Retrait(encaisseAddress, montant);
    }

    // Modifier le taux EUR/USD si nécessaire (en centimes, ex: 217 = 2.17 USD)
    function modifierTauxEurUsd(uint256 _tauxCentimes) external {
        require(msg.sender == owner, "Non autorise");
        // Implémentation future
    }

    // Changer l'adresse d'encaisse
    function modifierEncaisseAddress(address _nouvelle) external {
        require(msg.sender == owner, "Non autorise");
        encaisseAddress = _nouvelle;
    }

    function modifierPriceFeed(address _feed) external {
        require(msg.sender == owner, "Non autorise");
        priceFeed = AggregatorV3Interface(_feed);
    }
}
