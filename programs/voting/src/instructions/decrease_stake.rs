use anchor_lang::prelude::*;

use crate::{error::VotingError, Config, Voter, CONFIG_SEED, VOTER_SEED};

#[derive(Accounts)]
pub struct DecreaseStake<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [VOTER_SEED, authority.key().as_ref()],
        bump = voter.bump,
        has_one = authority,
    )]
    pub voter: Account<'info, Voter>,
}

impl DecreaseStake<'_> {
    pub fn handler(ctx: Context<DecreaseStake>, amount: u64) -> Result<()> {
        require!(amount > 0, VotingError::InvalidStakeAmount);

        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.voter.set_unstaking(
            now.checked_add(ctx.accounts.config.unstake_period).unwrap(),
            amount,
        );

        Ok(())
    }
}
