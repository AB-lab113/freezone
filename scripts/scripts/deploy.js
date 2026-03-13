const hre = require("hardhat");

async function main() {
  console.log("Déploiement de ForumAbo sur Mainnet...");

  const ForumAbo = await hre.ethers.getContractFactory("ForumAbo");
  const forumAbo = await ForumAbo.deploy();

  await forumAbo.waitForDeployment();

  const address = await forumAbo.getAddress();
  console.log("✅ ForumAbo déployé à l'adresse :", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
