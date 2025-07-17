use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{Config, CONFIG_SEED};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeConfigArgs {
    pub unstake_period: i64,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Config::DISCRIMINATOR.len() + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    pub stake_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

impl InitializeConfig<'_> {
    pub fn handler(ctx: Context<InitializeConfig>, args: InitializeConfigArgs) -> Result<()> {
        ctx.accounts.config.set_inner(Config {
            authority: ctx.accounts.authority.key(),
            next_proposal_id: 1,
            total_staked: 0,
            unstake_period: args.unstake_period,
            stake_mint: ctx.accounts.stake_mint.key(),
            bump: ctx.bumps.config,
        });

        Ok(())
    }
}
