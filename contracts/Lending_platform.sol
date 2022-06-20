// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "contracts/RISHOTICS.sol";
import "contracts/USDC.sol";


contract Lending_platform is IERC721Receiver{

    using SafeMath for uint256;
    using Counters for Counters.Counter;
    // Transaction ID is unique for every lending done
    Counters.Counter private _transactionIds;

    //Interest Rate which is charged per hour
    uint8 interestRate;

    //Max Lending Transactions a user can do. This is a check to prevent any user from expoiting the service
    uint8 private _MAX_NUMBER_OF_LENDINGS;

    // MAX Hours for which users can take a loan
    uint16 public constant MAX_HOURS_FOR_LOAN = 30 * 24;

    // Owner of the contract
    address immutable owner;

    // Structure for storing a transaction
    struct lending_transactions{
        address user;
        uint256 tokenId;
        uint256 amount_lend;
        uint256 start_time;
        uint256 end_time;
        uint256 hours_to_lend;
        bool isActive;
    }


    //Transaction ID => Lending_Transaction
    mapping (uint256 => lending_transactions) internal transIdToTrans;
    
    //Address => Number Of Transaction User has done
    mapping (address => uint256) internal addToNumberOfTransactions;

    event LendingDone(address user, uint256 amount, uint256 timeLimit, uint256 transactionID);
    event LoanPaidBack(address user, uint256 totalAmountPaid);
    event RemainingUSDCTransferred(address user, uint256 remainingAmount);
    event DefaultedNftSold(address user, uint256 totalAmountPaid);

    //RISH NFT Token
    RISHOTICS public immutable rish_token;

    //Mock USDC which is ERC20's token version 
    USDC public immutable usdc;


    modifier IsTransactionIDValid(uint256 transactionId){
        require(transactionId > 0, "Transaction ID is not valid");
        _;
    }

    modifier isLoanActive(uint256 transactionId){
        require(transIdToTrans[transactionId].isActive && 
                transIdToTrans[transactionId].end_time >= block.timestamp, 
                "Loan has expired or been paid" );
        _;
    }

    modifier HasUserExhaustedMaxNumberOfLoans(address user){
        require(addToNumberOfTransactions[user] <= (_MAX_NUMBER_OF_LENDINGS-1) &&
                addToNumberOfTransactions[user] >= 0, "Max Number of Loans for a user exhausted. Please payback earlier loans");
        _;
    }

    constructor(address _rish_token, address _usdc, uint8 _interestRate, uint8 _max_lendings)
    {
        owner = msg.sender;
        rish_token = RISHOTICS(_rish_token);
        usdc = USDC(_usdc);
        interestRate = _interestRate;
        _transactionIds.increment();
        _MAX_NUMBER_OF_LENDINGS = _max_lendings;
    }

    function lendUSDC(uint256 tokenId, uint256 amount, uint256 timeToReturnInHours)
        public
        HasUserExhaustedMaxNumberOfLoans(msg.sender)
        returns (uint256)
    {
        //Validate Inputs
        require(msg.sender != address(0), "Address cannot be zero");
        require(msg.sender == rish_token.ownerOf(tokenId), "Calling address should be owner of NFT");
        require(amount < usdc.balanceOf(address(this)), "Amount should be less than MAX_SUPPLY");
        require(rish_token.getApproved(tokenId) == address(this), "Approval for NFT Token not given");
        require(timeToReturnInHours < MAX_HOURS_FOR_LOAN, "Duration for taking loan should be less than 30 days");
        
        uint256 nft_price = get_nft_price();
        uint256 max_amount_to_lend = nft_price.div(10).mul(7);
        require(max_amount_to_lend >= (amount), "Amount asked is greater than 70% value of collateral NFT");

        uint256 newTransactionId = _transactionIds.current();
        lending_transactions storage lending_transaction = transIdToTrans[newTransactionId];
        lending_transaction.user = msg.sender;
        lending_transaction.tokenId = tokenId;
        lending_transaction.amount_lend = amount;
        lending_transaction.start_time = block.timestamp;
        lending_transaction.end_time = block.timestamp + convertToHours(timeToReturnInHours);
        lending_transaction.hours_to_lend = timeToReturnInHours;
        lending_transaction.isActive = true;

        //Safetly transfer NFT token from owner to lending contract
        rish_token.safeTransferFrom(msg.sender, address(this), tokenId);
        //Safetly transfer USDC from lending contract to msg.sender
        bool success = usdc.transfer(msg.sender, amount);
        require(success, "Transfer of USDC failed");

        addToNumberOfTransactions[msg.sender] = addToNumberOfTransactions[msg.sender].add(1);
        emit LendingDone(msg.sender, amount, timeToReturnInHours, newTransactionId);
        
        _transactionIds.increment();
        return newTransactionId;
    }


    function payInterest(uint256 transactionId, uint256 amount)
        public
        IsTransactionIDValid(transactionId)
        isLoanActive(transactionId)
    {
        require(msg.sender == transIdToTrans[transactionId].user, "Only the owner of NFT can claim pay back before time is over");
        _SafeTransferUsdcAndNft(transactionId, amount);
        addToNumberOfTransactions[msg.sender] = addToNumberOfTransactions[msg.sender].sub(1);
    }


    function _SafeTransferUsdcAndNft(uint256 transactionId, uint256 amount)
        internal
        IsTransactionIDValid(transactionId)
    {
        uint256 totalAmountToPay = getTotalAmountToPay(transactionId);
        require(amount >= totalAmountToPay, "USDC amount is less than pricipal + interest");
        require(usdc.allowance(msg.sender, address(this)) >= totalAmountToPay, "USDC allowance not set");

        usdc.transferFrom(msg.sender, address(this), totalAmountToPay);
        emit LoanPaidBack(msg.sender, totalAmountToPay);

        uint256 remainingAmount = (amount).sub(totalAmountToPay);
        if (remainingAmount > 0){
            bool success = usdc.transfer(msg.sender, remainingAmount);
            require(success, "Transfer of USDC failed");
            emit RemainingUSDCTransferred(msg.sender, remainingAmount);
        }
        else{
            emit RemainingUSDCTransferred(msg.sender, 0);
        }

        rish_token.approve(msg.sender, transIdToTrans[transactionId].tokenId);
        rish_token.transferFrom(address(this), msg.sender, transIdToTrans[transactionId].tokenId);

        lending_transactions storage lending_transaction = transIdToTrans[transactionId];
        lending_transaction.isActive = false;
    }


    function SellNftIfDefaulted(uint256 transactionId, uint256 amount)
        public
        IsTransactionIDValid(transactionId)
    {
        require(transactionId > 0, "Invalid transaction ID");
        require(transIdToTrans[transactionId].end_time < block.timestamp, 
                "Loan is not defaulted till now.There is still time for owner to pay the loan");
        require(transIdToTrans[transactionId].isActive, "Loan is already paid. This Lend Transaction is already over");
        _SafeTransferUsdcAndNft(transactionId, amount);
        uint256 totalAmountToPay = getTotalAmountToPay(transactionId);
        emit DefaultedNftSold(msg.sender, totalAmountToPay);
        addToNumberOfTransactions[transIdToTrans[transactionId].user] = addToNumberOfTransactions[transIdToTrans[transactionId].user].sub(1);
    }


    function getTotalAmountToPay(uint256 transactionId)
        public
        IsTransactionIDValid(transactionId)
        view
        returns (uint256)
    {
        uint256 interestValue = getInterest(transactionId);
        uint256 totalAmountToPay = (transIdToTrans[transactionId].amount_lend).add(interestValue);
        return totalAmountToPay;
    }


    function getPricipalAmount(uint256 transactionId)
        public
        IsTransactionIDValid(transactionId)
        view
        returns (uint256)
    {
        return transIdToTrans[transactionId].amount_lend;
    }


    function getInterest(uint256 transactionId)
        public
        IsTransactionIDValid(transactionId)
        view
        returns (uint256)
    {
        uint256 timeSpent = getTimeSpent(transactionId);
        uint256 interestAmount = (transIdToTrans[transactionId].amount_lend).div(100).mul(interestRate).mul(timeSpent);
        return interestAmount;
    }


    function getTimeSpent(uint256 transactionId)
        public
        IsTransactionIDValid(transactionId)
        view
        returns (uint256)
    {
        if (block.timestamp < transIdToTrans[transactionId].end_time){
            return (block.timestamp - transIdToTrans[transactionId].start_time).div(3600);
        }
        else{
            return transIdToTrans[transactionId].hours_to_lend;
        }
        
    }

    function get_nft_price()
        public
        pure
        returns(uint256)
    {
        return 10 ether;
    }


    function onERC721Received(address, address, uint256, bytes memory) 
        public 
        virtual 
        override 
        returns (bytes4) 
    {
        return this.onERC721Received.selector;
    }

    function convertToHours(uint256 timeToReturn)
        public
        pure
        returns (uint256)
    {
        return timeToReturn.mul(3600);
    }


    function getTransactionStatus(uint256 transactionId)
        public
        IsTransactionIDValid(transactionId)
        view
        returns (bool)
    {
        return transIdToTrans[transactionId].isActive;
    }


    function changeInterestRate(uint8 _newInterestRate)
        public
    {
        require(msg.sender == owner, "Only owner can change interest rate");
        interestRate = _newInterestRate;
    }

}