// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is Ownable, IERC721Receiver {
    using EnumerableSet for EnumerableSet.UintSet;
    
    struct Listing {
        uint256 tokenId;
        address owner;
        uint256 price;
    }
    
    IERC721 public nftContract;
    uint256 public feePercentage;
    mapping(uint256 => Listing) public listings;
    EnumerableSet.UintSet private listedTokens;

    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId);
    event NFTSold(uint256 indexed tokenId, address buyer, uint256 price);

    constructor(address _nftContract) {
        nftContract = IERC721(_nftContract);
        feePercentage = 2; // 2% fee set as default
    }
    
    function listNFT(uint256 _tokenId, uint256 _price) external {
        require(nftContract.ownerOf(_tokenId) == msg.sender, "You do not own this token");
        require(_price > 0, "Price must be greater than zero");

        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        
        listings[_tokenId] = Listing(_tokenId, msg.sender, _price);
        listedTokens.add(_tokenId);
        
        emit NFTListed(_tokenId, _price);
    }
    
    function unlistNFT(uint256 _tokenId) external {
        require(listings[_tokenId].owner == msg.sender, "You are not the owner of this listing");
        
        nftContract.safeTransferFrom(address(this), msg.sender, _tokenId);
        
        delete listings[_tokenId];
        listedTokens.remove(_tokenId);
        
        emit NFTUnlisted(_tokenId);
    }
    
    function buyNFT(uint256 _tokenId) external payable {
        Listing memory listing = listings[_tokenId];
        require(listedTokens.contains(_tokenId), "Token is not listed for sale");
        require(msg.value >= listing.price, "Insufficient funds sent");

        address seller = listing.owner;
        uint256 feeAmount = (listing.price * feePercentage) / 100;
        uint256 saleAmount = listing.price - feeAmount;

        payable(seller).transfer(saleAmount);
        payable(owner()).transfer(feeAmount);
        
        nftContract.safeTransferFrom(address(this), msg.sender, _tokenId);
        
        delete listings[_tokenId];
        listedTokens.remove(_tokenId);

        emit NFTSold(_tokenId, msg.sender, listing.price);
    }
    
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        feePercentage = _feePercentage;
    }

    function getNFTListings() external view returns (Listing[] memory) {
        uint256 listedTokensCount = listedTokens.length();
        Listing[] memory result = new Listing[](listedTokensCount);

        for (uint256 i = 0; i < listedTokensCount; i++) {
            uint256 tokenId = listedTokens.at(i);
            result[i] = listings[tokenId];
        }

        return result;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}