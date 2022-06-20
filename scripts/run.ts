import { use } from "chai";
import { Signer } from "ethers";
import { ethers, network } from "hardhat";



const mintNFT = async (
  rishToken: any,
  deployer: any,
  user: any,
  tokenURI: any
) => {
  var txn = await rishToken
                      .connect(deployer)
                      .mint(user.getAddress(), tokenURI);
  var rc = await txn.wait();
  const event_mint = rc.events.find(
        (event: any) => event.event === "Transfer"
      );
  const [from, to, tokenId] = event_mint.args;
  console.log(`NEW NFT minted with owner: ${user.address} and token id:`, tokenId.toString());
  return tokenId;
}

const mintUSDC = async (
  usdcToken: any,
  owner: any,
  to: any,
  amount: any
) => {
  var txn = await usdcToken
                  .connect(owner)
                  .mint(to, ethers.utils.parseEther(amount));
  var rc = await txn.wait();
  const event_mint_usdc = rc.events.find(
        (event: any) => event.event === "Transfer"
      );
  const [from, _to, _amount] = event_mint_usdc.args;
  console.log(`${ethers.utils.formatEther(_amount).toString()} USDC minted to owner: ${to}`);
}


const approveNftToken = async (
  rishToken: any,
  user: any,
  to: any,
  tokenId: any
) => {
  var t = await rishToken
                .connect(user)
                .approve(to, tokenId);
  var rc = await t.wait();
}


const lendUSDC = async (
  lendingContract: any,
  rishToken: any,
  user: any,
  tokenId: any,
  amount: any,
  timeToReturn: any
) => {

  var txn = await lendingContract
                  .connect(user)
                  .lendUSDC(tokenId, amount, timeToReturn)
  var rc = await txn.wait();
  const event_lend = rc.events.find(
        (event: any) => event.event === "LendingDone"
      );
  const [_user, _amount, _timeToReturn, transactionID] = event_lend.args;
  console.log(`Transaction DONE with ID: ${transactionID}`);
  console.log(` User ${_user} has taken ${_amount} USDC by giving NFT with ID: ${tokenId}`);
  return transactionID;
}


const getTimeSpent = async (
  lendingContract: any,
  user: any,
  transactionId: any
) => {
  var timeSpent = await lendingContract
                        .connect(user)
                        .getTimeSpent(transactionId);
  console.log(`Time Spent: ${timeSpent.toString()}`);
  return timeSpent;
}


const getPricipalAmount = async (
  lendingContract: any,
  user: any,
  transactionId: any
) => {
  var pricipalAmount = await lendingContract
                        .connect(user)
                        .getPricipalAmount(transactionId);
  console.log(`pricipal Amount: ${pricipalAmount.toString()}`);
  return pricipalAmount;
}


const getInterest = async (
  lendingContract: any,
  user: any,
  transactionId: any
) => {
  var interestAmount = await lendingContract
                             .connect(user)
                             .getInterest(transactionId);
  console.log(`Interest Amount: ${interestAmount}`);
  return interestAmount;
}


const getTotalAmountToPay = async (
  lendingContract: any,
  user: any,
  transactionId: any
) => {
  var TotalAmountToPay = await lendingContract
                             .connect(user)
                             .getTotalAmountToPay(transactionId);
  console.log(`Total Amount To Pay: ${TotalAmountToPay}`);
  return TotalAmountToPay;
}


const payInterest = async (
  lendingContract: any,
  usdcToken: any,
  user: any,
  transactionId: any
) => {

  var amountToPay = await getTotalAmountToPay(lendingContract, user, transactionId);
  var txn_approve = await usdcToken
                          .connect(user)
                          .approve(lendingContract.address, amountToPay);
  var rc = await txn_approve.wait();
  const event_approve = rc.events.find(
        (event: any) => event.event === "Approval"
      );
  const [_owner, _spender, _amount_approved] = event_approve.args;
  console.log(`USDC Approved owner: ${_owner} spender: ${_spender} amount: ${_amount_approved}`)


  var txn_pay = await lendingContract
                      .connect(user)
                      .payInterest(transactionId ,amountToPay);
  var rc = await txn_pay.wait();
  const event_lend = rc.events.find(
        (event: any) => event.event === "LoanPaidBack"
      );
  const [_user, _amount] = event_lend.args;
  console.log(`Load paid back by user: ${_user} amount: ${_amount}`)

  var rc = await txn_pay.wait();
  const event_remain_usdc = rc.events.find(
        (event: any) => event.event === "RemainingUSDCTransferred"
      );
  const [_user_remain_usdc, _amount_remain_usdc] = event_remain_usdc.args;
  console.log(`USDC paid back user: ${_user_remain_usdc} amount: ${_amount_remain_usdc}`)
}


const SellNftIfDefaulted = async (
  lendingContract: any,
  usdcToken: any,
  user: any,
  transactionId: any
) => {
  var amountToPay = await getTotalAmountToPay(lendingContract, user, transactionId);
  var txn_approve = await usdcToken
                          .connect(user)
                          .approve(lendingContract.address, amountToPay);
  var rc = await txn_approve.wait();
  const event_approve = rc.events.find(
        (event: any) => event.event === "Approval"
      );
  const [_owner, _spender, _amount_approved] = event_approve.args;
  console.log(`USDC Approved owner: ${_owner} spender: ${_spender} amount: ${_amount_approved}`)


  var txn = await lendingContract
                  .connect(user)
                  .SellNftIfDefaulted(transactionId, amountToPay);
  var rc = await txn.wait();
  const event = rc.events.find(
        (event: any) => event.event === "DefaultedNftSold"
      );
  const [_owner_nft, _amount] = event.args;
  console.log(`Defaulted NFT sold for: ${_amount} to: ${_owner_nft}`);
}


const getAddress = async (
    user: any
) => {
    return user.getAddress();
}

const main = async () => {
  let accounts: Signer[];

  
  accounts = await ethers.getSigners();
  // const deployer = accounts[0];
  // const user1 = accounts[1];
  // const user2 = accounts[2];
  // const user3 = accounts[3];

  const usdcFactory = await ethers.getContractFactory("USDC");
  const usdcToken = await usdcFactory.deploy();
  await usdcToken.deployed();
  console.log("usdcToken :", usdcToken.address);
  console.log("[LOG] usdcToken contract deployed");

  const rishFactory = await ethers.getContractFactory("RISHOTICS");
  const rishToken = await rishFactory.deploy();
  await rishToken.deployed();
  console.log("rishToken :", rishToken.address);
  console.log("[LOG] rishToken contract deployed");

  // var tokenId1 = await mintNFT(rishToken, deployer, user1, "example");
  // var tokenId2 = await mintNFT(rishToken, deployer, user2, "example");

  const lendingFactory = await ethers.getContractFactory("Lending_platform");
  const lendingContract = await lendingFactory.deploy(rishToken.address, usdcToken.address, 2, 2);
  await lendingContract.deployed();
  console.log("lendingContract :", lendingContract.address);
  console.log("[LOG] lendingContract deployed");

  // await mintUSDC(usdcToken, deployer, lendingContract.address, "1000000");
  // await mintUSDC(usdcToken, deployer, user1.getAddress(), "1000");
  // await mintUSDC(usdcToken, deployer, user2.getAddress(), "1000");
  // await mintUSDC(usdcToken, deployer, user3.getAddress(), "1000");
  
  // await approveNftToken(rishToken, user1, lendingContract.address, tokenId1);
  // var transactionID1 = await lendUSDC(lendingContract, rishToken, user1, tokenId1, ethers.utils.parseEther("5"), "24");
  // await approveNftToken(rishToken, user2, lendingContract.address, tokenId2);
  // var transactionID2 = await lendUSDC(lendingContract, rishToken, user2, tokenId2, ethers.utils.parseEther("7"), "48");

  // console.log(`Moving time...`);
  // await network.provider.send("evm_increaseTime", [18000]);
  // await network.provider.send("evm_mine");
  // console.log(`Time moved by 18000`)

  // var timeSpent1 = await getTimeSpent(lendingContract, user1, transactionID1);
  // var pricipalAmount1 = await getPricipalAmount(lendingContract, user1, transactionID1);

  // var interestAmount1 = await getInterest(lendingContract, user1, transactionID1);

  // await payInterest(lendingContract, usdcToken, user1, transactionID1);

  // var isActive1 = await lendingContract.getTransactionStatus(transactionID1);
  // console.log(`Status of 1: ${isActive1}`)
  // var isActive2 = await lendingContract.getTransactionStatus(transactionID2);
  // console.log(`Status of 2: ${isActive2}`)

  // console.log(`Moving time...`);
  // await network.provider.send("evm_increaseTime", [172800]);
  // await network.provider.send("evm_mine");
  // console.log(`Time moved by 172800`)

  // await SellNftIfDefaulted(lendingContract, usdcToken, user3, transactionID2);
};

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (err) {
    console.log(`err`, err);
    process.exit(1);
  }
};

runMain();
