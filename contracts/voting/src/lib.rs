#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub vote_count: u32,
    pub creator: Address,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Proposal(u32),
    ProposalCount,
    HasVoted(Address, u32),
    Admin,
}

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &0u32);
    }

    /// Create a new proposal. Only the admin can create proposals.
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
            vote_count: 0,
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

    /// Cast a vote for a proposal. Each address can vote once per proposal.
    pub fn vote(env: Env, voter: Address, proposal_id: u32) {
        voter.require_auth();

        let voted_key = DataKey::HasVoted(voter.clone(), proposal_id);
        if env.storage().instance().has(&voted_key) {
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

        proposal.vote_count += 1;
        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().instance().set(&voted_key, &true);
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

    /// Check whether an address has voted on a given proposal.
    pub fn has_voted(env: Env, voter: Address, proposal_id: u32) -> bool {
        env.storage()
            .instance()
            .has(&DataKey::HasVoted(voter, proposal_id))
    }
}
