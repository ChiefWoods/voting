use anchor_lang::prelude::*;

use crate::{error::VotingError, Config, Proposal, CONFIG_SEED, PROPOSAL_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProposalArgs {
    pub quorum_votes: u64,
    pub ending_ts: i64,
    pub points: u64,
    pub title: String,
    pub description: String,
    pub options: Vec<String>,
}

#[derive(Accounts)]
#[instruction(args: CreateProposalArgs)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = authority @ VotingError::InvalidAuthority,
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        space = Proposal::DISCRIMINATOR.len() + Proposal::space(args.title, args.description, args.options),
        seeds = [PROPOSAL_SEED, config.next_proposal_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}

impl CreateProposal<'_> {
    pub fn handler(ctx: Context<CreateProposal>, args: CreateProposalArgs) -> Result<()> {
        let CreateProposalArgs {
            quorum_votes,
            ending_ts,
            points,
            title,
            description,
            options,
        } = args;

        require!(title.len() >= 3, VotingError::TitleTooShort);

        let options_len = options.len() as usize;

        require!(options_len >= 2, VotingError::NotEnoughOptions);

        let config = &mut ctx.accounts.config;

        ctx.accounts.proposal.set_inner(Proposal {
            id: config.next_proposal_id,
            total_votes: 0,
            quorum_votes,
            created_ts: Clock::get()?.unix_timestamp,
            ending_ts,
            points,
            title,
            description,
            options,
            option_votes: vec![0; options_len],
            bump: ctx.bumps.proposal,
        });

        config.next_proposal_id += 1;

        Ok(())
    }
}
