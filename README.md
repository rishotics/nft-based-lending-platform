# NFT Based lending platform

This project describes a simple lending system. The user can stake his NFT Token and claim 70% of its value in USDC. After the loan gets defaulted NFT becomes open to all the users to buy.

## Smart Contracts Description:

I have described every lending transaction as a struct `lending_transactions` which stores all the info about a transaction: user address, token ID, amount asked for borrowing, start time, time period of borrowing, end time, and is the lending transaction active. Users can  send in the NFTs and the USDC amount asked is transffered back to their accounts(given it is below 70%). Every transaction has an unique ID and it is used to uniquely identify it.

I am keeping a count of lending_transactions done by an address as we are keeping a max cap for them. This check will prevent the user to many unlimited transactions. It is kind of credit score check which prevent users for making fradulent transactions. I have also kept a cap for MAX_NUMBER_OF_HOURS for which user can take a loan. It is initially kept for 30 days(720 hrs).

Contracts deployed in Fuji C chain:
- USDC Token : 0x02805FD17224138e22217507935A64158B0e3faA
- NFT Token : 0x895bF2213FE056D1Cc2d23869B742453B9e83047
- Lending Contract : 0x2204129Af3d50A2a9b271b62D0d357Bf933f9910

There are 3 smart contracts:
### 1. Lending_platform.sol
The `lendUSDC` and `payInterest` are the functions for borrowing USDC and paying Interest back. Both these functions have multiple security checks and can only be called by NFT owners. `SellNftIfDefaulted` is used to liquidate a transaction and lets any user to claim the ownership of NFT by paying principal amoount + interest for the particular time (this is the time period for which was taken). Interest rate is defined as an hourly rate for simplicity and can be extrapolated to monthly or daily basis accordinly in future.

There are various read-only functions also which are marked as view and act as helper fucntions.

### 2. RISHOTICS.sol:

This is the NFT contract and its build using OpenZeppelins ERC721URIStorage which is an extension of ERC721. 

### 3. USDC.sol:

Mock USDC which is build using ERC20 token.


## Setting up a local EVM Subnet

To create a local subnet I have followed the following steps:-


```
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s

cd bin 

export PATH=$PWD:$PATH

avalanche subnet create rishotics4

avalanche subnet deploy rishotics4
```

After deploying the subnet the details we get are as follows:- 


```Network ready to use. Local network node endpoints:
Endpoint at node node5 for blockchain "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z" with VM ID "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z": http://127.0.0.1:53640/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc
Endpoint at node node1 for blockchain "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z" with VM ID "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z": http://127.0.0.1:22287/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc
Endpoint at node node2 for blockchain "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z" with VM ID "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z": http://127.0.0.1:48503/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc
Endpoint at node node3 for blockchain "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z" with VM ID "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z": http://127.0.0.1:65190/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc
Endpoint at node node4 for blockchain "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z" with VM ID "8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z": http://127.0.0.1:45692/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc

Metamask connection details (any node URL from above works):
RPC URL:          http://127.0.0.1:53640/ext/bc/8m7MWqHSnTnCSTUpBNQaJeG4PhGgW5QLRA8pi3hzEvxv41h1Z/rpc
Funded address:   0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC with 1000000 (10^18) - private key: 56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027
Network name:     rishotics4
Chain ID:         2108
Currency Symbol:  RISH
```



## Deploy Contracts

I have included a deployment script which also contains code for understanding the general flow of Lending Platform.


- Testnet: To deploy in Fuji C Test-Net please create a `.env.local` file with `ACCOUNT_PRIVATE_KEY=...`. 
    ```
    yarn hardhat run scripts/run.ts --network fuji
    ``` 

- For local

    ```
    yarn hardhat run scripts/run.ts
    ```

I have deployed the contracts on REMIX IDE as well to test the working. I used the details of above EVM subnet: rishotics4 to deploy the contracts and testing. I have also tested them with Fuji Testnet.


## Test Cases

I have kept the test cases pretty exhaustive and tried to cover all the edge cases. They are in the file test/lending_contract-test.ts

## Installation
I have used hardhat for development & Mocha, Chai for testing the contracts
`Please use node version 14 for running everything` You can install it or switch to it if you already have it using :

    ```
    nvm use 14

    ```

-   Install all dependencies:

    ```
    yarn 
    ```

- Run the tests:

    ```
    yarn hardhat test
    ``` 




## Assumptions taken:

- Currently we having a constant price for all NFTs. We can use a price feed from an oracle to bring in the live feed.

