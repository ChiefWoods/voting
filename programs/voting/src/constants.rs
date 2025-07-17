use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
pub const PROPOSAL_SEED: &[u8] = b"proposal";
pub const VOTE_SEED: &[u8] = b"vote";
pub const VOTER_SEED: &[u8] = b"voter";
pub const MIN_STAKED_TOKENS: u32 = 5_000_000;
