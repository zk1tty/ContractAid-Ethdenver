# ContractAid-EthDenver

- [Introduction](#introduction)
- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Requirements](#requirements)
- [Setup](#setup)
- [More Information](#more-information)

  
## Introduction

ContractAid-EthDenver is a Proof of Concept (PoC) project created for EthDenver. The repository contains the code for contractAid.io Solidity Checker, which is designed to detect missing critical operational/transactional defects in your Solidity code according to the criteria of Solidity Checklist.

## Problem Statement

Recently, approximately 80% of smart contracts are deployed without external audit. This is often due to the time and cost involved in asking audit agencies or setting up bug bounty programs.

## Solution

ContractAid offers a quick 5-minute checker with clear and visual explanations. You don't need to be a security expert to deploy your decentralized applications (dApps) confidently. With ContractAid, you can deploy your application with confidence.

## Requirements

- Node.js 20 or higher
- A GitHub App subscribed to Pull Request events and with the following permissions:
  - Pull requests: Read & write
  - Metadata: Read-only
- (For local development) A tunnel to expose your local server to the internet (e.g., smee, ngrok, or cloudflared)

## Setup

1. Clone this repository.
2. Create a `.env` file similar to `.env.example` and set actual values. If you are using GitHub Enterprise Server, also include an `ENTERPRISE_HOSTNAME` variable and set the value to the name of your GitHub Enterprise Server instance.
3. Install dependencies with `npm install`.
4. Start the server with `npm run server`.
5. Ensure your server is reachable from the internet.
6. If you're using smee, run `smee -u <smee_url> -t http://localhost:3000/api/webhook`.
7. Ensure your GitHub App includes at least one repository on its installations.

For more information about ContractAid and EthDenver 2024, visit:
- [EthDenver 2024 Dashboard](https://devfolio.co/ethdenver2024/dashboard)
- [ContractAid Website](https://contractaid.io/)
