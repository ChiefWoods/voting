use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub next_proposal_id: u16,
    pub total_staked: u64,
    pub unstake_period: i64,
    pub stake_mint: Pubkey,
    pub bump: u8,
}
