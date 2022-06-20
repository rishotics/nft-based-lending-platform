import { expect, use } from "chai";
import { Signer, Contract } from "ethers";
import { ethers, network } from "hardhat";
import {deployContract, MockProvider, solidity} from 'ethereum-waffle';

describe("Lending_platform", function () {
    it("Check if NFT is minted to right user and only deployer can mint it", async function () {


        let accounts: Signer[];

        accounts = await ethers.getSigners();
        const deployer = accounts[0];
        const user1 = accounts[1];
        const user2 = accounts[2];

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

        var tokenId1 = await mintNFT(rishToken, deployer, user1, "example");
        expect(await rishToken.ownerOf(tokenId1)).to.equal(await getAddress(user1));
        await expect(mintNFT(rishToken, user1, user1, "example")).to.be.revertedWith('Ownable: caller is not the owner')
    });
  });



  describe("Lending_platform", function () {
    let deployer: any;
    let user1: any;
    let user2: any;
    let user3: any;
    let user4: any;
    let user5: any;
    let usdcToken: Contract;
    let rishToken: Contract;
    let lendingContract: Contract;
    let tokenId1: any;
    let tokenId2: any;
    let tokenId4: any;
    let tokenId5_1: any;
    let tokenId5_2: any;
    let tokenId5_3: any;
    let transactionID1: any;
    let transactionID2: any;
    let transactionID4: any;
    let transactionID5_1: any;
    let transactionID5_2: any;
    let transactionID5_3: any;
    before(async () => {
      let accounts: Signer[];
      let MAX_NUMBER_OF_LENDINGS = 2;
      let INTEREST_RATE = 2;

      accounts = await ethers.getSigners();
      deployer = accounts[0];
      user1 = accounts[1];
      user2 = accounts[2];
      user3 = accounts[3];
      user4 = accounts[4];
      user5 = accounts[5];
      const usdcFactory = await ethers.getContractFactory("USDC");
      usdcToken = await usdcFactory.deploy();
      await usdcToken.deployed();
      console.log("usdcToken :", usdcToken.address);

      const rishFactory = await ethers.getContractFactory("RISHOTICS");
      rishToken = await rishFactory.deploy();
      await rishToken.deployed();
      console.log("rishToken :", rishToken.address);

      const lendingFactory = await ethers.getContractFactory("Lending_platform");
      lendingContract = await lendingFactory.deploy(rishToken.address, usdcToken.address, INTEREST_RATE, MAX_NUMBER_OF_LENDINGS);
      await lendingContract.deployed();
      console.log("lendingContract :", lendingContract.address);

      tokenId4 = await mintNFT(rishToken, deployer, user4, "example4");
      tokenId5_1 = await mintNFT(rishToken, deployer, user5, "example5_1");
      tokenId5_2 = await mintNFT(rishToken, deployer, user5, "example5_2");
      tokenId5_3 = await mintNFT(rishToken, deployer, user5, "example5_3");
      await mintUSDC(usdcToken, deployer, user3.getAddress(), "1000");
      await mintUSDC(usdcToken, deployer, user4.getAddress(), "1000");
      await mintUSDC(usdcToken, deployer, user5.getAddress(), "1000");
    })


    it("Checks if minting is done properly", async function () {
        
        tokenId1 = await mintNFT(rishToken, deployer, user1, "example");
        tokenId2 = await mintNFT(rishToken, deployer, user2, "example2");
        
        expect(await rishToken.ownerOf(tokenId1)).to.equal(await getAddress(user1));
        expect(await rishToken.ownerOf(tokenId2)).to.equal(await getAddress(user2));
    });


    
    it("Checks that only deployer can mint NFTs", async () => {
        await expect(rishToken.connect(user1).mint(user1.getAddress(),"example"))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });



    it("Checks USDC are minted properly", async () => {
        const amountToMintToUser = "1000"
        const amountToMintToLendingContract = "1000000"
        await mintUSDC(usdcToken, deployer, lendingContract.address, amountToMintToLendingContract);
        await mintUSDC(usdcToken, deployer, user1.getAddress(), amountToMintToUser);
        await mintUSDC(usdcToken, deployer, user2.getAddress(), amountToMintToUser);
        
        expect(await usdcToken.balanceOf(user1.getAddress())).to.equal(ethers.utils.parseEther(amountToMintToUser));
        expect(await usdcToken.balanceOf(user2.getAddress())).to.equal(ethers.utils.parseEther(amountToMintToUser));
        expect(await usdcToken.balanceOf(lendingContract.address)).to.equal(ethers.utils.parseEther(amountToMintToLendingContract));
    });




    it("Check that even if owner gives approval to NFT transfer, no other hacker can take the USDC on his behalf", async () => {
      await approveNftToken(rishToken, user1, lendingContract.address, tokenId1);
      await expect(lendUSDC(lendingContract, rishToken, user2, tokenId1, ethers.utils.parseEther("5"), "24"))
              .to.be.revertedWith("Calling address should be owner of NFT");
    });



    it("Check if transaction is successful when NFT approval given and owner of NFT calls the lending function", async () => {
        // Setting up a new lending transaction by user1 Lend AMount: 5 USDC  Time: 24 hrs
        const borrowAmount = "5"
        const borrowPeriodInHours = "24"

        await approveNftToken(rishToken, user1, lendingContract.address, tokenId1);
        transactionID1 = await lendUSDC(lendingContract, rishToken, user1, tokenId1, ethers.utils.parseEther(borrowAmount), borrowPeriodInHours);
        expect(transactionID1).to.equal(1);
        // Now the owner of NFT should be Lending Contract
        expect(await rishToken.ownerOf(tokenId1)).to.equal(lendingContract.address)

        // AMount of USDC with user1 should be original + 5 ether
        expect(await usdcToken.balanceOf(user1.getAddress())).to.equal(ethers.utils.parseEther("1005"));
        
        // AMount of USDC with lending contract should be original - 5 ether 
        expect(await usdcToken.balanceOf(lendingContract.address)).to.equal(ethers.utils.parseEther("999995"));
    });



    it("Can not lend USDC when approval for NFT transfer is not given", async () => {
      // Using user2 now
      await expect(lendUSDC(lendingContract, rishToken, user2, tokenId2, ethers.utils.parseEther("6"), "24"))
              .to.be.revertedWith("Approval for NFT Token not given");
    });



    it("Can not lend when USDC amount asked is greater than 70% of NFT value", async () => {
      // price of NFT is 10 USDC
      const borrowAmount = "8"
      const borrowPeriodInHours = "24"
      await approveNftToken(rishToken, user2, lendingContract.address, tokenId2);
      await expect(lendUSDC(lendingContract, rishToken, user2, tokenId2, ethers.utils.parseEther(borrowAmount), borrowPeriodInHours))
              .to.be.revertedWith("Amount asked is greater than 70% value of collateral NFT");
    });



    it("Can not lend when USDC amount when duration is grater than 30 days", async () => {
      // price of NFT is 10 USDC
      const borrowAmount = "8"
      const borrowPeriodInHours = "730" //720 is 30 days
      await approveNftToken(rishToken, user2, lendingContract.address, tokenId2);
      await expect(lendUSDC(lendingContract, rishToken, user2, tokenId2, ethers.utils.parseEther(borrowAmount), borrowPeriodInHours))
              .to.be.revertedWith("Duration for taking loan should be less than 30 days");
    });


    it("Check the interest Amount to return after 5 hours, remember interest is charged hourly", async () => {
      console.log(`Moving time...`);
      await network.provider.send("evm_increaseTime", [18000]);
      await network.provider.send("evm_mine");
      console.log(`Time moved by 18000`)
      expect(await lendingContract
                    .connect(user1)
                    .getInterest(transactionID1)).to.equal(ethers.utils.parseEther("0.5"));
                    // Interest on 5 ether is 0.5 USDC at 2% hourly rate after 5 hours
    })

    it("Check the total amount to return after 5 hours, remember interest is charged hourly", async () => {
      expect(await getTotalAmountToPay(lendingContract, user1, transactionID1)).to.equal(ethers.utils.parseEther("5.5"));
        //Total amount has become 5.5 USDC where pricipal is 5 USDC
    })



    it("Check that non-authorised(those who have not taken loan) users cannot pay interest and take NFT ", async() =>{
      var amountToPay = await getTotalAmountToPay(lendingContract, user1, transactionID1);
      await expect(lendingContract.connect(user3).payInterest(transactionID1, amountToPay))
              .to.be.revertedWith("Only the owner of NFT can claim pay back before time is over");
    })



    it("Check that authorised users cannot send amount less than their principal + interest (till that point in time)", async() =>{
      await usdcToken
            .connect(user1)
            .approve(lendingContract.address, ethers.utils.parseEther("1"));
      await expect(lendingContract.connect(user1).payInterest(transactionID1, ethers.utils.parseEther("1")))
              .to.be.revertedWith("USDC amount is less than pricipal + interest");
    })



    it("Check that authorised users cannot pay interest and take NFT when USDC amount is not\
        approved before transaction", async() =>{
      var amountToPay = await lendingContract
                              .connect(user1)
                              .getTotalAmountToPay(transactionID1);
      await expect(lendingContract.connect(user1).payInterest(transactionID1, amountToPay))
              .to.be.revertedWith("USDC allowance not set");
    })



    it("Show that random authorised users cannot pay someone else's lend amount and claim their NFT before deadline is passed", async() =>{
      //Setting up a new authorised user(Hacker)
      await approveNftToken(rishToken, user4, lendingContract.address, tokenId4);
      transactionID4 = await lendUSDC(lendingContract, rishToken, user4, tokenId4, ethers.utils.parseEther("3"), "24");
      
      var amountToPay = await lendingContract
                              .connect(user1)
                              .getTotalAmountToPay(transactionID1);
      //Hacker user has given the approval for his USDC
      await usdcToken
            .connect(user4)
            .approve(lendingContract.address, amountToPay);
      //hacker tries to pay on his behalf. over here hacker has also lended an amount. 
      await expect(lendingContract.connect(user4).payInterest(transactionID1, amountToPay))
            .to.be.revertedWith("Only the owner of NFT can claim pay back before time is over");
      
    })

    

    it("CHeck that before transaction is over(lend amount is paid back), isActive is true", async () => {
      expect(await lendingContract.getTransactionStatus(transactionID1)).to.equal(true);
    })



    it("Check that authorised users can pay interest and take NFT when USDC amount is \
        approved before transaction", async() =>{
      var amountToPay = await lendingContract
                              .connect(user1)
                              .getTotalAmountToPay(transactionID1);

      //First owner is lending contract
      expect(await rishToken.ownerOf(tokenId1)).to.equal(lendingContract.address);
      // Earlier 1000 USDC minted
      expect(await usdcToken.balanceOf(user1.getAddress())).to.equal(ethers.utils.parseEther("1005"));

      expect(await usdcToken.balanceOf(lendingContract.address)).to.equal(ethers.utils.parseEther("999992"));
      
      await usdcToken
            .connect(user1)
            .approve(lendingContract.address, amountToPay);
      await expect(lendingContract.connect(user1).payInterest(transactionID1, amountToPay))
              .to.emit(lendingContract, 'LoanPaidBack')
              .withArgs(await getAddress(user1), amountToPay);
      // Now the owner of NFT should be User1
      expect(await rishToken.ownerOf(tokenId1)).to.equal(await getAddress(user1))

      // AMount of USDC with user1 should be original - totalAmounttoPay(0.5 USDC)
      expect(await usdcToken.balanceOf(user1.getAddress())).to.equal(ethers.utils.parseEther("999.5"));
      
      // AMount of USDC with lending contract should be original + totalAmounttoPay
      expect(await usdcToken.balanceOf(lendingContract.address)).to.equal(ethers.utils.parseEther("999997.5"));
      
    })




    it("When time is over and the lent amount is paid then calling SellNftIfDefaulted to buy the NFT gives error", async () => {
      console.log(`Moving time...`);
      await network.provider.send("evm_increaseTime", [900000]);
      await network.provider.send("evm_mine");
      console.log(`Time moved by 900000(25 hrs)`)

      await usdcToken
            .connect(user3)
            .approve(lendingContract.address, ethers.utils.parseEther("11"));
      await expect(lendingContract.connect(user3).SellNftIfDefaulted(transactionID1, ethers.utils.parseEther("11")))
            .to.be.revertedWith("Loan is already paid. This Lend Transaction is already over");
    })




    it("CHeck that after transaction is over, isActive becomes false", async () => {
      expect(await lendingContract.getTransactionStatus(transactionID1)).to.equal(false);
    })




    it("When time is left, no one except NFT owner can call SellNftIfDefaulted to buy the NFT", async () => {
      // Setting up a new lending transaction by user 2 Lend AMount: 6 USDC  Time: 24 hrs
      await approveNftToken(rishToken, user2, lendingContract.address, tokenId2);
      transactionID2 = await lendUSDC(lendingContract, rishToken, user2, tokenId2, ethers.utils.parseEther("6"), "24");
      console.log(`Moving time...`);
      await network.provider.send("evm_increaseTime", [20000]);
      await network.provider.send("evm_mine");
      console.log(`Time moved by 20000`)
      await usdcToken
            .connect(user3)
            .approve(lendingContract.address, ethers.utils.parseEther("11"));
      await expect(lendingContract.connect(user3).SellNftIfDefaulted(transactionID2, ethers.utils.parseEther("11")))
            .to.be.revertedWith("Loan is not defaulted till now.There is still time for owner to pay the loan");
    })




    it("When time limit is over and loan is not paid back then any new user can claim the NFT", async () =>{
      
      //Lets make this transaction default. loan is for 24 hours
      console.log(`Moving time...`);
      await network.provider.send("evm_increaseTime", [90000]);
      await network.provider.send("evm_mine");
      console.log(`Time moved by 90000(25 hrs)`);
      
      //First owner is lending contract
      expect(await rishToken.ownerOf(tokenId2)).to.equal( lendingContract.address);
      // Earlier 1000 USDC minted
      expect(await usdcToken.balanceOf(user3.getAddress())).to.equal(ethers.utils.parseEther("1000"));

      expect(await usdcToken.balanceOf(lendingContract.address)).to.equal((ethers.utils.parseEther("999991.5")));

      var amountToPay = await lendingContract.getTotalAmountToPay(transactionID2);
      await usdcToken
            .connect(user3)
            .approve(lendingContract.address, amountToPay);
      await expect(lendingContract.connect(user3).SellNftIfDefaulted(transactionID2, amountToPay))
            .to.emit(lendingContract, 'DefaultedNftSold')
            .withArgs(await getAddress(user3), amountToPay);
      // Now the owner of NFT should be User3
      expect(await rishToken.ownerOf(tokenId2)).to.equal(await getAddress(user3))

      // AMount of USDC with user3 should be original - 8.88 USDC(interest)
      expect(await usdcToken.balanceOf(user3.getAddress())).to.equal(ethers.utils.parseEther("991.12"));
      
      // AMount of USDC with lending contract should be original + totalAmounttoPay
      expect(await usdcToken.balanceOf(lendingContract.address)).to.equal(ethers.utils.parseEther("1000000.38"));
    })
    



    it("User cannot lend after a  MAX_NUMBER_OF_LENDING", async () => {
      // Setting up a new lending transaction by user 5 Lend AMount: 6 USDC  Time: 24 hrs
      await approveNftToken(rishToken, user5, lendingContract.address, tokenId5_1);
      transactionID5_1 = await lendUSDC(lendingContract, rishToken, user5, tokenId5_1, ethers.utils.parseEther("2"), "24")
      
      await approveNftToken(rishToken, user5, lendingContract.address, tokenId5_2);
      transactionID5_2 = await lendUSDC(lendingContract, rishToken, user5, tokenId5_2, ethers.utils.parseEther("3"), "24")

      await approveNftToken(rishToken, user5, lendingContract.address, tokenId5_3);
     

      await expect(lendUSDC(lendingContract, rishToken, user5, tokenId5_3, ethers.utils.parseEther("5"), "24"))
            .to.be.revertedWith("Max Number of Loans for a user exhausted. Please payback earlier loans");

    })




    it("But if the user pays one borrowed amount then he can borrow again", async() =>{
      //User paying his last loan  
      var amountToPay = await lendingContract
                              .connect(user5)
                              .getTotalAmountToPay(transactionID5_2);
      
      await usdcToken
            .connect(user5)
            .approve(lendingContract.address, amountToPay);
      await lendingContract.connect(user5).payInterest(transactionID5_2, amountToPay);
      await approveNftToken(rishToken, user5, lendingContract.address, tokenId5_3);
      transactionID5_3 = await lendUSDC(lendingContract, rishToken, user5, tokenId5_3, ethers.utils.parseEther("4"), "24")
      expect(transactionID5_3).to.equal(6)
      
    })


    it("If the user pays pays more than pricipal+interest remaining amount is returned", async() =>{
      console.log(`Moving time...`);
      await network.provider.send("evm_increaseTime", [18000]);
      await network.provider.send("evm_mine");
      console.log(`Time moved by 18000(5 hrs)`);

      await usdcToken
            .connect(user5)
            .approve(lendingContract.address, ethers.utils.parseEther("100"));
      await expect(lendingContract.connect(user5).payInterest(transactionID5_3, ethers.utils.parseEther("100")))
            .to.emit(lendingContract, 'RemainingUSDCTransferred')
            .withArgs(await getAddress(user5), ethers.utils.parseEther("95.6"));
    })

  });



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

