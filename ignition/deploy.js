const hre = require("hardhat");

async function main() {
  const ForumAbo = await hre.ethers.getContractFactory("ForumAbo");
  const forumAbo = await ForumAbo.deploy();
  await forumAbo.waitForDeployment();
  console.log("ForumAbo déployé à :", await forumAbo.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
