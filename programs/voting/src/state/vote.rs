use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vote {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub option: u8,
    pub weight: u64,
    pub timestamp: i64,
    pub bump: u8,
}
