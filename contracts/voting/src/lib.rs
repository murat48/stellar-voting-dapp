#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Env, String, Vec, Map, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub vote_count: u32,
}

#[contracttype]
pub enum DataKey {
    Proposals,
    VoterRecord(String), // wallet address → voted proposal id
    ProposalCount,
}

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
    /// Initialize with default proposals
    pub fn initialize(env: Env) {
        let proposals: Vec<Proposal> = Vec::from_array(
            &env,
            [
                Proposal {
                    id: 0,
                    title: String::from_str(&env, "Proposal Alpha"),
                    vote_count: 0,
                },
                Proposal {
                    id: 1,
                    title: String::from_str(&env, "Proposal Beta"),
                    vote_count: 0,
                },
                Proposal {
                    id: 2,
                    title: String::from_str(&env, "Proposal Gamma"),
                    vote_count: 0,
                },
            ],
        );
        env.storage().persistent().set(&DataKey::Proposals, &proposals);
        env.storage().persistent().set(&DataKey::ProposalCount, &3u32);
    }

    /// Cast a vote for a proposal
    pub fn vote(env: Env, voter: String, proposal_id: u32) -> Result<(), Symbol> {
        // Check already voted
        if env.storage().persistent().has(&DataKey::VoterRecord(voter.clone())) {
            return Err(Symbol::new(&env, "AlreadyVoted"));
        }

        let mut proposals: Vec<Proposal> = env
            .storage()
            .persistent()
            .get(&DataKey::Proposals)
            .unwrap();

        let count = proposals.len();
        if proposal_id >= count {
            return Err(Symbol::new(&env, "InvalidProposal"));
        }

        // Update vote count
        let mut proposal = proposals.get(proposal_id).unwrap();
        proposal.vote_count += 1;
        proposals.set(proposal_id, proposal);

        env.storage().persistent().set(&DataKey::Proposals, &proposals);
        env.storage().persistent().set(&DataKey::VoterRecord(voter), &proposal_id);

        Ok(())
    }

    /// Get all proposals
    pub fn get_proposals(env: Env) -> Vec<Proposal> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposals)
            .unwrap_or(Vec::new(&env))
    }

    /// Check if wallet already voted
    pub fn has_voted(env: Env, voter: String) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::VoterRecord(voter))
    }

    /// Get which proposal a voter voted for
    pub fn get_vote(env: Env, voter: String) -> Option<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::VoterRecord(voter))
    }
}