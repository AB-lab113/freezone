const hre = require("hardhat");

async function main() {
  console.log("🚀 Déploiement ForumAbo avec Chainlink...");
  const ForumAbo = await hre.ethers.getContractFactory("ForumAbo");
  const forumAbo = await ForumAbo.deploy();
  await forumAbo.waitForDeployment();
  const address = await forumAbo.getAddress();
  console.log("✅ ForumAbo déployé à :", address);
  console.log("💰 Encaisse → 0xb4A7D8a91F80cCE5C4B7C9E16a1315101c89A12d");
  console.log("🔗 Chainlink ETH/USD Sepolia activé");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
