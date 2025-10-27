// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BoostProject
 * @notice Boost project contract where individual signers approve transactions
 * @dev Operator creates transactions, individual signers approve or reject them
 * 
 * Key Features:
 * - Operator can create boost transactions with different types
 * - Individual signers can approve or reject transactions
 * - Track participation for reward distribution
 * - Execute when threshold is met
 * - Support realistic token operations
 */
contract BoostProject {
    // ============================================
    // ENUMS
    // ============================================
    
    enum TransactionType {
        SIMPLE_BOOST,           // Simple counter increment
        TOKEN_MINT,             // Mint tokens
        TOKEN_BURN,             // Burn tokens
        SUPPLY_KEY_TRANSFER,    // Transfer token supply key
        TREASURY_TRANSFER,      // Large HBAR/token transfer
        TOKEN_PAUSE,            // Pause/unpause token
        FEE_SCHEDULE_UPDATE,    // Update token custom fees
        ACCOUNT_ALLOWANCE       // Approve token spending
    }
    
    enum SignerAction {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice The operator who can create boost transactions
    address public operator;
    
    /// @notice Array of authorized signer addresses
    address[] public signers;
    
    /// @notice Mapping to check if address is authorized signer
    mapping(address => bool) public isSigner;
    
    /// @notice Number of approvals required to execute
    uint256 public requiredApprovals;
    
    /// @notice Counter for executed boost transactions
    uint256 public boostCounter;
    
    /// @notice Transaction ID counter
    uint256 public nextTransactionId;
    
    /// @notice Mapping of transaction ID to transaction data
    mapping(uint256 => BoostTransaction) public transactions;
    
    /// @notice Mapping of transaction ID to signer actions
    mapping(uint256 => mapping(address => SignerAction)) public signerActions;
    
    /// @notice Mapping of transaction ID to approval count
    mapping(uint256 => uint256) public approvalCount;
    
    /// @notice Mapping of transaction ID to rejection count
    mapping(uint256 => uint256) public rejectionCount;
    
    /// @notice Track reward points per signer
    mapping(address => uint256) public signerPoints;
    
    /// @notice Track total approvals per signer
    mapping(address => uint256) public signerApprovals;
    
    /// @notice Track total rejections per signer
    mapping(address => uint256) public signerRejections;
    
    /// @notice Reward points for approving
    uint256 public approvalRewardPoints = 100;
    
    /// @notice Reward points for rejecting
    uint256 public rejectionRewardPoints = 50;
    
    // ============================================
    // STRUCTS
    // ============================================
    
    struct BoostTransaction {
        uint256 id;
        uint256 timestamp;
        address creator;
        bool executed;
        bool cancelled;
        string description;
        uint256 approvalsNeeded;
        TransactionType txType;
        address targetToken;      // Token address for token operations
        uint256 amount;           // Amount for transfers/mints/burns
        address recipient;        // Recipient for transfers
        uint256 expirationTime;   // Expiration timestamp
    }
    
    // ============================================
    // EVENTS
    // ============================================
    
    event TransactionCreated(
        uint256 indexed transactionId,
        address indexed creator,
        uint256 timestamp,
        string description,
        TransactionType txType,
        uint256 approvalsNeeded,
        address targetToken,
        uint256 amount
    );
    
    event TransactionApproved(
        uint256 indexed transactionId,
        address indexed signer,
        uint256 timestamp,
        uint256 currentApprovals,
        uint256 pointsEarned
    );
    
    event TransactionRejected(
        uint256 indexed transactionId,
        address indexed signer,
        uint256 timestamp,
        uint256 currentRejections,
        uint256 pointsEarned
    );
    
    event TransactionExecuted(
        uint256 indexed transactionId,
        uint256 timestamp,
        uint256 finalApprovals,
        address[] approvers
    );
    
    event TransactionCancelled(
        uint256 indexed transactionId,
        uint256 timestamp,
        string reason
    );
    
    event BoostIncremented(
        uint256 indexed transactionId,
        uint256 newBoostValue,
        uint256 timestamp
    );
    
    event SignerAdded(
        address indexed signer,
        uint256 timestamp
    );
    
    event RewardPointsEarned(
        address indexed signer,
        uint256 indexed transactionId,
        bool approved,
        uint256 points,
        uint256 totalPoints
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator can call this");
        _;
    }
    
    modifier onlySigner() {
        require(isSigner[msg.sender], "Only authorized signers can call this");
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Initialize the boost project
     * @param _operator The operator account (can create transactions)
     * @param _signers Array of authorized signer addresses
     * @param _requiredApprovals Number of approvals needed to execute
     */
    constructor(address _operator, address[] memory _signers, uint256 _requiredApprovals) {
        require(_operator != address(0), "Invalid operator address");
        require(_signers.length > 0, "Must have at least one signer");
        require(_requiredApprovals > 0 && _requiredApprovals <= _signers.length, "Invalid required approvals");
        
        operator = _operator;
        requiredApprovals = _requiredApprovals;
        boostCounter = 0;
        nextTransactionId = 1;
        
        // Add all signers
        for (uint256 i = 0; i < _signers.length; i++) {
            require(_signers[i] != address(0), "Invalid signer address");
            require(!isSigner[_signers[i]], "Duplicate signer");
            
            signers.push(_signers[i]);
            isSigner[_signers[i]] = true;
            
            emit SignerAdded(_signers[i], block.timestamp);
        }
    }
    
    // ============================================
    // OPERATOR FUNCTIONS
    // ============================================
    
    /**
     * @notice Create a new boost transaction (simple type)
     * @param description Description of the boost transaction
     * @return transactionId The ID of the created transaction
     */
    function createBoostTransaction(string memory description) 
        external 
        onlyOperator 
        returns (uint256) 
    {
        return _createTransaction(
            description,
            TransactionType.SIMPLE_BOOST,
            address(0),
            0,
            address(0),
            7 days
        );
    }
    
    /**
     * @notice Create a new transaction with full parameters
     * @param description Description of the transaction
     * @param txType Type of transaction
     * @param targetToken Token address (for token operations)
     * @param amount Amount (for mints/burns/transfers)
     * @param recipient Recipient address (for transfers)
     * @param expirationDuration Duration until expiration
     * @return transactionId The ID of the created transaction
     */
    function createTransaction(
        string memory description,
        TransactionType txType,
        address targetToken,
        uint256 amount,
        address recipient,
        uint256 expirationDuration
    ) 
        external 
        onlyOperator 
        returns (uint256) 
    {
        return _createTransaction(
            description,
            txType,
            targetToken,
            amount,
            recipient,
            expirationDuration
        );
    }
    
    /**
     * @notice Internal function to create a transaction
     */
    function _createTransaction(
        string memory description,
        TransactionType txType,
        address targetToken,
        uint256 amount,
        address recipient,
        uint256 expirationDuration
    ) 
        internal 
        returns (uint256) 
    {
        uint256 transactionId = nextTransactionId++;
        uint256 expirationTime = block.timestamp + expirationDuration;
        
        transactions[transactionId] = BoostTransaction({
            id: transactionId,
            timestamp: block.timestamp,
            creator: msg.sender,
            executed: false,
            cancelled: false,
            description: description,
            approvalsNeeded: requiredApprovals,
            txType: txType,
            targetToken: targetToken,
            amount: amount,
            recipient: recipient,
            expirationTime: expirationTime
        });
        
        emit TransactionCreated(
            transactionId,
            msg.sender,
            block.timestamp,
            description,
            txType,
            requiredApprovals,
            targetToken,
            amount
        );
        
        return transactionId;
    }
    
    /**
     * @notice Cancel a pending transaction
     * @param transactionId The ID of the transaction to cancel
     * @param reason Reason for cancellation
     */
    function cancelTransaction(uint256 transactionId, string memory reason) 
        external 
        onlyOperator 
    {
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        require(!transactions[transactionId].executed, "Already executed");
        require(!transactions[transactionId].cancelled, "Already cancelled");
        
        transactions[transactionId].cancelled = true;
        
        emit TransactionCancelled(transactionId, block.timestamp, reason);
    }
    
    // ============================================
    // SIGNER FUNCTIONS
    // ============================================
    
    /**
     * @notice Approve a boost transaction (called by individual signers)
     * @param transactionId The ID of the transaction to approve
     */
    function approveTransaction(uint256 transactionId) 
        external 
        onlySigner 
    {
        BoostTransaction storage txn = transactions[transactionId];
        
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        require(!txn.executed, "Transaction already executed");
        require(!txn.cancelled, "Transaction cancelled");
        require(block.timestamp < txn.expirationTime, "Transaction expired");
        require(signerActions[transactionId][msg.sender] == SignerAction.PENDING, "Already decided");
        
        // Record approval
        signerActions[transactionId][msg.sender] = SignerAction.APPROVED;
        approvalCount[transactionId]++;
        
        // Award points
        signerPoints[msg.sender] += approvalRewardPoints;
        signerApprovals[msg.sender]++;
        
        emit TransactionApproved(
            transactionId,
            msg.sender,
            block.timestamp,
            approvalCount[transactionId],
            approvalRewardPoints
        );
        
        emit RewardPointsEarned(
            msg.sender,
            transactionId,
            true,
            approvalRewardPoints,
            signerPoints[msg.sender]
        );
        
        // Auto-execute if threshold met
        if (approvalCount[transactionId] >= requiredApprovals) {
            _executeTransaction(transactionId);
        }
    }
    
    /**
     * @notice Reject a boost transaction (called by individual signers)
     * @param transactionId The ID of the transaction to reject
     */
    function rejectTransaction(uint256 transactionId) 
        external 
        onlySigner 
    {
        BoostTransaction storage txn = transactions[transactionId];
        
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        require(!txn.executed, "Transaction already executed");
        require(!txn.cancelled, "Transaction cancelled");
        require(signerActions[transactionId][msg.sender] == SignerAction.PENDING, "Already decided");
        
        // Record rejection
        signerActions[transactionId][msg.sender] = SignerAction.REJECTED;
        rejectionCount[transactionId]++;
        
        // Award points (rejections also earn rewards for participation!)
        signerPoints[msg.sender] += rejectionRewardPoints;
        signerRejections[msg.sender]++;
        
        emit TransactionRejected(
            transactionId,
            msg.sender,
            block.timestamp,
            rejectionCount[transactionId],
            rejectionRewardPoints
        );
        
        emit RewardPointsEarned(
            msg.sender,
            transactionId,
            false,
            rejectionRewardPoints,
            signerPoints[msg.sender]
        );
    }
    
    /**
     * @notice Internal function to execute transaction
     * @param transactionId The ID of the transaction to execute
     */
    function _executeTransaction(uint256 transactionId) internal {
        transactions[transactionId].executed = true;
        boostCounter++;
        
        // Get list of approvers
        address[] memory approvers = new address[](approvalCount[transactionId]);
        uint256 approverIndex = 0;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signerActions[transactionId][signers[i]] == SignerAction.APPROVED) {
                approvers[approverIndex] = signers[i];
                approverIndex++;
            }
        }
        
        emit TransactionExecuted(
            transactionId,
            block.timestamp,
            approvalCount[transactionId],
            approvers
        );
        
        emit BoostIncremented(
            transactionId,
            boostCounter,
            block.timestamp
        );
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get transaction details
     * @param transactionId The ID of the transaction
     * @return transaction The transaction data
     */
    function getTransaction(uint256 transactionId) 
        external 
        view 
        returns (BoostTransaction memory) 
    {
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        return transactions[transactionId];
    }
    
    /**
     * @notice Get signer action for a transaction
     * @param transactionId The ID of the transaction
     * @param signer The signer address
     * @return action The signer's action (PENDING, APPROVED, REJECTED, EXPIRED)
     */
    function getSignerAction(uint256 transactionId, address signer) 
        external 
        view 
        returns (SignerAction) 
    {
        return signerActions[transactionId][signer];
    }
    
    /**
     * @notice Get transaction vote counts
     * @param transactionId The ID of the transaction
     * @return approvals Number of approvals
     * @return rejections Number of rejections
     */
    function getTransactionVotes(uint256 transactionId) 
        external 
        view 
        returns (uint256 approvals, uint256 rejections) 
    {
        return (approvalCount[transactionId], rejectionCount[transactionId]);
    }
    
    /**
     * @notice Get signer statistics
     * @param signer The signer address
     * @return points Total reward points earned
     * @return approvals Total approvals
     * @return rejections Total rejections
     */
    function getSignerStats(address signer) 
        external 
        view 
        returns (uint256 points, uint256 approvals, uint256 rejections) 
    {
        return (signerPoints[signer], signerApprovals[signer], signerRejections[signer]);
    }
    
    /**
     * @notice Get all signers
     * @return signerList Array of signer addresses
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }
    
    /**
     * @notice Get the current boost counter value
     * @return The current boost counter
     */
    function getBoostCounter() external view returns (uint256) {
        return boostCounter;
    }
    
    /**
     * @notice Get total number of transactions created
     * @return The total transaction count
     */
    function getTotalTransactions() external view returns (uint256) {
        return nextTransactionId - 1;
    }
    
    /**
     * @notice Check if transaction is active (not executed, cancelled, or expired)
     * @param transactionId The ID of the transaction
     * @return active Whether the transaction is active
     */
    function isTransactionActive(uint256 transactionId) 
        external 
        view 
        returns (bool) 
    {
        if (transactionId == 0 || transactionId >= nextTransactionId) return false;
        
        BoostTransaction storage txn = transactions[transactionId];
        return !txn.executed && !txn.cancelled && block.timestamp < txn.expirationTime;
    }
    
    /**
     * @notice Get all approvers for a transaction
     * @param transactionId The ID of the transaction
     * @return approvers Array of addresses that approved
     */
    function getTransactionApprovers(uint256 transactionId) 
        external 
        view 
        returns (address[] memory) 
    {
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        
        address[] memory approvers = new address[](approvalCount[transactionId]);
        uint256 approverIndex = 0;
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (signerActions[transactionId][signers[i]] == SignerAction.APPROVED) {
                approvers[approverIndex] = signers[i];
                approverIndex++;
            }
        }
        
        return approvers;
    }
    
    /**
     * @notice Get all rejectors for a transaction
     * @param transactionId The ID of the transaction
     * @return rejectors Array of addresses that rejected
     */
    function getTransactionRejectors(uint256 transactionId) 
        external 
        view 
        returns (address[] memory) 
    {
        require(transactionId > 0 && transactionId < nextTransactionId, "Invalid transaction ID");
        
        address[] memory rejectors = new address[](rejectionCount[transactionId]);
        uint256 rejectorIndex = 0;
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (signerActions[transactionId][signers[i]] == SignerAction.REJECTED) {
                rejectors[rejectorIndex] = signers[i];
                rejectorIndex++;
            }
        }
        
        return rejectors;
    }
}

