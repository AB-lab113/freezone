const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractAt(
    "ForumAbo",
    "0x7e776a0d9c9b812ea3d25109808800e07d189149"
  );
  const tx = await contract.retirer();
  await tx.wait();
  console.log("Retrait effectué !");
}

main().catch(console.error);
