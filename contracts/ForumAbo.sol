// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ForumAbo {
    address public owner;
    uint256 public prixMensuel = 0.01 ether;

    mapping(address => uint256) public abonnements;

    event Abonnement(address indexed user, uint256 expiration);
    event Retrait(address indexed owner, uint256 montant);

    constructor() {
        owner = msg.sender;
    }

    function sAbonner() external payable {
        require(msg.value >= prixMensuel, "Montant insuffisant");
        uint256 debut = block.timestamp > abonnements[msg.sender]
            ? block.timestamp
            : abonnements[msg.sender];
        abonnements[msg.sender] = debut + 30 days;
        emit Abonnement(msg.sender, abonnements[msg.sender]);
    }

    function estAbonne(address user) external view returns (bool) {
        return abonnements[user] > block.timestamp;
    }

    function retirer() external {
        require(msg.sender == owner, "Non autorise");
        uint256 montant = address(this).balance;
        payable(owner).transfer(montant);
        emit Retrait(owner, montant);
    }

    function modifierPrix(uint256 _nouveauPrix) external {
        require(msg.sender == owner, "Non autorise");
        prixMensuel = _nouveauPrix;
    }
}
