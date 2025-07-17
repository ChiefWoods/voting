pub mod constants;
pub mod error;
pub mod instructions;
pub mod macros;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("pFThvnrYKkvo6Yf5RMoE5XmkwBvksgAoBLZmWZLBnDi");

#[program]
pub mod voting {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        args: InitializeConfigArgs,
    ) -> Result<()> {
        InitializeConfig::handler(ctx, args)
    }

    pub fn create_proposal(ctx: Context<CreateProposal>, args: CreateProposalArgs) -> Result<()> {
        CreateProposal::handler(ctx, args)
    }

    pub fn initialize_voter(ctx: Context<InitializeVoter>) -> Result<()> {
        InitializeVoter::handler(ctx)
    }

    pub fn increase_stake(ctx: Context<IncreaseStake>, amount: u64) -> Result<()> {
        IncreaseStake::handler(ctx, amount)
    }

    pub fn decrease_stake(ctx: Context<DecreaseStake>, amount: u64) -> Result<()> {
        DecreaseStake::handler(ctx, amount)
    }

    pub fn withdraw_stake(ctx: Context<WithdrawStake>) -> Result<()> {
        WithdrawStake::handler(ctx)
    }

    pub fn cancel_unstake(ctx: Context<CancelUnstake>, amount: u64) -> Result<()> {
        CancelUnstake::handler(ctx, amount)
    }

    pub fn cast_vote(ctx: Context<CastVote>, option: u8) -> Result<()> {
        CastVote::handler(ctx, option)
    }
}
