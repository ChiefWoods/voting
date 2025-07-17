use anchor_lang::prelude::*;

use crate::{Voter, VOTER_SEED};

#[derive(Accounts)]
pub struct InitializeVoter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Voter::DISCRIMINATOR.len() + Voter::INIT_SPACE,
        seeds = [VOTER_SEED, authority.key().as_ref()],
        bump,
    )]
    pub voter: Account<'info, Voter>,
    pub system_program: Program<'info, System>,
}

impl InitializeVoter<'_> {
    pub fn handler(ctx: Context<InitializeVoter>) -> Result<()> {
        ctx.accounts.voter.set_inner(Voter {
            authority: ctx.accounts.authority.key(),
            staked_amount: 0,
            points: 0,
            unstake_complete_ts: 0,
            amount_unstaking: 0,
            bump: ctx.bumps.voter,
        });

        Ok(())
    }
}
