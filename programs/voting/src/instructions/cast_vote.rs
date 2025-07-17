use anchor_lang::prelude::*;

use crate::{
    error::VotingError, Config, Proposal, Vote, Voter, CONFIG_SEED, MIN_STAKED_TOKENS,
    PROPOSAL_SEED, VOTER_SEED, VOTE_SEED,
};

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [PROPOSAL_SEED, proposal.id.to_le_bytes().as_ref()],
        bump = proposal.bump,
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [VOTER_SEED, authority.key().as_ref()],
        bump = voter.bump,
        has_one = authority,
    )]
    pub voter: Account<'info, Voter>,
    #[account(
        init,
        payer = authority,
        space = Vote::DISCRIMINATOR.len() + Vote::INIT_SPACE,
        seeds = [VOTE_SEED, voter.key().as_ref(), proposal.key().as_ref()],
        bump,
    )]
    pub vote: Account<'info, Vote>,
    pub system_program: Program<'info, System>,
}

impl CastVote<'_> {
    pub fn handler(ctx: Context<CastVote>, option: u8) -> Result<()> {
        let voter = &mut ctx.accounts.voter;
        let proposal = &mut ctx.accounts.proposal;

        require!(
            voter.staked_amount > MIN_STAKED_TOKENS as u64,
            VotingError::NoTokensStaked
        );

        let now = Clock::get()?.unix_timestamp;

        let weight = if voter.amount_unstaking > 0 {
            let time_remaining = voter.unstake_complete_ts - now;

            voter
                .staked_amount
                .checked_mul(time_remaining as u64)
                .unwrap()
                .checked_div(ctx.accounts.config.unstake_period as u64)
                .unwrap()
        } else {
            voter.staked_amount
        };

        ctx.accounts.vote.set_inner(Vote {
            voter: voter.key(),
            proposal: proposal.key(),
            option,
            weight,
            timestamp: now,
            bump: ctx.bumps.vote,
        });

        proposal.option_votes[option as usize] += voter.staked_amount;
        voter.points += proposal.points;

        Ok(())
    }
}
