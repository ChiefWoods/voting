use anchor_lang::prelude::*;

use crate::{Config, Voter, CONFIG_SEED, VOTER_SEED};

#[derive(Accounts)]
pub struct CancelUnstake<'info> {
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

impl CancelUnstake<'_> {
    pub fn handler(ctx: Context<CancelUnstake>, amount: u64) -> Result<()> {
        let voter = &mut ctx.accounts.voter;

        let now = Clock::get()?.unix_timestamp;
        let remaining_amount = voter.amount_unstaking.checked_sub(amount).unwrap();

        if remaining_amount == 0 {
            voter.reset_unstaking();
        } else {
            // restart countdown to full unstaking period
            voter.set_unstaking(
                now.checked_add(ctx.accounts.config.unstake_period).unwrap(),
                remaining_amount,
            );
        }

        Ok(())
    }
}
