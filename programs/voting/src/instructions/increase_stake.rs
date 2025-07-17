use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{transfer_checked, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};

use crate::{error::VotingError, Config, Voter, CONFIG_SEED, VOTER_SEED};

#[derive(Accounts)]
pub struct IncreaseStake<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = stake_mint,
    )]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [VOTER_SEED, authority.key().as_ref()],
        bump = voter.bump,
        has_one = authority,
    )]
    pub voter: Account<'info, Voter>,
    pub stake_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = stake_mint,
        associated_token::authority = authority,
        associated_token::token_program = token_program,
    )]
    pub authority_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = stake_mint,
        associated_token::authority = voter,
        associated_token::token_program = token_program,
    )]
    pub voter_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl IncreaseStake<'_> {
    pub fn handler(ctx: Context<IncreaseStake>, amount: u64) -> Result<()> {
        require!(amount > 0, VotingError::InvalidStakeAmount);

        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    authority: ctx.accounts.authority.to_account_info(),
                    from: ctx.accounts.authority_token_account.to_account_info(),
                    mint: ctx.accounts.stake_mint.to_account_info(),
                    to: ctx.accounts.voter_token_account.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.stake_mint.decimals,
        )?;

        ctx.accounts.config.total_staked += amount;
        ctx.accounts.voter.staked_amount += amount;

        Ok(())
    }
}
