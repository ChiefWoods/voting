use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub authority: Pubkey,
    pub staked_amount: u64,
    pub points: u64,
    pub unstake_complete_ts: i64,
    pub amount_unstaking: u64,
    pub bump: u8,
}

impl Voter {
    pub fn set_unstaking(&mut self, unstake_complete_ts: i64, amount_unstaking: u64) {
        self.unstake_complete_ts = unstake_complete_ts;
        self.amount_unstaking = amount_unstaking;
    }

    pub fn reset_unstaking(&mut self) {
        self.unstake_complete_ts = 0;
        self.amount_unstaking = 0;
    }
}
