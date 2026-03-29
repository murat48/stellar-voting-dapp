#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol,
};

/// The three vote options.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Approve,
    Reject,
    Abstain,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub approve_count: u32,
    pub reject_count: u32,
    pub abstain_count: u32,
    pub creator: Address,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Proposal(u32),
    ProposalCount,
    /// Stores the u32 choice the voter cast (0/1/2) to block duplicates.
    VoteCast(Address, u32),
    Admin,
}

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
    /// Initialize the contract with an admin address. Can only be called once.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &0u32);
    }

    /// Create a new proposal.
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
    ) -> u32 {
        creator.require_auth();

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let new_id = count + 1;

        let proposal = Proposal {
            id: new_id,
            title,
            description,
            approve_count: 0,
            reject_count: 0,
            abstain_count: 0,
            creator: creator.clone(),
            active: true,
        };

        env.storage()
            .instance()
            .set(&DataKey::Proposal(new_id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &new_id);

        new_id
    }

    /// Cast a vote. choice: 0 = Onaylıyorum, 1 = Onaylamıyorum, 2 = Kararsızım.
    pub fn vote(env: Env, voter: Address, proposal_id: u32, choice: u32) {
        voter.require_auth();

        let vote_key = DataKey::VoteCast(voter.clone(), proposal_id);
        if env.storage().instance().has(&vote_key) {
            panic!("already voted");
        }

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        if !proposal.active {
            panic!("proposal is not active");
        }

        match choice {
            0 => proposal.approve_count += 1,
            1 => proposal.reject_count += 1,
            2 => proposal.abstain_count += 1,
            _ => panic!("invalid choice: 0=approve 1=reject 2=abstain"),
        }

        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().instance().set(&vote_key, &choice);
    }

    /// Deactivate a proposal (admin only).
    pub fn close_proposal(env: Env, admin: Address, proposal_id: u32) {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN)
            .expect("contract not initialized");
        if admin != stored_admin {
            panic!("unauthorized");
        }

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        proposal.active = false;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
    }

    /// Get a proposal by ID.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found")
    }

    /// Get the total number of proposals.
    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    /// Returns the voter's past choice (0/1/2) or 255 if not voted.
    pub fn get_vote(env: Env, voter: Address, proposal_id: u32) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::VoteCast(voter, proposal_id))
            .unwrap_or(255u32)
    }
}
